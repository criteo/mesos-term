import Express = require('express');
import Constants = require('../constants');
import { getTaskInfo, TaskInfo } from '../mesos';
import { getOwnersByTaskId } from '../express_helpers';
import { isUserInAdminGroups, isUserAllowedToDebug } from '../authorizations';


function denyRootContainerLogin(task_info: TaskInfo, req: Express.Request, next: (err: Error) => void) {
  const isUserAdmin = isUserInAdminGroups(req);
  if (!isUserAdmin && (!task_info.user || task_info.user === 'root')) {
    next(new Error('Not allowed to log into a root container'));
  }
  next(undefined);
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

        console.log('User "%s" has requested a session in container "%s"',
          req.user.cn, task_id);
        res.render('index', {
          task_id: task_id
        });
      });
    });
  });
}
