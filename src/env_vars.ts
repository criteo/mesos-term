
function getOrExit(var_name: string): string {
  const v = process.env[var_name];
  if (v) return v;

  console.log(`${var_name} env const must be provided`);
  process.exit(1);
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
  SUPER_ADMINS: string[];
  CA_FILE: string;
}

const authorizations_enabled = (process.env['LDAP_URL']) ? true : false;

function getSuperAdmins() {
  const adminsStr = process.env['SUPER_ADMINS'];
  return (adminsStr)
    ? adminsStr.split(',')
    : [];
}

export const env: EnvVars = {
  SESSION_SECRET: getOrExit('SESSION_SECRET'),
  JWT_SECRET: getOrExit('JWT_SECRET'),
  CA_FILE: process.env['CA_FILE'],
  SUPER_ADMINS: getSuperAdmins(),
  MESOS_MASTER_URL: getOrExit('MESOS_MASTER_URL'),
  AUTHORIZATIONS_ENABLED: authorizations_enabled,
  MESOS_STATE_CACHE_TIME: parseFloat(getOrExit('MESOS_STATE_CACHE_TIME'))
};

if (authorizations_enabled) {
  env['LDAP_URL'] = getOrExit('LDAP_URL');
  env['LDAP_BASE_DN'] = getOrExit('LDAP_BASE_DN');
  env['LDAP_USER'] = getOrExit('LDAP_USER');
  env['LDAP_PASSWORD'] = getOrExit('LDAP_PASSWORD');
}
