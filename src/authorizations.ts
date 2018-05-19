import Express = require('express');
import * as Ws from 'ws';

import { getOwnersByTaskId, getOwnersByPid, getEnv } from './express_helpers';

function intersection(array1: string[], array2: string[]) {
  return array1.filter(function(n) {
    return array2.indexOf(n) !== -1;
  });
}

function extractUserGroupName(groups: string[]): string[] {
  if (!groups) {
    return [];
  }

  return groups.map((m: string) => {
    const matches = m.match(/^(CN|cn)=([a-zA-Z0-9_-]+)/m);
    return (matches.length > 1) ? matches[2] : undefined;
  }).filter(m => m !== undefined);
}

export function isUserInAdminGroups(req: Express.Request): boolean {
  const env = getEnv(req);
  const adminGroups = (env.ADMINS != '') ? env.ADMINS.split(',') : [];
  const groups = extractUserGroupName(req.user.memberOf);
  return groups && intersection(groups, adminGroups).length > 0;
}

export function isUserAllowedToDebug(
  req: Express.Request,
  res: Express.Response,
  next: Express.NextFunction) {

  const env = getEnv(req);

  const ownersByTaskId = getOwnersByTaskId(req);
  const ownersByPid = getOwnersByTaskId(req);
  const task_id = req.params.task_id;

  const adminGroups = (env.ADMINS != '') ? env.ADMINS.split(',') : [];
  const allowed = (task_id)
    ? ((ownersByTaskId[task_id])
      ? adminGroups.concat(ownersByTaskId[task_id])
      : adminGroups)
    : ((ownersByPid[req.params.pid])
      ? adminGroups.concat(ownersByPid[req.params.pid])
      : adminGroups);

  const groups = extractUserGroupName(req.user.memberOf);
  const userCN = req.user.cn;

  console.log(req.user.cn, allowed);

  if ((groups && intersection(groups, allowed).length > 0) ||
     intersection([req.user.cn], allowed).length > 0)
    next();
  else {
    console.error('User "%s" is not in authorized to debug', req.user.cn);
    res.status(403);
    res.send('Unauthorized access to container');
  }
}

export function wsIsUserAllowedToDebug(ws: Ws, req: Express.Request, next: Express.NextFunction) {
  isUserAllowedToDebug(req, undefined, next);
}
