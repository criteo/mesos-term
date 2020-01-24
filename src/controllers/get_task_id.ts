import Express = require('express');
import { getLogger } from '../express_helpers';
import { env } from '../env_vars';
import { isSuperAdmin } from '../authorizations';
import { Request } from '../express_helpers';

export default function (req: Request, res: Express.Response) {
  const taskId = req.params.task_id;
  getLogger(req).request(req, taskId);
  const renderOptions: any = { task_id: taskId };
  renderOptions['access_token'] = (req.query.access_token)
    ? req.query.access_token : '';
  renderOptions['rights_delegation_enabled'] =
    env.ENABLE_RIGHTS_DELEGATION;
  renderOptions['is_super_admin'] = (env.AUTHORIZATIONS_ENABLED)
    ? isSuperAdmin(req.user.cn, req.user.memberOf, env.SUPER_ADMINS)
    : false;

  res.render('terminal', renderOptions);
}
