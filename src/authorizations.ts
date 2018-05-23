import Express = require('express');
import * as Ws from 'ws';
import Util = require('util');

import { getAdminsByTaskId, getTaskIdByPid, getTaskInfoByTaskId, getEnv } from './express_helpers';

function intersection(array1: string[], array2: string[]) {
  return array1.filter(function(n) {
    return array2.indexOf(n) !== -1;
  });
}

function extractUserGroupNames(groups: string[]): string[] {
  if (!groups) {
    return [];
  }

  if (typeof groups === 'string') {
    groups = [groups];
  }

  return groups.map((m: string) => {
    const matches = m.match(/^(CN|cn)=([a-zA-Z0-9_-]+)/m);
    return (matches.length > 1) ? matches[2] : undefined;
  }).filter(m => m !== undefined);
}

export function isUserAdmin(req: Express.Request): boolean {
  const env = getEnv(req);
  const admins = (env.ADMINS != '') ? env.ADMINS.split(',') : [];
  const userAndGroups = [req.user.cn].concat(extractUserGroupNames(req.user.memberOf));
  return userAndGroups && intersection(userAndGroups, admins).length > 0;
}

function sendError(res: Express.Response, msg: string, ...args: string[]) {
    console.log(msg, args);
    res.send(Util.format(msg, args));
}

export function isUserAllowedToDebug(
  req: Express.Request,
  res: Express.Response,
  next: Express.NextFunction) {

  let taskId = req.params.task_id;
  if (!taskId) {
    const pid = req.params.pid;
    const taskIdByPid = getTaskIdByPid(req);
    taskId = taskIdByPid[pid];
  }

  if (!taskId) {
    const pid = (req.params.pid) ? req.params.pid : 'unknown';
    sendError(res, 'Cannot find taskId related to PID %s', pid);
    return;
  }

  // ensure non admin users cannot log into root containers
  if (!isUserAdmin(req)) {
    const taskInfoByTaskId = getTaskInfoByTaskId(req);
    const taskInfo = taskInfoByTaskId[taskId];

    if (!taskInfo) {
      const err = `Authorizer: No task info found for task ${taskId}.`;
      console.error(err);
      res.send(err);
      return;
    }

    if (!taskInfo.user || taskInfo.user === 'root') {
      console.log('Cannot log into root container %s', taskId);
      res.status(403);
      res.send('Cannot log into a root container, please contact an administrator.');
      return;
    }
  }

  const env = getEnv(req);
  const adminGroupsAndUsers = (env.ADMINS != '') ? env.ADMINS.split(',') : [];

  const adminsByTaskId = getAdminsByTaskId(req);
  const adminsOfTaskId = adminsByTaskId[taskId];
  const allowedUsersAndGroups = (adminsOfTaskId)
    ? adminGroupsAndUsers.concat(adminsOfTaskId)
    : adminGroupsAndUsers;

  const userGroups = extractUserGroupNames(req.user.memberOf);
  const usernameAndUserGroups = [req.user.cn].concat(userGroups);

  if (!userGroups) {
    sendError(res, 'Cannot retrieve groups of user "%s".', req.user.cn);
    return;
  }

  if (!usernameAndUserGroups) {
    sendError(res, 'Cannot calculate list of allowed groups and users.');
    return;
  }

  if (intersection(usernameAndUserGroups, allowedUsersAndGroups).length > 0)
    next();
  else {
    console.error('User "%s" is not in authorized to debug', req.user.cn);
    res.status(403);
    res.send('Unauthorized access to container.');
  }
}

export function wsIsUserAllowedToDebug(ws: Ws, req: Express.Request, next: Express.NextFunction) {
  isUserAllowedToDebug(req, undefined, next);
}
