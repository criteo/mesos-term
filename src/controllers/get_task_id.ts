import Express = require('express');
import Constants = require('../constants');
import { getLogger } from '../express_helpers';

export default function(req: Express.Request, res: Express.Response) {
  if (req.url == '/favicon.ico') {
    res.status(404);
    return;
  }

  const taskId = req.params.task_id;
  getLogger(req).request(req, taskId);
  res.render('index', { task_id: taskId, });
}
