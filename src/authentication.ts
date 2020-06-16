import Express = require('express');
import passport = require('passport');
import LdapStrategy = require('passport-ldapauth');
import basicAuth = require('basic-auth');
import { Request } from './express_helpers';

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
    // If user already has user account details, it means it has already been authenticated
    // and we don't need to do it again. We rather skip to the next middleware.
    if (req.session.user) {
      req.user = req.session.user;
      next();
      return;
    }

    passport.authenticate('ldapauth', { session: true }, (err: Error, user: any, info: any) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        console.log(`ldap auth for ${req.method} ${req.path}`);
        res.status(401);
        res.header('WWW-Authenticate', 'Basic realm="mesos-term"');
        res.send('Unauthenticated');
        return;
      }

      // save the user into the session.
      req.session.user = user;
      // And make it available in the request for the following middlewares.
      req.user = req.session.user;
      next();
    })(req, res, next);
  });

  passport.use(new LdapStrategy(options));
}
