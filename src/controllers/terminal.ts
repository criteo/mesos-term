import Express = require("express");
import NodePty = require("node-pty");
import * as Ws from "ws";
import Path = require("path");
import Bluebird = require("bluebird");
import * as Jwt from "jsonwebtoken";

import { env } from "../env_vars";
import { getLogger } from "../express_helpers";
import {
  TaskNotFoundError,
  getRunningTaskInfo,
  TaskInfo,
  TaskNotRunningError,
  MesosAgentNotFoundError,
} from "../mesos";
import Authorizations = require("../authorizations");
import { Request } from "../express_helpers";

const BEARER_KEY = "token";

const taskByPid: { [pid: string]: TaskInfo } = {};
const terminalsByPid: { [pid: number]: NodePty.IPty } = {};
const logsByPid: { [pid: number]: string } = {};

declare global {
  namespace Express {
    interface Request {
      term?: {
        task: TaskInfo;
        terminal: NodePty.IPty;
        logs: string;
      };
    }
  }
}

async function VerifyBearer(req: Request) {
  if (!(BEARER_KEY in req.query)) {
    throw new Error("Unauthorized due to missing bearer.");
  }

  const decoded = Jwt.verify(req.query[BEARER_KEY], env.JWT_SECRET) as any;
  const pid = decoded.pid;

  if (!pid) {
    throw new Error("No terminal PID in bearer");
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
    logs: logsByPid[decoded.pid],
  };
}

async function TerminalBearer(
  req: Request,
  res: Express.Response,
  next: Express.NextFunction
) {
  try {
    await VerifyBearer(req);
    await next();
  } catch (err) {
    console.error("Cannot verify bearer for http connections", err);
    res.status(403);
    res.send("Cannot verify bearer for http connections");
  }
}

export async function WsTerminalBearer(
  ws: Ws,
  req: Request,
  next: Express.NextFunction
) {
  try {
    await VerifyBearer(req);
    await next();
  } catch (err) {
    console.error("Cannot verify bearer for ws connections", err);
  }
}

function spawnTerminal(req: Request, task: TaskInfo) {
  const params = [
    Path.resolve(__dirname, "..", "python/terminal.py"),
    task.agent_url,
    task.container_id,
    "--cmd",
    env.COMMAND,
  ];

  if (task.user) {
    params.push("--user");
    params.push(task.user);
  }

  if (task.parent_container_id) {
    params.push("--parent");
    params.push(task.parent_container_id);
  }

  if (env.MESOS_AGENT_CREDENTIALS) {
    params.push("--http_principal");
    params.push(env.MESOS_AGENT_CREDENTIALS.principal);
    params.push("--http_password");
    params.push(env.MESOS_AGENT_CREDENTIALS.password);
  }

  if (env.EXTRA_ENV) {
    params.push("--env");
    params.push(env.EXTRA_ENV);
  }

  const options: NodePty.IPtyForkOptions = {
    name: "bash",
  };

  const term = NodePty.spawn("python3", params, options);

  const taskId = req.params.task_id;
  getLogger(req).openContainer(req, taskId, term.pid);

  terminalsByPid[term.pid] = term;
  logsByPid[term.pid] = "";
  taskByPid[term.pid] = task;

  term.on("data", function (data) {
    logsByPid[term.pid] += data;
  });

  return Bluebird.resolve(term.pid);
}

async function tryRequestTerminal(
  req: Request,
  res: Express.Response,
  task: TaskInfo
) {
  if (env.AUTHORIZATIONS_ENABLED) {
    await Authorizations.CheckTaskAuthorization(
      req,
      task,
      req.query.access_token
    );
  }
  const pid = await spawnTerminal(req, task);
  return Jwt.sign({ pid }, env.JWT_SECRET, { expiresIn: 60 * 60 });
}

async function createTerminal(req: Request, res: Express.Response) {
  const taskId = req.params.task_id;
  if (!taskId) {
    res.status(400);
    res.send("No task ID provided.");
    return;
  }

  try {
    const task = await getRunningTaskInfo(taskId);
    const token = await tryRequestTerminal(req, res, task);

    res.send({
      token: token,
      task: task,
      master_url: env.MESOS_MASTER_URL,
    });
  } catch (err) {
    console.error(`Cannot create terminal for task ${taskId}`, err);
    if (err instanceof Authorizations.UnauthorizedAccessError) {
      res.status(403);
      res.send();
      return;
    } else if (err instanceof TaskNotFoundError) {
      res.status(404);
      res.send();
      return;
    } else if (err instanceof TaskNotRunningError) {
      res.status(400);
      res.send("Task not running");
      return;
    } else if (err instanceof MesosAgentNotFoundError) {
      res.status(400);
      res.send("Mesos agent not found");
      return;
    }
    // returning 400 allow to display response body to the user
    // if using 503 we simply return "503 != 200" message
    res.status(400);
    res.send(err.message);
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

  term.on("exit", function () {
    getLogger(req).connectionClosed(req, term.pid);
    ws.close();
  });

  ws.onopen = () => {
    getLogger(req).open(req, term.pid);
  };

  ws.onmessage = (event: { data: Ws.Data }) => {
    term.write(event.data.toString());
  };

  ws.onclose = (event: { code: number; reason: string }) => {
    term.kill();
    getLogger(req).disconnect(req, term.pid);

    // Clean things up
    delete taskByPid[term.pid];
    delete terminalsByPid[term.pid];
    delete logsByPid[term.pid];
  };

  getLogger(req).connect(req, term.pid);
  ws.send(logs);

  term.on("data", function (data) {
    try {
      ws.send(data);
    } catch (ex) {
      console.error("Cannot send data to websocket for terminal %s.", term.pid);
      // The WebSocket is not open, ignore
    }
  });
}

export default function (app: Express.Application) {
  app.post("/api/terminals/create/:task_id", createTerminal);
  app.post("/api/terminals/resize", TerminalBearer, resizeTerminal);
  (app as any).ws("/api/terminals/ws", WsTerminalBearer, connectTerminal);
}
