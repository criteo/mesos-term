import Express = require('express');
import ExpressWs = require('express-ws');
import os = require('os');
import NodePty = require('node-pty');
import path = require('path');
import passport = require('passport');
import LdapStrategy = require('passport-ldapauth');
import basicAuth = require('basic-auth');
import session = require('express-session');
import child_process = require('child_process');
import * as Ws from 'ws';

type MesosLabels = {[key: string]: { key: string, value: string }};
type Labels = {[key: string]: string};
type Owner = string;

const app = Express();
const expressWs = ExpressWs(app);
const terminals: {[pid: number]: NodePty.IPty /* NodePty.Terminal (not exposed) */} = {};
const logs: {[pid: number]: string} = {};
const ownersByTaskId: {[taskId: string]: Owner[]} = {};
const ownersByPid: {[taskId: string]: Owner[]} = {};

const DEBUG_ALLOWED_TO_KEY = 'DEBUG_GRANTED_TO';
const MESOS_TASK_EXEC_DIR = getOrExit('MESOS_TASK_EXEC_DIR');
const SESSION_SECRET = getOrExit('SESSION_SECRET');
const LDAP_URL = getOrExit('LDAP_URL');
const LDAP_BASE_DN = getOrExit('LDAP_BASE_DN');
const LDAP_USER = getOrExit('LDAP_USER');
const LDAP_PASSWORD = getOrExit('LDAP_PASSWORD');
const ADMINS = process.env['ADMINS'] || '';


function getOrExit(var_name: string) {
  const v = process.env[var_name];
  if (v) return v;

  console.log(`${var_name} env const must be provided`);
  process.exit(1);
}

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

function intersection(array1: string[], array2: string[]) {
  return array1.filter(function(n) {
    return array2.indexOf(n) !== -1;
  });
}

function isUserAllowedToDebug(
  req: Express.Request,
  res: Express.Response,
  next: Express.NextFunction) {

  const admins = (ADMINS != '') ? ADMINS.split(',') : [];
  const allowed = (req.params.task_id)
    ? admins.concat(ownersByTaskId[req.params.task_id])
    : admins.concat(ownersByPid[req.params.pid]);

  const groups = req.user.memberOf.map((m: string) => m.match(/^CN=([a-zA-Z0-9_-]+)/m)[1]);
  const userCN = req.user.cn;

  if ((groups && intersection(groups, allowed).length > 0) ||
     intersection([req.user.cn], allowed).length > 0)
    next();
  else {
    console.error('User "%s" is not in authorized to debug', req.user.cn);
    res.status(403);
    res.send('Unauthorized');
  }
}

function getTaskLabels(
  taskId: string,
  fn: (err: Error, labels?: Labels) => void) {

  child_process.exec(`python3 ${MESOS_TASK_EXEC_DIR}/get_task_info.py ${taskId}`,
    function(err, stdout, stderr) {
    if (err) {
      fn(err);
      return;
    }
    const info = JSON.parse(stdout);
    const labels = ('labels' in info) ? info['labels'] : [];
    const labelsDict: Labels = {};
    for (let i = 0; i < labels.length; ++i) {
      labelsDict[labels[i]['key']] = labels[i]['value'];
    }
    fn(undefined, labelsDict);
  });
}


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


passport.use(new LdapStrategy(OPTS));
app.use('/static', Express.static(__dirname + '/public_html'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));
app.use(passport.initialize());
app.use(protectWithBasicAuth);
app.use(passport.authenticate('ldapauth', {session: true}));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
}));

passport.serializeUser(function(user: string, done: (err: Error, user: string) => void) {
  done(undefined, user);
});

passport.deserializeUser(function(user: string, done: (err: Error, user: string) => void) {
  done(undefined, user);
});

app.get('/', function(req: Express.Request, res: Express.Response) {
  res.send('Please provide a task ID like /mytask-id');
});

app.get('/ping', function(req: Express.Request, res: Express.Response) {
  res.send('pong');
});

app.get('/:task_id', function(req: Express.Request, res: Express.Response) {
  if (req.url == '/favicon.ico') {
    res.status(404);
    return;
  }

  const task_id = req.params.task_id;
  getTaskLabels(task_id, function(err, labels) {
    if (err) {
      res.send('Internal error');
      console.error('Error while retrieving task labels %s', err);
      return;
    }
    if (DEBUG_ALLOWED_TO_KEY in labels) {
      ownersByTaskId[task_id] = labels[DEBUG_ALLOWED_TO_KEY].split(',');
    }
    isUserAllowedToDebug(req, res, function() {
      console.log('User "%s" has requested a session in container "%s"',
        req.user.cn, task_id);
      res.render('index', {
        task_id: task_id
      });
    });
  });
});

app.post(
  '/terminals/:task_id',
  isUserAllowedToDebug,
  function(req: Express.Request, res: Express.Response) {

  const task_id = req.params.task_id;
  if (!task_id) {
    res.send('You must provide a valid task id.');
    return;
  }

  const term = NodePty.spawn('python3',
    [MESOS_TASK_EXEC_DIR + '/exec.py', task_id], {
    name: 'mesos-task-exec',
    cwd: process.env.PWD,
    env: process.env
  });

  console.log('User "%s" has opened a session in container "%s" (pid=%s)',
    req.user.cn, task_id, term.pid);
  terminals[term.pid] = term;
  logs[term.pid] = '';
  ownersByPid[term.pid] = ownersByTaskId[task_id];
  term.on('data', function(data) {
    logs[term.pid] += data;
  });
  res.send(term.pid.toString());
  res.end();
});

app.post('/terminals/:pid/size', isUserAllowedToDebug, function (req, res) {
  const pid = parseInt(req.params.pid),
      cols = parseInt(req.query.cols),
      rows = parseInt(req.query.rows),
      term = terminals[pid];

  term.resize(cols, rows);
  console.log('Resized terminal ' + pid + ' to ' + cols + ' cols and ' + rows + ' rows.');
  res.end();
});

function wsIsUserAllowedToDebug(ws: Ws, req: Express.Request, next: Express.NextFunction) {
  isUserAllowedToDebug(req, undefined, next);
}

const routerWs = Express.Router() as ExpressWs.Router;
routerWs.ws('/terminals/:pid', wsIsUserAllowedToDebug, function (ws, req) {
  const term = terminals[parseInt(req.params.pid)];
  console.log('User "%s" is connected to terminal %s', req.user.cn, term.pid);
  ws.send(logs[term.pid]);

  term.on('data', function(data) {
    try {
      ws.send(data);
    }
    catch (ex) {
      // The WebSocket is not open, ignore
    }
  });
  ws.on('message', function(msg: string) {
    term.write(msg);
  });
  ws.on('close', function () {
    term.kill();
    console.log('User "%s" is diconnected from terminal %s', req.user.cn, term.pid);
    // Clean things up
    delete terminals[term.pid];
    delete logs[term.pid];
  });
});

const port: number = Number(process.env.PORT) || 3000;
const host: string = (os.platform() === 'win32')
  ? '127.0.0.1'
  : '0.0.0.0';

app.listen(port, host, function() {
  console.log('App listening to http://' + host + ':' + port);
});
