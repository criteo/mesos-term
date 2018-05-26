import Bluebird = require('bluebird');

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
    : Bluebird.reject(new Error('Unauthorized'));
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
    : Bluebird.reject(new Error('Cannot log into root container'));
}

