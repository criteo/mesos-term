import Express = require('express');
import Constants = require('../constants');
import { getLogger } from '../express_helpers';
import { env } from '../env_vars';

export default function(req: Express.Request, res: Express.Response) {
  const taskId = req.params.task_id;
  getLogger(req).request(req, taskId);
  const renderOptions: any = { task_id: taskId };
  renderOptions['access_token'] = (req.query.access_token)
    ? req.query.access_token : '';
  renderOptions['rights_delegation_enabled'] = env.ENABLE_RIGHTS_DELEGATION;

  res.render('terminal', renderOptions);
}
