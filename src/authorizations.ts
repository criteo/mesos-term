import Express = require('express');
import * as Ws from 'ws';

import { ADMINS } from './env_vars';
import { getOwnersByTaskId, getOwnersByPid } from './express_helpers';

function intersection(array1: string[], array2: string[]) {
  return array1.filter(function(n) {
    return array2.indexOf(n) !== -1;
  });
}

export function isUserAllowedToDebug(
  req: Express.Request,
  res: Express.Response,
  next: Express.NextFunction) {

  const ownersByTaskId = getOwnersByTaskId(req);
  const ownersByPid = getOwnersByTaskId(req);
  const task_id = req.params.task_id;

  const admins = (ADMINS != '') ? ADMINS.split(',') : [];
  const allowed = (task_id)
    ? ((ownersByTaskId[task_id])
      ? admins.concat(ownersByTaskId[task_id])
      : admins)
    : ((ownersByPid[req.params.pid])
      ? admins.concat(ownersByPid[req.params.pid])
      : admins);

  const groups = req.user.memberOf.map((m: string) => m.match(/^CN=([a-zA-Z0-9_-]+)/m)[1]);
  const userCN = req.user.cn;

  if ((groups && intersection(groups, allowed).length > 0) ||
     intersection([req.user.cn], allowed).length > 0)
    next();
  else {
    console.error('User "%s" is not in authorized to debug', req.user.cn);
    res.status(403);
    res.send('Unauthorized');
  }
}

export function wsIsUserAllowedToDebug(ws: Ws, req: Express.Request, next: Express.NextFunction) {
  isUserAllowedToDebug(req, undefined, next);
}
