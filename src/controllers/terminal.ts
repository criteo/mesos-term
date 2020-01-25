import Express = require('express');
import NodePty = require('node-pty');
import * as Ws from 'ws';
import Path = require('path');
import Bluebird = require('bluebird');
import * as Jwt from 'jsonwebtoken';

import { env } from '../env_vars';
import { getLogger } from '../express_helpers';
import { getTaskInfo, Task, TaskNotFoundError } from '../mesos';
import Authorizations = require('../authorizations');
import { Request } from '../express_helpers';

const BEARER_KEY = 'token';

const taskByPid: { [pid: string]: Task } = {};
const terminalsByPid: { [pid: number]: NodePty.IPty } = {};
const logsByPid: { [pid: number]: string } = {};

declare global {
  namespace Express {
    interface Request {
      term?: {
        task: Task;
        terminal: NodePty.IPty;
        logs: string;
      };
    }
  }
}

async function VerifyBearer(req: Request) {
  if (!(BEARER_KEY in req.query)) {
    throw new Error('Unauthorized due to missing bearer.');
  }

  const decoded = Jwt.verify(req.query[BEARER_KEY], env.JWT_SECRET) as any;
  const pid = decoded.pid;

  if (!pid) {
    throw new Error('No terminal PID in bearer');
  }

  if (!(pid in taskByPid)) {
    throw new Error(`No PID ${pid} in tasks repository.`);
  }

  if (!(pid in terminalsByPid)) {
    throw new Error(`No PID ${pid} in terminals repository.`);
  }

  if (!(pid in logsByPid)) {
    throw new Error(`No PID ${pid} in logs repository.`);
  }

  req.term = {
    task: taskByPid[decoded.pid],
    terminal: terminalsByPid[decoded.pid],
    logs: logsByPid[decoded.pid]
  };
}

async function TerminalBearer(
  req: Request,
  res: Express.Response,
  next: Express.NextFunction) {

  try {
    await VerifyBearer(req);
    await next();
  }
  catch (err) {
    console.error(`Error with URL ${req.originalUrl}: ${err}`);
    res.status(403);
    res.send(err);
  }
}

export async function WsTerminalBearer(
  ws: Ws,
  req: Request,
  next: Express.NextFunction) {

  try {
    await VerifyBearer(req);
    await next();
  }
  catch (err) {
    console.error(err);
  }
}

function spawnTerminal(
  req: Request,
  res: Express.Response,
  task: Task) {

  const params = [
    Path.resolve(__dirname, '..', 'python/terminal.py'),
    task.agent_url,
    task.container_id,
    '--cmd',
    env.COMMAND
  ];

  if (task.user) {
    params.push('--user');
    params.push(task.user);
  }

  if (task.parent_container_id) {
    params.push('--parent');
    params.push(task.parent_container_id);
  }

  if (env.MESOS_AGENT_CREDENTIALS) {
    params.push('--http_principal');
    params.push(env.MESOS_AGENT_CREDENTIALS.principal);
    params.push('--http_password');
    params.push(env.MESOS_AGENT_CREDENTIALS.password);
  }

  if (env.EXTRA_ENV) {
    params.push('--env');
    params.push(env.EXTRA_ENV);
  }

  const options: NodePty.IPtyForkOptions = {
    name: 'bash'
  };

  const term = NodePty.spawn(
    'python3',
    params,
    options);

  const taskId = req.params.task_id;
  getLogger(req).openContainer(req, taskId, term.pid);

  terminalsByPid[term.pid] = term;
  logsByPid[term.pid] = '';
  taskByPid[term.pid] = task;

  term.on('data', function (data) {
    logsByPid[term.pid] += data;
  });

  return Bluebird.resolve(term.pid);
}

async function checkAuthorizations(
  req: Request,
  task: Task,
  accessToken: string) {

  const userCN = req.user.cn;
  const userLdapGroups = req.user.memberOf;
  const admins_constraints = Authorizations.FilterTaskAdmins(
    env.ENABLE_PER_APP_ADMINS,
    env.ALLOWED_TASK_ADMINS,
    task.admins);
  const superAdmins = env.SUPER_ADMINS;

  // First check delegation token granted by an admin
  if (accessToken && env.ENABLE_RIGHTS_DELEGATION) {
    try {
      await Authorizations.CheckDelegation(
        userCN,
        userLdapGroups,
        task.task_id,
        accessToken,
        env.JWT_SECRET
      );
      // If delegation token is validated, we skip the next checks.
      return;
    }
    catch (err) {
      // if delegation is not validated though, let's move forward with next checks
    }
  }

  await Promise.all([
    Authorizations.CheckUserAuthorizations(
      userCN,
      userLdapGroups,
      admins_constraints,
      superAdmins
    ),
    Authorizations.CheckRootContainer(
      task.user,
      userCN,
      userLdapGroups,
      superAdmins
    )
  ]);
}

async function tryRequestTerminal(
  req: Request,
  res: Express.Response,
  task: Task) {

  if (env.AUTHORIZATIONS_ENABLED) {
    await checkAuthorizations(req, task, req.query.access_token);
  }
  const pid = await spawnTerminal(req, res, task);
  return Jwt.sign({ pid }, env.JWT_SECRET, { expiresIn: 60 * 60 });
}

async function createTerminal(
  req: Request,
  res: Express.Response) {

  const taskId = req.params.task_id;
  if (!taskId) {
    res.send('No task ID provided.');
    return;
  }

  try {
    const task = await getTaskInfo(env.MESOS_MASTER_URL, taskId);
    const token = await tryRequestTerminal(req, res, task);

    res.send({
      token: token,
      task: task,
      master_url: env.MESOS_MASTER_URL
    });
  }
  catch (err) {
    console.error(err);
    if (err instanceof Authorizations.UnauthorizedAccessError) {
      res.status(403);
      res.send();
      return;
    }
    else if (err instanceof TaskNotFoundError) {
      res.status(404);
      res.send();
      return;
    }
    res.status(503);
    res.send();
  }
}

export function resizeTerminal(req: Request, res: Express.Response) {
  const term = req.term.terminal;
  const cols = parseInt(req.query.cols);
  const rows = parseInt(req.query.rows);

  term.resize(cols, rows);
  res.end();
}

export function connectTerminal(ws: Ws, req: Request) {
  const term = req.term.terminal;
  const logs = req.term.logs;

  term.on('exit', function () {
    getLogger(req).connectionClosed(req, term.pid);
    ws.close();
  });

  ws.onopen = () => {
    getLogger(req).open(req, term.pid);
  };

  ws.onmessage = (event: { data: Ws.Data }) => {
    term.write(event.data.toString());
  };

  ws.onclose = (event: { code: number, reason: string }) => {
    term.kill();
    getLogger(req).disconnect(req, term.pid);

    // Clean things up
    delete taskByPid[term.pid];
    delete terminalsByPid[term.pid];
    delete logsByPid[term.pid];
  };

  getLogger(req).connect(req, term.pid);
  ws.send(logs);

  term.on('data', function (data) {
    try {
      ws.send(data);
    }
    catch (ex) {
      console.error('Cannot send data to websocket for terminal %s.', term.pid);
      // The WebSocket is not open, ignore
    }
  });
}

export default function (
  app: Express.Application) {

  app.post('/api/terminals/create/:task_id', createTerminal);
  app.post('/api/terminals/resize', TerminalBearer, resizeTerminal);
  (app as any).ws('/api/terminals/ws', WsTerminalBearer, connectTerminal);
}
