import Express = require('express');

type Owner = string;
type OwnersByTaskId = {[taskId: string]: Owner[]};
type OwnersByPid = {[taskId: string]: Owner[]};

const OWNERS_BY_TASK_ID_KEY = 'owners_by_task_id';
const OWNERS_BY_PID_KEY = 'owners_by_pid';

export function setup(app: Express.Application) {
  app.set(OWNERS_BY_TASK_ID_KEY, {});
  app.set(OWNERS_BY_PID_KEY, {});
}

export function getOwnersByTaskId(req: Express.Request): OwnersByTaskId  {
  return req.app.get(OWNERS_BY_TASK_ID_KEY);
}

export function getOwnersByPid(req: Express.Request): OwnersByPid {
  return req.app.get(OWNERS_BY_PID_KEY);
}
