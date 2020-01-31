import * as Jwt from 'jsonwebtoken';
import { TaskInfo } from './mesos';
import { Request } from './express_helpers';
import { env } from './env_vars';

export class UnauthorizedAccessError extends Error {
  constructor(m: string) {
    super(m);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, UnauthorizedAccessError.prototype);
  }
}

function intersection(array1: string[], array2: string[]) {
  return array1.filter(function (n) {
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
  }).filter(m => m !== undefined).map(m => m.toLowerCase());
}

// TODO: integrate all public methods in one authorizer class
// returns a list of of list of groups
// users must be in at least one group of each entry to be allowed to admin of a container
export function FilterTaskAdmins(
  task_admins_enabled: boolean, // ENABLE_PER_APP_ADMINS
  allowed_task_admins: string[], // ALLOWED_TASK_ADMINS
  task_admins: string[]): string[][] { // DEBUG_GRANTED_TO
  if (!task_admins_enabled) {
    return [];
  }

  if (allowed_task_admins.length == 0) {
    return [task_admins];
  }

  return [allowed_task_admins, task_admins];
}

export async function CheckUserAuthorizations(
  userCN: string,
  userLdapGroups: string[],
  admins_constraints: string[][],
  superAdmins: string[]): Promise<void> {

  const userGroups = extractCN(userLdapGroups);
  const userAndGroups = [userCN].concat(userGroups);
  const isUserSuperAdmin = (intersection(userAndGroups, superAdmins).length > 0);
  const admins_constraints_lower = admins_constraints.map(array => array.map(el => el.toLowerCase()));

  if (isUserSuperAdmin) {
    return;
  }

  if (admins_constraints.length == 0) {
    throw new UnauthorizedAccessError('Only super admins can connect to this container');
  }

  console.log(`User ${userCN} is part of following entities: ${userAndGroups}`);
  console.log('Requirement to login to this app are: ' + admins_constraints);

  if (!admins_constraints_lower.every(matches, userAndGroups)) {
    throw new UnauthorizedAccessError('Unauthorized');
  }
}

function matches(element: string[], index: number, array: string[][]) {
  return intersection(element, this).length > 0;
}

export async function CheckRootContainer(
  taskUser: string,
  userCN: string,
  userLdapGroups: string[],
  superAdmins: string[]) {

  const userGroups = extractCN(userLdapGroups);
  const userAndGroups = [userCN].concat(userGroups);
  const isUserAdmin = (intersection(userAndGroups, superAdmins).length > 0);

  if (!(isUserAdmin || (taskUser && taskUser !== 'root'))) {
    throw new UnauthorizedAccessError('Unauthorized access to root container.');
  }
}

export async function CheckDelegation(
  userCN: string,
  userLdapGroups: string[],
  taskId: string,
  delegationToken: string,
  jwt_secret: string) {

  const payload = Jwt.verify(delegationToken, jwt_secret) as { task_id: string, delegate_to: string[] };

  const userGroups = extractCN(userLdapGroups);
  const userAndGroups = [userCN].concat(userGroups);
  const isUserDelegated = (intersection(userAndGroups, payload.delegate_to).length > 0);

  if (taskId != payload.task_id || !isUserDelegated) {
    throw new Error('Invalid access delegation.');
  }
}

export function isSuperAdmin(
  userCN: string,
  userLdapGroups: string[],
  superAdmins: string[]): boolean {
  const userGroups = extractCN(userLdapGroups);
  return intersection([userCN].concat(userGroups), superAdmins).length > 0;
}

export async function CheckTaskAuthorization(
  req: Request,
  task: TaskInfo,
  accessToken: string) {

  const userCN = req.user.cn;
  const userLdapGroups = req.user.memberOf;
  const admins_constraints = FilterTaskAdmins(
    env.ENABLE_PER_APP_ADMINS,
    env.ALLOWED_TASK_ADMINS,
    task.admins);
  const superAdmins = env.SUPER_ADMINS;

  // First check delegation token granted by an admin
  if (accessToken && env.ENABLE_RIGHTS_DELEGATION) {
    try {
      await CheckDelegation(
        userCN,
        userLdapGroups,
        task.task_id,
        accessToken,
        env.JWT_SECRET
      );
      // If delegation token is validated, we skip the next checks.
      return;
    }
    catch (err) {
      // if delegation is not validated though, let's move forward with next checks
    }
  }

  await Promise.all([
    CheckUserAuthorizations(
      userCN,
      userLdapGroups,
      admins_constraints,
      superAdmins
    ),
    CheckRootContainer(
      task.user,
      userCN,
      userLdapGroups,
      superAdmins
    )
  ]);
}

