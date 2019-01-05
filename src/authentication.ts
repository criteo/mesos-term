import Express = require('express');
import passport = require('passport');
import LdapStrategy = require('passport-ldapauth');
import basicAuth = require('basic-auth');

import { env } from './env_vars';

function protectWithBasicAuth(
  req: Express.Request,
  res: Express.Response,
  next: Express.NextFunction) {

  const credentials = basicAuth(req);
  if (credentials) {
    next();
  }
  else {
    res.status(401);
    res.header('WWW-Authenticate', 'Basic realm="must be authenticated"');
    res.send('Unauthenticated');
  }
}


export default function(app: Express.Application) {
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

  passport.serializeUser(function(user: string, done: (err: Error, user: string) => void) {
    done(undefined, user);
  });

  passport.deserializeUser(function(user: string, done: (err: Error, user: string) => void) {
    done(undefined, user);
  });

  app.use(passport.initialize());
  app.use(protectWithBasicAuth);
  app.use((req, res, next) => {
    passport.authenticate('ldapauth', {session: true}, (err: Error, user: any, info: any) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        res.status(401);
        res.header('WWW-Authenticate', 'Basic realm="must be authenticated"');
        res.send('Unauthenticated');
        return;
      }

      req.user = user;
      next();
    })(req, res, next);
  });

  passport.use(new LdapStrategy(options));
}
