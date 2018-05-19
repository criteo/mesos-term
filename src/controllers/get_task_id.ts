import Express = require('express');
import Constants = require('../constants');
import { getTaskInfo, TaskInfo } from '../mesos';
import { getOwnersByTaskId } from '../express_helpers';
import { isUserInAdminGroups, isUserAllowedToDebug } from '../authorizations';
import { env } from '../env_vars';


function denyRootContainerLogin(task_info: TaskInfo, req: Express.Request, next: (err: Error) => void) {
  if (!env.AUTHORIZATIONS_ENABLED) {
    next(undefined);
    return;
  }

  const isUserAdmin = isUserInAdminGroups(req);
  if (!isUserAdmin && (!task_info.user || task_info.user === 'root')) {
    next(new Error('Not allowed to log into a root container'));
  }
  next(undefined);
}

function renderTerminal(req: Express.Request, res: Express.Response, task_info: TaskInfo) {
  const task_id = req.params.task_id;
  console.log('Anonymous user has requested a session in container "%s"',
    task_id);

  res.render('index', {
    task_id: task_id,
    user: task_info.user || 'root'
  });
}

export default function(req: Express.Request, res: Express.Response) {
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
