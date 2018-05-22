import Express = require('express');
import { EnvVars, env } from './env_vars';
import { Logger } from './logger';
import { Task } from './mesos';

type Admin = string; // represent a username or a group name


type AdminsByTaskId = {[taskId: string]: Admin[]};
type TaskInfoByTaskId = {[taskId: string]: Task};
type TaskIdByPid = {[pid: number]: string};

const ADMINS_BY_TASK_ID_KEY = 'admins_by_task_id';
const TASK_INFO_BY_TASK_ID_KEY = 'user_by_task_id';
const TASK_ID_BY_PID_KEY = 'task_id_by_pid';
const ENV_VARS_KEY = 'env_vars';
const LOGGER_KEY = 'logger';

export function setup(app: Express.Application, logger: Logger) {
  app.set(ADMINS_BY_TASK_ID_KEY, {});
  app.set(TASK_ID_BY_PID_KEY, {});
  app.set(ENV_VARS_KEY, env);
  app.set(LOGGER_KEY, logger);

  // store the task info of a given task id to deny login to root containers
  app.set(TASK_INFO_BY_TASK_ID_KEY, {});
}

export function getAdminsByTaskId(req: Express.Request): AdminsByTaskId {
  return req.app.get(ADMINS_BY_TASK_ID_KEY);
}

export function getTaskInfoByTaskId(req: Express.Request): TaskInfoByTaskId {
  return req.app.get(TASK_INFO_BY_TASK_ID_KEY);
}

export function getTaskIdByPid(req: Express.Request): TaskIdByPid {
  return req.app.get(TASK_ID_BY_PID_KEY);
}

export function getEnv(req: Express.Request): EnvVars {
  return req.app.get(ENV_VARS_KEY);
}

export function getLogger(req: Express.Request): Logger {
  return req.app.get(LOGGER_KEY);
}
