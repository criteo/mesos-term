var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);
var os = require('os');
var pty = require('node-pty');
var path = require('path');

var terminals = {},
    logs = {};

var mesosTaskExecPath = process.env['MESOS_TASK_EXEC_PATH']

app.use(express.static(__dirname + '/public_html'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));

app.get('/:task_id', function(req, res) {
  const task_id = req.params.task_id;
  res.render('index', {
    task_id: task_id
  });
});

app.post('/terminals/:task_id', function (req, res) {
  const task_id = req.params.task_id;
  if(!task_id) {
    res.send('You must provide a valid task id.');
    return;
  }
  const term = pty.spawn('python3', [mesosTaskExecPath, task_id], {
        name: 'mesos-task-exec',
        cwd: process.env.PWD,
        env: process.env
      });

  console.log('Created terminal with PID: ' + term.pid);
  terminals[term.pid] = term;
  logs[term.pid] = '';
  term.on('data', function(data) {
    logs[term.pid] += data;
  });
  res.send(term.pid.toString());
  res.end();
});

app.post('/terminals/:pid/size', function (req, res) {
  var pid = parseInt(req.params.pid),
      cols = parseInt(req.query.cols),
      rows = parseInt(req.query.rows),
      term = terminals[pid];

  term.resize(cols, rows);
  console.log('Resized terminal ' + pid + ' to ' + cols + ' cols and ' + rows + ' rows.');
  res.end();
});

app.ws('/terminals/:pid', function (ws, req) {
  var term = terminals[parseInt(req.params.pid)];
  console.log('Connected to terminal ' + term.pid);
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
    console.log('Closed terminal ' + term.pid);
    // Clean things up
    delete terminals[term.pid];
    delete logs[term.pid];
  });
});

var port = process.env.PORT || 3000,
    host = os.platform() === 'win32' ? '127.0.0.1' : '0.0.0.0';

console.log('App listening to http://' + host + ':' + port);
app.listen(port, host);
