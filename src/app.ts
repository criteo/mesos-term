import Express = require('express');
import ExpressWs = require('express-ws');
import os = require('os');
import path = require('path');
import session = require('express-session');

import { env } from './env_vars';

import index from './controllers/index';
import ping from './controllers/ping';
import GetTaskId = require('./controllers/get_task_id');
import { connectTerminal, requestTerminal, resizeTerminal } from './controllers/terminal';

import { setup, getOwnersByTaskId, getOwnersByPid } from './express_helpers';
import { isUserAllowedToDebug, wsIsUserAllowedToDebug } from './authorizations';
import authentication from './authentication';
import { AuthenticatedLogger, AnonymousLogger } from './logger';

const app = Express();
const expressWs = ExpressWs(app);

app.use('/static', Express.static(__dirname + '/public_html'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));
app.use(session({
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
}));

if (env.AUTHORIZATIONS_ENABLED) {
  console.log('Authorizations are enabled.');
  setup(app, new AuthenticatedLogger());
  authentication(app);

  app.get('/:task_id', GetTaskId.authenticated);
  app.post('/terminals/:task_id', isUserAllowedToDebug, requestTerminal);
  app.post('/terminals/:pid/size', isUserAllowedToDebug, resizeTerminal);
  (app as any).ws('/terminals/:pid', wsIsUserAllowedToDebug, connectTerminal);
}
else {
  console.log('Authorizations are disabled.');
  setup(app, new AnonymousLogger());

  app.get('/:task_id', GetTaskId.anonymous);
  app.post('/terminals/:task_id', requestTerminal);
  app.post('/terminals/:pid/size', resizeTerminal);
  (app as any).ws('/terminals/:pid', connectTerminal);
}

app.get('/', index);
app.get('/ping', ping);


// Start server

const port: number = Number(process.env.PORT) || 3000;
const host: string = (os.platform() === 'win32')
  ? '127.0.0.1'
  : '0.0.0.0';

app.listen(port, host, function() {
  console.log('App listening to http://' + host + ':' + port);
});
