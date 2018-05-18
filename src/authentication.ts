import Express = require('express');
import passport = require('passport');
import LdapStrategy = require('passport-ldapauth');
import basicAuth = require('basic-auth');

import { ADMINS, LDAP_URL, LDAP_USER, LDAP_PASSWORD, LDAP_BASE_DN } from './env_vars';

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
    res.send('Unauthorized');
  }
}


export default function(app: Express.Application) {
  const OPTS = {
    server: {
      url: LDAP_URL,
      bindDN: LDAP_USER,
      bindCredentials: LDAP_PASSWORD,
      searchBase: LDAP_BASE_DN,
      searchFilter: '(&(cn={{username}})(objectClass=user))'
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
  app.use(passport.authenticate('ldapauth', {session: true}));

  passport.use(new LdapStrategy(OPTS));
}
