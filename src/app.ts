import Express = require('express');
import ExpressWs = require('express-ws');
import os = require('os');
import path = require('path');
import session = require('express-session');

import { env } from './env_vars';

import index from './controllers/index';
import ping from './controllers/ping';
import GetTaskId from './controllers/get_task_id';
import TerminalController from './controllers/terminal';

import { setup } from './express_helpers';
import authentication from './authentication';
import { AuthenticatedLogger, AnonymousLogger } from './logger';

const app = Express();
const expressWs = ExpressWs(app);

const sessionOptions = {
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
};

if (app.get('env') === 'production') {
  app.set('trust proxy', 1);
  sessionOptions.cookie.secure = true;
}

app.use('/static', Express.static(__dirname + '/public_html'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));
app.use(session(sessionOptions));

if (env.AUTHORIZATIONS_ENABLED) {
  console.log('Authorizations are enabled.');
  setup(app, new AuthenticatedLogger());
  authentication(app);
}
else {
  console.log('Authorizations are disabled.');
  setup(app, new AnonymousLogger());
}

app.get('/', index);
app.get('/ping', ping);
app.get('/:task_id', GetTaskId);
TerminalController(app, env.AUTHORIZATIONS_ENABLED);


// Start server

const port: number = Number(process.env.PORT) || 3000;
const host: string = (os.platform() === 'win32')
  ? '127.0.0.1'
  : '0.0.0.0';

app.listen(port, host, function() {
  console.log('App listening to http://' + host + ':' + port);
});
