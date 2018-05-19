import Express = require('express');
import ExpressWs = require('express-ws');
import os = require('os');
import path = require('path');
import session = require('express-session');

import { env } from './env_vars';

import index from './controllers/index';
import ping from './controllers/ping';
import getTaskId from './controllers/get_task_id';
import { connectTerminal, requestTerminal, resizeTerminal } from './controllers/terminal';

import { setup, getOwnersByTaskId, getOwnersByPid } from './express_helpers';
import { isUserAllowedToDebug, wsIsUserAllowedToDebug } from './authorizations';
import authentication from './authentication';

const app = Express();
const expressWs = ExpressWs(app);

setup(app);
app.use('/static', Express.static(__dirname + '/public_html'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));
app.use(session({
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
}));

if (env.AUTHORIZATIONS_ENABLED) {
  authentication(app);
}

// ROUTES

app.get('/', index);
app.get('/ping', ping);
app.get('/:task_id', getTaskId);

app.post('/terminals/:task_id', isUserAllowedToDebug, requestTerminal);
app.post('/terminals/:pid/size', isUserAllowedToDebug, resizeTerminal);
(app as any).ws('/terminals/:pid', wsIsUserAllowedToDebug, connectTerminal);

// Start server

const port: number = Number(process.env.PORT) || 3000;
const host: string = (os.platform() === 'win32')
  ? '127.0.0.1'
  : '0.0.0.0';

app.listen(port, host, function() {
  console.log('App listening to http://' + host + ':' + port);
});
