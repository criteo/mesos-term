import Express = require('express');
import Constants = require('../constants');
import { getTaskInfo, TaskInfo } from '../mesos';
import { getAdminsByTaskId, getUserByTaskId, getLogger } from '../express_helpers';
import { isUserAllowedToDebug } from '../authorizations';
import { env } from '../env_vars';


function renderTerminal(req: Express.Request, res: Express.Response, task_info: TaskInfo) {
  const task_id = req.params.task_id;
  getLogger(req).request(req, task_id);

  res.render('index', {
    task_id: task_id,
    user: task_info.user || 'root'
  });
}

export function authenticated(req: Express.Request, res: Express.Response) {
  if (req.url == '/favicon.ico') {
    res.status(404);
    return;
  }

  const task_id = req.params.task_id;

  getTaskInfo(task_id, function(err, task_info) {
    if (err) {
      res.send('Error while retrieving task labels.');
      console.error('Error while retrieving task labels %s', err);
      return;
    }

    if (Constants.DEBUG_ALLOWED_TO_KEY in task_info.labels) {
      const adminsByTaskId = getAdminsByTaskId(req);
      adminsByTaskId[task_id] = task_info.labels[Constants.DEBUG_ALLOWED_TO_KEY].split(',');
    }

    if (task_info.user) {
      const userByTaskId = getUserByTaskId(req);
      userByTaskId[task_id] = task_info.user;
    }

    isUserAllowedToDebug(req, res, function() {
      renderTerminal(req, res, task_info);
    });
  });
}

export function anonymous(req: Express.Request, res: Express.Response) {
  const task_id = req.params.task_id;
  getTaskInfo(task_id, function(err, task_info) {
    if (err) {
      res.send('Error while retrieving task labels.');
      console.error('Error while retrieving task labels %s', err);
      return;
    }
    renderTerminal(req, res, task_info);
  });
}
