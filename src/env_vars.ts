
function getOrExit(var_name: string) {
  const v = process.env[var_name];
  if (v) return v;

  console.log(`${var_name} env const must be provided`);
  process.exit(1);
}

export interface EnvVars {
  ADMINS: string;
  LDAP_URL: string;
  LDAP_BASE_DN: string;
  LDAP_USER: string;
  LDAP_PASSWORD: string;
  MESOS_TASK_EXEC_DIR: string;
  SESSION_SECRET: string;
}

export const env = {
  MESOS_TASK_EXEC_DIR: getOrExit('MESOS_TASK_EXEC_DIR'),
  SESSION_SECRET: getOrExit('SESSION_SECRET'),
  LDAP_URL: getOrExit('LDAP_URL'),
  LDAP_BASE_DN: getOrExit('LDAP_BASE_DN'),
  LDAP_USER: getOrExit('LDAP_USER'),
  LDAP_PASSWORD: getOrExit('LDAP_PASSWORD'),
  ADMINS: process.env['ADMINS'] || ''
};
