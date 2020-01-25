import Express = require('express');
import passport = require('passport');
import LdapStrategy = require('passport-ldapauth');
import basicAuth = require('basic-auth');
import { Request } from './express_helpers';

import { env } from './env_vars';

export default function (app: Express.Application) {
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
