
function getOrExit(varName: string): string {
  const v = process.env[varName];
  if (v) return v;

  console.log(`${varName} env const must be provided`);
  process.exit(1);
}

function getOrElse(varName: string, defaultValue: string): string {
  const v = process.env[varName];
  if (v) {
    return v;
  }
  else {
    return defaultValue;
  }
}

export interface EnvVars {
  AUTHORIZATIONS_ENABLED: boolean;
  // The authentication is forwarded by a front proxy
  // In that mode MesosTerm considers the user is authenticated by
  // receiving the DN of the user provided by the front proxy in the
  // X-Fowarded-User header.
  // MesosTerm then only performs the groups resolution.
  // 
  // TODO(c.michaud): shared a secret between the proxy and Authelia int
  // order to trust the X-Forwarded-User header.
  FORWARDED_AUTH_ENABLED: boolean;

  JWT_SECRET: string;
  LDAP_URL?: string;
  LDAP_BASE_DN?: string;
  LDAP_USER?: string;
  LDAP_PASSWORD?: string;
  MESOS_MASTER_URL: string;
  MESOS_STATE_CACHE_TIME: number;
  SESSION_SECRET: string;
  SUPER_ADMINS: string[];
  ALLOWED_TASK_ADMINS: string[];

  // When enabled, all users can see the sandboxes, meaning that
  // the label MESOS_TERM_DEBUG_GRANTED_TO is not honored anymore.
  // Any authenticated user could access any sandbox.
  AUTHORIZE_ALL_SANDBOXES: boolean

  ENABLE_PER_APP_ADMINS?: boolean;
  ENABLE_RIGHTS_DELEGATION?: boolean;
  EXTRA_ENV: string;
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
  JWT_SECRET: getOrExit('MESOS_TERM_JWT_SECRET'),
  SUPER_ADMINS: getSuperAdmins(),
  ALLOWED_TASK_ADMINS: parseAllowedTaskAdmins(),
  MESOS_MASTER_URL: getOrExit('MESOS_TERM_MESOS_MASTER_URL'),
  AUTHORIZATIONS_ENABLED: authorizations_enabled,
  MESOS_STATE_CACHE_TIME: parseFloat(getOrExit('MESOS_TERM_MESOS_STATE_CACHE_TIME')),
  EXTRA_ENV: getOrElse('MESOS_TERM_ENVIRONMENT', ''),
  COMMAND: getOrElse('MESOS_TERM_COMMAND', '/bin/sh'),
  FORWARDED_AUTH_ENABLED: false,
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

  env['FORWARDED_AUTH_ENABLED'] =
    'MESOS_TERM_FORWARDED_AUTH' in process.env &&
    process.env['MESOS_TERM_FORWARDED_AUTH'] === 'true';

  env['AUTHORIZE_ALL_SANDBOXES'] =
    'AUTHORIZE_ALL_SANDBOXES' in process.env &&
    process.env['AUTHORIZE_ALL_SANDBOXES'] === 'true';
}
