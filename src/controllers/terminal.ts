import Express = require('express');
import NodePty = require('node-pty');
import * as Ws from 'ws';
import Path = require('path');

import { env } from '../env_vars';
import { getTaskIdByPid, getAdminsByTaskId, getTaskInfoByTaskId, getLogger } from '../express_helpers';

const terminals: {[pid: number]: NodePty.IPty} = {};
const logs: {[pid: number]: string} = {};

export function requestTerminal(req: Express.Request, res: Express.Response) {
  const taskId = req.params.task_id;
  if (!taskId) {
    res.send('You must provide a task id.');
    return;
  }

  const taskInfo = getTaskInfoByTaskId(req)[taskId];
  if (!taskInfo) {
    const err = `No task info found for task ${taskId}.`;
    console.error(err);
    res.send(err);
    return;
  }

  let params: string[] = [
    Path.resolve(__dirname, '..', 'python/terminal.py'),
    taskInfo.agent_url,
    taskInfo.container_id,
  ]

  if (taskInfo.user) {
    params.push(taskInfo.user);
  }

  const term = NodePty.spawn('python3', params, {
      name: 'terminal'
    });

  getLogger(req).open(req, taskId, term.pid);

  terminals[term.pid] = term;
  logs[term.pid] = '';
  const taskIdByPid = getTaskIdByPid(req);
  taskIdByPid[term.pid] = taskId;

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
    const taskIdByPid = getTaskIdByPid(req);

    // Clean things up
    if (term.pid in taskIdByPid) {
      const taskId = taskIdByPid[term.pid];

      const taskInfoByTaskId = getTaskInfoByTaskId(req);
      if (taskId in taskInfoByTaskId) {
        delete taskInfoByTaskId[taskId];
      }

      const adminsByTaskId = getAdminsByTaskId(req);
      if (taskId in adminsByTaskId) {
        delete adminsByTaskId[taskId];
      }

      delete taskIdByPid[term.pid];
    }

    delete terminals[term.pid];
    delete logs[term.pid];
  });
}
