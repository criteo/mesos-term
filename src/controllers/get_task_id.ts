import Express = require('express');
import Constants = require('../constants');
import { getTaskLabels } from '../mesos';
import { getOwnersByTaskId } from '../express_helpers';
import { isUserAllowedToDebug } from '../authorizations';

export default function(req: Express.Request, res: Express.Response) {
  if (req.url == '/favicon.ico') {
    res.status(404);
    return;
  }

  const task_id = req.params.task_id;
  const ownersByTaskId = getOwnersByTaskId(req);

  getTaskLabels(task_id, function(err, labels) {
    if (err) {
      res.send('Internal error');
      console.error('Error while retrieving task labels %s', err);
      return;
    }
    if (Constants.DEBUG_ALLOWED_TO_KEY in labels) {
      ownersByTaskId[task_id] = labels[Constants.DEBUG_ALLOWED_TO_KEY].split(',');
    }
    isUserAllowedToDebug(req, res, function() {
      console.log('User "%s" has requested a session in container "%s"',
        req.user.cn, task_id);
      res.render('index', {
        task_id: task_id
      });
    });
  });
}
