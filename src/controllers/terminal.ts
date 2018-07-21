import Express = require('express');
import NodePty = require('node-pty');
import * as Ws from 'ws';
import Path = require('path');
import Bluebird = require('bluebird');
import Jwt = require('jsonwebtoken');

import { env } from '../env_vars';
import { getLogger } from '../express_helpers';
import { getTaskInfo, Task } from '../mesos';
import Authorizations = require('../authorizations');

const JwtAsync: any = Bluebird.promisifyAll(Jwt);

const BEARER_KEY = 'token';

const taskByPid: {[pid: string]: Task} = {};
const terminalsByPid: {[pid: number]: NodePty.IPty} = {};
const logsByPid: {[pid: number]: string} = {};

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

function VerifyBearer(req: Express.Request) {
  if (!(BEARER_KEY in req.query)) {
    return Bluebird.reject(new Error('Unauthorized due to missing bearer.'));
  }

  const token = req.query[BEARER_KEY];
  return JwtAsync.verifyAsync(token, env.JWT_SECRET)
    .then(function(decoded: any) {
      const pid = decoded.pid;

      if (!pid) {
        return Bluebird.reject(new Error('No terminal PID in bearer'));
      }

      if (!(pid in taskByPid)) {
        return Bluebird.reject(new Error(`No PID ${pid} in tasks repository.`));
      }

      if (!(pid in terminalsByPid)) {
        return Bluebird.reject(new Error(`No PID ${pid} in terminals repository.`));
      }

      if (!(pid in logsByPid)) {
        return Bluebird.reject(new Error(`No PID ${pid} in logs repository.`));
      }

      req.term = {
        task: taskByPid[decoded.pid],
        terminal: terminalsByPid[decoded.pid],
        logs: logsByPid[decoded.pid]
      };
    });
}

function TerminalBearer(
  req: Express.Request,
  res: Express.Response,
  next: Express.NextFunction) {

  VerifyBearer(req)
    .then(next)
    .catch(function(err: Error) {
      console.error(`Error with URL ${req.originalUrl}: ${err}`);
      res.status(403);
      res.send(err);
    });
}

export function WsTerminalBearer(
  ws: Ws,
  req: Express.Request,
  next: Express.NextFunction) {

  VerifyBearer(req)
    .then(next)
    .catch((err: Error) => console.log(err));
}

function spawnTerminal(
  req: Express.Request,
  res: Express.Response,
  task: Task) {

  const params = [
    Path.resolve(__dirname, '..', 'python/terminal.py'),
    task.agent_url,
    task.container_id,
  ];

  if (task.user) {
    params.push('--user');
    params.push(task.user);
  }

  const options: NodePty.IPtyForkOptions = {
    name: 'bash'
  };

  const term = NodePty.spawn(
    'python3',
    params,
    options);

  const taskId = req.params.task_id;
  getLogger(req).open(req, taskId, term.pid);

  terminalsByPid[term.pid] = term;
  logsByPid[term.pid] = '';
  taskByPid[term.pid] = task;

  term.on('data', function(data) {
    logsByPid[term.pid] += data;
  });

  return Bluebird.resolve(term.pid);
}

function checkAuthorizations(
  req: Express.Request,
  task: Task,
  accessToken: string) {

  const userCN = req.user.cn;
  const userLdapGroups = req.user.memberOf;
  const admins = env.ENABLE_PER_APP_ADMINS ? task.admins : [];
  const superAdmins = env.SUPER_ADMINS;

  const authorizationsPromise =
    Bluebird.all([
      Authorizations.CheckUserAuthorizations(
        userCN,
        userLdapGroups,
        admins,
        superAdmins
      ),
      Authorizations.CheckRootContainer(
        task.user,
        userCN,
        userLdapGroups,
        superAdmins
      )
    ]);


  const promises = [authorizationsPromise];
  if (env.ENABLE_RIGHTS_DELEGATION && accessToken) {
    const delegationPromise =
      Authorizations.CheckDelegation(
        userCN,
        userLdapGroups,
        task.task_id,
        accessToken
      );
    promises.push(delegationPromise);
  }

  return Bluebird.any(promises)
    .catch(Bluebird.AggregateError, function(errors: Bluebird.AggregateError) {
      const reasons: string[] = [];
      for (let i = 0; i < errors.length; ++i) {
        reasons.push('"' + errors[i].message + '"');
      }
      return Bluebird.reject(new Error('Reasons: [' + reasons.join(', ') + ']'));
    });
}

function tryRequestTerminal(
  req: Express.Request,
  res: Express.Response,
  task: Task) {

  const accessToken = req.query.access_token;

  const spawnPromise = (env.AUTHORIZATIONS_ENABLED)
    ? checkAuthorizations(req, task, accessToken)
        .then(() => spawnTerminal(req, res, task))
    : spawnTerminal(req, res, task);

  return spawnPromise.then(function(pid: number) {
    const payload = { pid: pid };
    const options = { expiresIn: 10 * 60 };
    return JwtAsync.signAsync(payload, env.JWT_SECRET, options);
  });
}

function createTerminal(
  req: Express.Request,
  res: Express.Response) {

  const taskId = req.params.task_id;
  if (!taskId) {
    res.send('No task ID provided.');
    return;
  }

  getTaskInfo(env.MESOS_MASTER_URL, taskId)
    .then(function(task: Task) {
      return Bluebird.join(
        tryRequestTerminal(req, res, task),
        Bluebird.resolve(task)
      );
    })
    .spread(function(token: string, task: Task) {
      res.send({
        token: token,
        task: task,
        master_url: env.MESOS_MASTER_URL
      });
    })
    .catch(function(err: Error) {
      res.status(503);
      res.send(err.message);
    });

}

export function resizeTerminal(req: Express.Request, res: Express.Response) {
  const term = req.term.terminal;
  const cols = parseInt(req.query.cols);
  const rows = parseInt(req.query.rows);

  term.resize(cols, rows);
  res.end();
}

export function connectTerminal(ws: Ws, req: Express.Request) {
  const term = req.term.terminal;
  const logs = req.term.logs;

  getLogger(req).connect(req, term.pid);
  ws.send(logs);

  term.on('data', function(data) {
    try {
      ws.send(data);
    }
    catch (ex) {
      console.error('Cannot send data to websocket for terminal %s.', term.pid);
      // The WebSocket is not open, ignore
    }
  });

  term.on('exit', function() {
    getLogger(req).connectionClosed(req, term.pid);
    ws.close();
  });

  ws.on('message', function(msg: string) {
    term.write(msg);
  });

  ws.on('close', function () {
    term.kill();
    getLogger(req).disconnect(req, term.pid);

    // Clean things up
    delete taskByPid[term.pid];
    delete terminalsByPid[term.pid];
    delete logsByPid[term.pid];
  });
}

export default function(
  app: Express.Application,
  authorizationsEnabled: boolean) {

  app.post('/terminals/create/:task_id', createTerminal);
  app.post('/terminals/resize', TerminalBearer, resizeTerminal);
  (app as any).ws('/terminals/ws', WsTerminalBearer, connectTerminal);
}
