import Express = require("express");
import { EnvVars, env } from "./env_vars";
import { Logger } from "./logger";
import { isSuperAdmin } from "./authorizations";

const ENV_VARS_KEY = "env_vars";
const LOGGER_KEY = "logger";

export interface User {
  cn: string;
  memberOf: string[];
}

export interface Request extends Express.Request {
  user: User;
}

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

export function SuperAdminsOnly(
  req: Request,
  res: Express.Response,
  next: Express.NextFunction
) {
  const user = req.user as User;

  if (
    user.cn &&
    user.memberOf &&
    isSuperAdmin(user.cn, user.memberOf, env.SUPER_ADMINS)
  ) {
    next();
    return;
  }
  res.status(403).send();
}
