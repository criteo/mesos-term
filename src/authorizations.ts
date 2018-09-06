import Bluebird = require('bluebird');
import Jwt = require('jsonwebtoken');
import { env } from './env_vars';

const JwtAsync: any = Bluebird.promisifyAll(Jwt);

function intersection(array1: string[], array2: string[]) {
  return array1.filter(function(n) {
    return array2.indexOf(n) !== -1;
  });
}

function extractCN(groups: string[]): string[] {
  if (!groups) {
    return [];
  }

  if (typeof groups === 'string') {
    groups = [groups];
  }

  return groups.map((m: string) => {
    const matches = m.match(/^(CN|cn)=([a-zA-Z0-9_-]+)/m);
    return (matches.length > 1) ? matches[2] : undefined;
  }).filter(m => m !== undefined);
}

export function FilterTaskAdmins(
  task_admins_enabled: boolean,
  allowed_task_admins: string[],
  task_admins: string[]): string[] {
  if (!task_admins_enabled) {
    return [];
  }

  if (allowed_task_admins.length == 0) {
    return task_admins;
  }

  return intersection(allowed_task_admins, task_admins);
}

export function CheckUserAuthorizations(
  userCN: string,
  userLdapGroups: string[],
  admins: string[],
  superAdmins: string[]) {

  const userGroups = extractCN(userLdapGroups);
  const userAndGroups = [userCN].concat(userGroups);
  const allowed = admins.concat(superAdmins);
  return (intersection(userAndGroups, allowed).length > 0)
    ? Bluebird.resolve()
    : Bluebird.reject(new Error('Unauthorized access to container.'));
}

export function CheckRootContainer(
  taskUser: string,
  userCN: string,
  userLdapGroups: string[],
  superAdmins: string[]) {

  const userGroups = extractCN(userLdapGroups);
  const userAndGroups = [userCN].concat(userGroups);
  const isUserAdmin = (intersection(userAndGroups, superAdmins).length > 0);

  return (isUserAdmin || (taskUser && taskUser !== 'root'))
    ? Bluebird.resolve()
    : Bluebird.reject(new Error('Unauthorized access to root container.'));
}

export function CheckDelegation(
  userCN: string,
  userLdapGroups: string[],
  taskId: string,
  delegationToken: string,
  jwt_secret: string) {

  return JwtAsync.verifyAsync(delegationToken, jwt_secret)
    .then(function(payload: {task_id: string, delegate_to: string[]}) {
      const userGroups = extractCN(userLdapGroups);
      const userAndGroups = [userCN].concat(userGroups);
      const isUserDelegated = (intersection(userAndGroups, payload.delegate_to).length > 0);

      if (taskId != payload.task_id || !isUserDelegated) {
        return Bluebird.reject(new Error('Invalid access delegation.'));
      }
      return Bluebird.resolve();
    })
    .catch(function(err: Error) {
      return Bluebird.reject(new Error('Invalid access delegation.'));
    });
}

export function isSuperAdmin(
  userCN: string,
  userLdapGroups: string[],
  superAdmins: string[]): boolean {
  const userGroups = extractCN(userLdapGroups);
  return intersection([userCN].concat(userGroups), superAdmins).length > 0;
}

