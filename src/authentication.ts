import Express = require('express');
import passport = require('passport');
import LdapStrategy = require('passport-ldapauth');
import basicAuth = require('basic-auth');
import { Request } from './express_helpers';
import * as LdapJS from 'ldapjs';

import { env } from './env_vars';

export function BasicAuth(app: Express.Application) {
  const options = {
    server: {
      url: env.LDAP_URL,
      bindDN: env.LDAP_USER,
      bindCredentials: env.LDAP_PASSWORD,
      searchBase: env.LDAP_BASE_DN,
      searchFilter: 'cn={{username}}',
      searchAttributes: ['memberof', 'cn']
    },
    credentialsLookup: basicAuth
  };

  app.use(passport.initialize());
  app.use((req: Request, res, next) => {
    passport.authenticate('ldapauth', { session: true }, (err: Error, user: any, info: any) => {
      if (err) {
        return next(err);
      }

      if (!user && !req.session.user) {
        console.log(`ldap auth for ${req.method} ${req.path}`);
        res.status(401);
        res.header('WWW-Authenticate', 'Basic realm="mesos-term"');
        res.send('Unauthenticated');
        return;
      }

      if (!req.session.user) {
        req.session.user = user;
      }
      req.user = req.session.user;
      next();
    })(req, res, next);
  });

  passport.use(new LdapStrategy(options));
}

export function ForwardedAuth(app: Express.Application) {
  const client = LdapJS.createClient({
    url: env.LDAP_URL,
    bindDN: env.LDAP_USER,
    bindCredentials: env.LDAP_PASSWORD,
  });

  const searchOptions: LdapJS.SearchOptions = {
    scope: 'sub',
    attributes: ['memberof', 'cn'],
  };

  app.use(async (req: Request, res, next) => {
    if (!req.header('X-Forwarded-User')) {
      console.log(`User has not been authenticated by proxy`);
      res.status(401);
      res.header('WWW-Authenticate', 'Basic realm="mesos-term"');
      res.send('Unauthenticated');
      return;
    }

    if (!req.session.user) {
      const userDN = req.header('X-Forwarded-User');
      try {
        const res = await ldapSearch(client, userDN, searchOptions);
        if (res.length === 0) {
          throw new Error('No user found');
        }
        if (res.length > 1) {
          throw new Error('Multiple users detected');
        }

        let memberOf: string[] = [];
        if (typeof res[0].memberOf === 'string') {
          memberOf = [res[0].memberOf];
        }
        else if (Array.isArray(res[0].memberOf)) {
          memberOf = res[0].memberOf;
        }

        req.session.user = {
          cn: res[0].cn,
          memberOf: memberOf,
        };
      }
      catch (err) {
        console.error(err);
        res.status(403);
        res.send();
        return;
      }
    }
    req.user = req.session.user;
    next();
  });
}

async function ldapSearch(client: LdapJS.Client, dn: string, options: LdapJS.SearchOptions) {
  return new Promise<any>((resolve, reject) => {
    const results = [] as any[];

    client.search(dn, options, (err, res) => {
      res.on('searchEntry', function (entry) {
        results.push(entry.object);
      });
      res.on('end', function (result) {
        resolve(results);
      });
      res.on('error', reject);
    });
  });
}