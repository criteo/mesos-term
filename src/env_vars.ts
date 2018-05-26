
function getOrExit(var_name: string): string {
  const v = process.env[var_name];
  if (v) return v;

  console.log(`${var_name} env const must be provided`);
  process.exit(1);
}

export interface EnvVars {
  ADMINS: string[];
  LDAP_URL?: string;
  LDAP_BASE_DN?: string;
  LDAP_USER?: string;
  LDAP_PASSWORD?: string;
  MESOS_MASTER_URL: string;
  SESSION_SECRET: string;
  JWT_SECRET: string;
  AUTHORIZATIONS_ENABLED: boolean;
}

const authorizations_enabled = (process.env['LDAP_URL']) ? true : false;

function getAdmins() {
  const adminsStr = process.env['ADMINS'];
  return (adminsStr)
    ? adminsStr.split(',')
    : [];
}

export const env: EnvVars = {
  SESSION_SECRET: getOrExit('SESSION_SECRET'),
  JWT_SECRET: getOrExit('JWT_SECRET'),
  ADMINS: getAdmins(),
  MESOS_MASTER_URL: getOrExit('MESOS_MASTER_URL'),
  AUTHORIZATIONS_ENABLED: authorizations_enabled
};

if (authorizations_enabled) {
  env['LDAP_URL'] = getOrExit('LDAP_URL');
  env['LDAP_BASE_DN'] = getOrExit('LDAP_BASE_DN');
  env['LDAP_USER'] = getOrExit('LDAP_USER');
  env['LDAP_PASSWORD'] = getOrExit('LDAP_PASSWORD');
}
