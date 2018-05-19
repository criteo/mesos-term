import Express = require('express');
import { EnvVars, env } from './env_vars';
import { Logger } from './logger';

type Owner = string;
type OwnersByTaskId = {[taskId: string]: Owner[]};
type OwnersByPid = {[taskId: string]: Owner[]};

const OWNERS_BY_TASK_ID_KEY = 'owners_by_task_id';
const OWNERS_BY_PID_KEY = 'owners_by_pid';
const ENV_VARS_KEY = 'env_vars';
const LOGGER_KEY = 'logger';

export function setup(app: Express.Application, logger: Logger) {
  app.set(OWNERS_BY_TASK_ID_KEY, {});
  app.set(OWNERS_BY_PID_KEY, {});
  app.set(ENV_VARS_KEY, env);
  app.set(LOGGER_KEY, logger);
}

export function getOwnersByTaskId(req: Express.Request): OwnersByTaskId  {
  return req.app.get(OWNERS_BY_TASK_ID_KEY);
}

export function getOwnersByPid(req: Express.Request): OwnersByPid {
  return req.app.get(OWNERS_BY_PID_KEY);
}

export function getEnv(req: Express.Request): EnvVars {
  return req.app.get(ENV_VARS_KEY);
}

export function getLogger(req: Express.Request): Logger {
  return req.app.get(LOGGER_KEY);
}
