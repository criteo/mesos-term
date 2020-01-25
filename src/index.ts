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

import { setup, SuperAdminsOnly } from './express_helpers';
import authentication from './authentication';
import { AuthenticatedLogger, AnonymousLogger } from './logger';
import { setupAutoFetch } from './mesos';

const app = Express();
const expressWs = ExpressWs(app);

const sessionOptions: session.SessionOptions = {
  name: 'mesos-term',
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
};

if (app.get('env') === 'production') {
  app.set('trust proxy', 1);
  sessionOptions.cookie.secure = true;
}

app.use('/', Express.static(__dirname + '/public_html'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));
app.use(session(sessionOptions));
app.use(BodyParser.json());

setupAutoFetch(env.MESOS_MASTER_URL, env.MESOS_STATE_CACHE_TIME);

if (env.AUTHORIZATIONS_ENABLED) {
  console.log('Authorizations are enabled.');
  setup(app, new AuthenticatedLogger());
  authentication(app);
}
else {
  console.log('Authorizations are disabled.');
  setup(app, new AnonymousLogger());
}

app.get('/ping', ping);
TerminalController(app);

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
  : '0.0.0.0';

app.listen(port, host, function () {
  console.log('App listening to http://' + host + ':' + port);
});
