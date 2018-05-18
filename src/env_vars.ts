
function getOrExit(var_name: string) {
  const v = process.env[var_name];
  if (v) return v;

  console.log(`${var_name} env const must be provided`);
  process.exit(1);
}

export const MESOS_TASK_EXEC_DIR = getOrExit('MESOS_TASK_EXEC_DIR');
export const SESSION_SECRET = getOrExit('SESSION_SECRET');
export const LDAP_URL = getOrExit('LDAP_URL');
export const LDAP_BASE_DN = getOrExit('LDAP_BASE_DN');
export const LDAP_USER = getOrExit('LDAP_USER');
export const LDAP_PASSWORD = getOrExit('LDAP_PASSWORD');
export const ADMINS = process.env['ADMINS'] || '';
