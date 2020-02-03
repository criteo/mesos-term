import Express = require('express');
import ExpressWs = require('express-ws');
import os = require('os');
import path = require('path');
import session = require('express-session');
import BodyParser = require('body-parser');

import { env } from './env_vars';

import ping from './controllers/ping';
import TerminalController from './controllers/terminal';
import { DelegateGet, DelegatePost } from './controllers/delegate';
import config from './controllers/config';
import sandbox from './controllers/sandbox';

import { setup, SuperAdminsOnly } from './express_helpers';
<<<<<<< HEAD
import { BasicAuth } from './authentication';
=======
import { BasicAuth, OAuth2 } from './authentication';
>>>>>>> ebd02d2... Add OAuth2 support.
import { AuthenticatedLogger, AnonymousLogger } from './logger';

const app = Express();
const expressWs = ExpressWs(app);

console.log(`Cookie max age is set to ${env.SESSION_MAX_AGE_SECONDS} seconds`);
const sessionOptions: session.SessionOptions = {
  name: 'mesos-term',
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: env.SESSION_MAX_AGE_SECONDS * 1000,
  },
};

if (app.get('env') === 'production') {
  app.set('trust proxy', 1);
  sessionOptions.cookie.secure = true;
}

app.use(session(sessionOptions));
<<<<<<< HEAD

=======
>>>>>>> ebd02d2... Add OAuth2 support.

if (env.AUTHORIZATIONS_ENABLED) {
  setup(app, new AuthenticatedLogger());
<<<<<<< HEAD
  BasicAuth(app);
=======
  if (env.OAUTH2_AUTHORIZATION_URL) {
    console.log('OAuth2 authentication is enabled.');
    OAuth2(app);
  }
  else {
    console.log('Basic authentication is enabled.');
    BasicAuth(app);
  }
>>>>>>> ebd02d2... Add OAuth2 support.
}
else {
  console.log('Authorizations are disabled.');
  setup(app, new AnonymousLogger());
}

app.use('/', Express.static(__dirname + '/public_html'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));
app.use(BodyParser.json());

app.get('/ping', ping);
TerminalController(app);
sandbox(app);

app.get('/api/config', config);

if (env.AUTHORIZATIONS_ENABLED && env.ENABLE_RIGHTS_DELEGATION) {
  app.get('/api/delegate', SuperAdminsOnly, DelegateGet);
  app.post('/api/delegate', SuperAdminsOnly, DelegatePost);
}

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname + '/public_html/index.html'));
});

// Start server
const port: number = Number(process.env.PORT) || 3000;
const host: string = (os.platform() === 'win32')
  ? '127.0.0.1'
  : process.env.HOST || '0.0.0.0';

app.listen(port, host, function () {
  console.log('App listening to http://' + host + ':' + port);
});
