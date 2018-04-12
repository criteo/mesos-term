var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);
var os = require('os');
var pty = require('node-pty');
var path = require('path');
var passport = require('passport');
var LdapStrategy = require('passport-ldapauth');
var basicAuth = require('basic-auth');
var session = require('express-session')
var exec = require('child_process').exec;
var terminals = {};
var logs = {};
var ownersByTaskId = {};
var ownersByPid = {};

var DEBUG_ALLOWED_TO_KEY = 'DEBUG_ALLOWED_TO';
var MESOS_TASK_EXEC_DIR = getOrExit('MESOS_TASK_EXEC_DIR');
var SESSION_SECRET = getOrExit('SESSION_SECRET');
var LDAP_URL = getOrExit('LDAP_URL');
var LDAP_BASE_DN = getOrExit('LDAP_BASE_DN');
var LDAP_USER = getOrExit('LDAP_USER');
var LDAP_PASSWORD = getOrExit('LDAP_PASSWORD');
var ADMINS = process.env['ADMINS'] || ''

function getOrExit(var_name) {
  var v = process.env[var_name];
  if(v) return v;
 
  console.log(`${var_name} env var must be provided`);
  process.exit(1);
}

function protectWithBasicAuth(req, res, next) {
  var credentials = basicAuth(req);
  if(credentials) {
    next()
  }
  else {
    res.status(401);
    res.header('WWW-Authenticate', 'Basic realm="must be authenticated"');
    res.send('Unauthorized');
  }
}

function intersection(array1, array2) {
  return array1.filter(function(n) {
    return array2.indexOf(n) !== -1;
  });
}

function isUserAllowedToDebug(req, res, next) {
  const admins = (ADMINS != '') ? ADMINS.split(',') : [];
  let allowed = [];
  if(req.params.task_id) {
    allowed = admins.concat(ownersByTaskId[req.params.task_id]);
  } else {
    allowed = admins.concat(ownersByPid[req.params.pid]);
  }

  const groups = req.user.memberOf.map(m => m.match(/^CN=([a-zA-Z0-9_-]+)/m)[1]);
  const userCN = req.user.cn;
  if((groups && intersection(groups, allowed).length > 0) ||
     intersection([req.user.cn], allowed).length > 0)
    next();
  else {
    console.error('User "%s" is not in authorized to debug', req.user.cn);
    res.status(403);
    res.send('Unauthorized');
  }
}

function getTaskLabels(taskId, fn) {
  exec(`python3 ${MESOS_TASK_EXEC_DIR}/get_task_info.py ${taskId}`,
    function(err, stdout, stderr) {
    if(err) {
      fn(err);
      return;
    }
    const info = JSON.parse(stdout);
    const labels = ('labels' in info) ? info['labels'] : [];
    const labelsDict = {}
    for(var i = 0; i < labels.length; ++i) {
      labelsDict[labels[i]['key']] = labels[i]['value'];
    }
    fn(undefined, labelsDict);
  });
}


var OPTS = {
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
app.use('/static', express.static(__dirname + '/public_html'));
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

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

app.get('/', function(req, res) {
  res.send('Please provide a task ID like /mytask-id');
});

app.get('/ping', function(req, res) {
  res.send('pong');
});

app.get('/:task_id', function(req, res) {
  if(req.url == '/favicon.ico') {
    res.status(404);
    return;
  }

  const task_id = req.params.task_id;
  getTaskLabels(task_id, function(err, labels) {
    if(err) {
      res.send('Internal error');
      console.error('Error while retrieving task labels %s', err);
      next();
      return;
    }
    if(DEBUG_ALLOWED_TO_KEY in labels) {
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

app.post('/terminals/:task_id', isUserAllowedToDebug, function(req, res) {
  const task_id = req.params.task_id;
  if(!task_id) {
    res.send('You must provide a valid task id.');
    return;
  }

  const term = pty.spawn('python3',
    [MESOS_TASK_EXEC_DIR + '/exec.py', task_id], {
    name: 'mesos-task-exec',
    cwd: process.env.PWD,
    env: process.env
  });

  console.log('User "%s" has opened a session in container "%s" (pid=%s)', req.user.cn, task_id, term.pid);
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
  var pid = parseInt(req.params.pid),
      cols = parseInt(req.query.cols),
      rows = parseInt(req.query.rows),
      term = terminals[pid];

  term.resize(cols, rows);
  console.log('Resized terminal ' + pid + ' to ' + cols + ' cols and ' + rows + ' rows.');
  res.end();
});

function wsIsUserAllowedToDebug(ws, req, next) {
  isUserAllowedToDebug(req, undefined, next);
}

app.ws('/terminals/:pid', wsIsUserAllowedToDebug, function (ws, req) {
  var term = terminals[parseInt(req.params.pid)];
  console.log('User "%s" is connected to terminal %s', req.user.cn, term.pid);
  ws.send(logs[term.pid]);

  term.on('data', function(data) {
    try {
      ws.send(data);
    } catch (ex) {
      // The WebSocket is not open, ignore
    }
  });
  ws.on('message', function(msg) {
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

var port = process.env.PORT || 3000,
    host = os.platform() === 'win32' ? '127.0.0.1' : '0.0.0.0';

console.log('App listening to http://' + host + ':' + port);
app.listen(port, host);
