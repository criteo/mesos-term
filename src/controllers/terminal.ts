import Express = require('express');
import NodePty = require('node-pty');
import * as Ws from 'ws';

import { env } from '../env_vars';
import { getOwnersByTaskId, getOwnersByPid, getLogger } from '../express_helpers';

const terminals: {[pid: number]: NodePty.IPty} = {};
const logs: {[pid: number]: string} = {};

export function requestTerminal(req: Express.Request, res: Express.Response) {
  const task_id = req.params.task_id;
  if (!task_id) {
    res.send('You must provide a task id.');
    return;
  }


  const term = NodePty.spawn('python3',
    [env.MESOS_TASK_EXEC_DIR + '/exec.py', task_id], {
    name: 'mesos-task-exec',
    cwd: process.env.PWD,
    env: process.env
  });

  getLogger(req).open(req, task_id, term.pid);

  terminals[term.pid] = term;
  logs[term.pid] = '';
  const ownersByPid = getOwnersByPid(req);
  const ownersByTaskId = getOwnersByTaskId(req);
  ownersByPid[term.pid] = ownersByTaskId[task_id];
  term.on('data', function(data) {
    logs[term.pid] += data;
  });
  res.send(term.pid.toString());
  res.end();
}

export function resizeTerminal(req: Express.Request, res: Express.Response) {
  const pid = parseInt(req.params.pid);
  const cols = parseInt(req.query.cols);
  const rows = parseInt(req.query.rows);
  const term = terminals[pid];

  term.resize(cols, rows);
  getLogger(req).resizeTerminal(pid, cols, rows);
  res.end();
}

export function connectTerminal(ws: Ws, req: Express.Request) {
  const term = terminals[parseInt(req.params.pid)];
  getLogger(req).connect(req, term.pid);
  ws.send(logs[term.pid]);

  term.on('data', function(data) {
    try {
      ws.send(data);
    }
    catch (ex) {
      console.log('websocket is not open');
      // The WebSocket is not open, ignore
    }
  });

  term.on('exit', function() {
    getLogger(req).connectionClosed(term.pid);
    ws.close();
  });

  ws.on('message', function(msg: string) {
    term.write(msg);
  });

  ws.on('close', function () {
    term.kill();
    getLogger(req).disconnect(req, term.pid);
    // Clean things up
    delete terminals[term.pid];
    delete logs[term.pid];
  });
}
