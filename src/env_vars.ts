
function getOrExit(varName: string): string {
  const v = process.env[varName];
  if (v) return v;

  console.log(`${varName} env const must be provided`);
  process.exit(1);
}

function getOrElse<T extends string | number>(varName: string, defaultValue: T): T {
  const v = process.env[varName];
  if (v) {
    return v as T;
  }
  else {
    return defaultValue;
  }
}

export interface EnvVars {
  AUTHORIZATIONS_ENABLED: boolean;

  JWT_SECRET: string;
  LDAP_URL?: string;
  LDAP_BASE_DN?: string;
  LDAP_USER?: string;
  LDAP_PASSWORD?: string;
  MESOS_MASTER_URL: string;
  MESOS_STATE_CACHE_TIME: number;
  SESSION_SECRET: string;
  SESSION_MAX_AGE_SEC: number;
  SUPER_ADMINS: string[];
  ALLOWED_TASK_ADMINS: string[];

  // When enabled, all users can see the sandboxes, meaning that
  // the label MESOS_TERM_DEBUG_GRANTED_TO is not honored anymore.
  // Any authenticated user could access any sandbox.
  AUTHORIZE_ALL_SANDBOXES: boolean;

  ENABLE_PER_APP_ADMINS?: boolean;
  ENABLE_RIGHTS_DELEGATION?: boolean;
  EXTRA_ENV: string;
  ENV_SEPARATOR: string;
  COMMAND: string;
  CA_FILE?: string;
  MESOS_AGENT_CREDENTIALS?: { principal: string, password: string };
}

const authorizations_enabled = (process.env['MESOS_TERM_LDAP_URL']) ? true : false;

function getSuperAdmins() {
  const adminsStr = process.env['MESOS_TERM_SUPER_ADMINS'];
  return (adminsStr)
    ? adminsStr.split(',')
    : [];
}

function parseAllowedTaskAdmins() {
  const admins = process.env['MESOS_TERM_ALLOWED_TASK_ADMINS'];
  return (admins)
    ? admins.split(',')
    : [];
}

export const env: EnvVars = {
  SESSION_SECRET: getOrExit('MESOS_TERM_SESSION_SECRET'),
  SESSION_MAX_AGE_SEC: getOrElse('MESOS_TERM_SESSION_MAX_AGE_SEC', 3 * 3600), // 3h by default.
  JWT_SECRET: getOrExit('MESOS_TERM_JWT_SECRET'),
  SUPER_ADMINS: getSuperAdmins(),
  ALLOWED_TASK_ADMINS: parseAllowedTaskAdmins(),
  MESOS_MASTER_URL: getOrExit('MESOS_TERM_MESOS_MASTER_URL'),
  AUTHORIZATIONS_ENABLED: authorizations_enabled,
  MESOS_STATE_CACHE_TIME: parseFloat(getOrExit('MESOS_TERM_MESOS_STATE_CACHE_TIME')),
  EXTRA_ENV: getOrElse('MESOS_TERM_ENVIRONMENT', ''),
  ENV_SEPARATOR: getOrElse('MESOS_TERM_ENV_SEPARATOR', ':'),
  COMMAND: getOrElse('MESOS_TERM_COMMAND', '/bin/sh'),
  AUTHORIZE_ALL_SANDBOXES: false,
};


if ('MESOS_TERM_CA_FILE' in process.env) {
  env['CA_FILE'] = process.env['MESOS_TERM_CA_FILE'];
}

if ('MESOS_TERM_MESOS_AGENT_PRINCIPAL' in process.env && 'MESOS_TERM_MESOS_AGENT_PASSWORD' in process.env) {
  env['MESOS_AGENT_CREDENTIALS'] = {
    principal: process.env['MESOS_TERM_MESOS_AGENT_PRINCIPAL'],
    password: process.env['MESOS_TERM_MESOS_AGENT_PASSWORD']
  };
}

if (authorizations_enabled) {
  env['LDAP_URL'] = getOrExit('MESOS_TERM_LDAP_URL');
  env['LDAP_BASE_DN'] = getOrExit('MESOS_TERM_LDAP_BASE_DN');
  env['LDAP_USER'] = getOrExit('MESOS_TERM_LDAP_USER');
  env['LDAP_PASSWORD'] = getOrExit('MESOS_TERM_LDAP_PASSWORD');
  env['ENABLE_PER_APP_ADMINS'] = process.env['MESOS_TERM_ENABLE_PER_APP_ADMINS'] === 'true';
  env['ENABLE_RIGHTS_DELEGATION'] = process.env['MESOS_TERM_ENABLE_RIGHTS_DELEGATION'] === 'true';

  env['AUTHORIZE_ALL_SANDBOXES'] =
    'MESOS_TERM_AUTHORIZE_ALL_SANDBOXES' in process.env &&
    process.env['MESOS_TERM_AUTHORIZE_ALL_SANDBOXES'] === 'true';
}
