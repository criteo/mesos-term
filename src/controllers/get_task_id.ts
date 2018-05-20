import Express = require('express');
import Constants = require('../constants');
import { getTaskInfo, TaskInfo } from '../mesos';
import { getOwnersByTaskId, getLogger } from '../express_helpers';
import { isUserInAdminGroups, isUserAllowedToDebug } from '../authorizations';
import { env } from '../env_vars';


function denyRootContainerLogin(task_info: TaskInfo, req: Express.Request, next: (err: Error) => void) {
  const isUserAdmin = isUserInAdminGroups(req);
  if (!isUserAdmin && (!task_info.user || task_info.user === 'root')) {
    next(new Error('Not allowed to log into a root container'));
  }
  next(undefined);
}

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
  const ownersByTaskId = getOwnersByTaskId(req);

  getTaskInfo(task_id, function(err, task_info) {
    if (err) {
      res.send('Internal error');
      console.error('Error while retrieving task labels %s', err);
      return;
    }

    if (Constants.DEBUG_ALLOWED_TO_KEY in task_info.labels) {
      ownersByTaskId[task_id] = task_info.labels[Constants.DEBUG_ALLOWED_TO_KEY].split(',');
    }

    isUserAllowedToDebug(req, res, function() {
      denyRootContainerLogin(task_info, req, function(err) {
        if (err) {
          res.send(err);
          return;
        }
        renderTerminal(req, res, task_info);
      });
    });
  });
}

export function anonymous(req: Express.Request, res: Express.Response) {
  const task_id = req.params.task_id;
  getTaskInfo(task_id, function(err, task_info) {
    if (err) {
      res.send('Internal error');
      console.error('Error while retrieving task labels %s', err);
      return;
    }
    renderTerminal(req, res, task_info);
  });
}
