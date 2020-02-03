import Express = require('express');
import passport = require('passport');
import LdapStrategy = require('passport-ldapauth');
import basicAuth = require('basic-auth');
import { Request } from './express_helpers';
<<<<<<< HEAD
=======
import * as LdapJS from 'ldapjs';
import * as OAuth2Strategy from 'passport-oauth2';
import Axios from 'axios';
>>>>>>> ebd02d2... Add OAuth2 support.

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
<<<<<<< HEAD
=======

export function OAuth2(app: Express.Application) {
  app.use(passport.initialize());

  const strategy = new OAuth2Strategy({
    authorizationURL: env.OAUTH2_AUTHORIZATION_URL,
    tokenURL: env.OAUTH2_ACCESS_TOKEN_URL,
    clientID: env.OAUTH2_CLIENT_ID,
    clientSecret: env.OAUTH2_CLIENT_SECRET,
    callbackURL: '/oauth2/callback',
  },
    async function (accessToken: string, refreshToken: string, profile: any, details: any, cb: (err: Error, user: any) => void) {
      // TODO(c.michaud): use refresh token to invalidate users faster.
      Axios.get(env.OAUTH2_TOKEN_INFO_URL, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      }).then((res) => {
        return cb(undefined, res.data);
      }, (err) => {
        return cb(err, undefined);
      });
    }
  );

  // Gets redirected here if authenticated session cookie is missing.
  app.get('/oauth2', passport.authenticate('oauth2', {
    failureRedirect: env.OAUTH2_FAILURE_REDIRECT_URL
  }));

  // Gets redirected here if authentication has been done successfully.
  app.get('/oauth2/callback', (req, res, next) => {
    passport.authenticate('oauth2', (err: Error, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      // TODO(c.michaud): customize the attribute identifying the user.
      retrieveGroups(user.uid).then(u => {
        req.session.user = u;
        if (req.session.redirectionURL) {
          res.redirect(req.session.redirectionURL);
        }
        else {
          res.redirect('/');
        }
      }, (err) => {
        console.error(err);
        res.status(503);
        res.send();
      });
    })(req, res, next);
  });

  app.use((req: Request, res, next) => {
    if (!req.session || !req.session.user) {
      // store the redirection url in order to redirect the user back
      // to where she was upon successful authentication.
      req.session.redirectionURL = req.path;
      res.redirect('/oauth2');
      return;
    }
    req.user = req.session.user;
    return next();
  });

  passport.use(strategy);
}

async function retrieveGroups(userCN: string) {
  const client = LdapJS.createClient({
    url: env.LDAP_URL,
    bindDN: env.LDAP_USER,
    bindCredentials: env.LDAP_PASSWORD,
    reconnect: true,
  });

  const searchOptions: LdapJS.SearchOptions = {
    filter: `(cn=${userCN})`,
    scope: 'sub',
    attributes: ['memberof', 'cn'],
  };
  const res = await ldapSearch(client, env.LDAP_BASE_DN, searchOptions);
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

  return {
    cn: res[0].cn,
    memberOf: memberOf,
  };
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
>>>>>>> ebd02d2... Add OAuth2 support.
