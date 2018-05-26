import Express = require('express');
import { EnvVars, env } from './env_vars';
import { Logger } from './logger';
import { Task } from './mesos';

const ENV_VARS_KEY = 'env_vars';
const LOGGER_KEY = 'logger';

export function setup(app: Express.Application, logger: Logger) {
  app.set(ENV_VARS_KEY, env);
  app.set(LOGGER_KEY, logger);
}

export function getEnv(req: Express.Request): EnvVars {
  return req.app.get(ENV_VARS_KEY);
}

export function getLogger(req: Express.Request): Logger {
  return req.app.get(LOGGER_KEY);
}
