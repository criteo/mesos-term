(function terminal() {
  var term,
      protocol,
      socketURL,
      socket,
      pid;
  
  
  function createTerminal(terminalContainer, task_id) {
    while (terminalContainer.children.length) {
      terminalContainer.removeChild(terminalContainer.children[0]);
    }
    term = new Terminal();
    protocol = (location.protocol === 'https:') ? 'wss://' : 'ws://';
    socketURL = protocol + location.hostname + ((location.port) ? (':' + location.port) : '') + '/terminals/';
  
    term.open(terminalContainer, true);
    term.fit();
  
    var initialGeometry = term.proposeGeometry(),
        cols = initialGeometry.cols,
        rows = initialGeometry.rows;
  
    fetch('/terminals/' + task_id, {method: 'POST'}).then(function (res) {
      res.text().then(function (pid) {
        window.pid = pid;
        socketURL += pid;
        socket = new WebSocket(socketURL);
        socket.onopen = runRealTerminal;
        // socket.onclose = runFakeTerminal;
        // socket.onerror = runFakeTerminal;
      });
    });
  }
  
  function runRealTerminal() {
    var timerId = 0; 
    function keepAlive() { 
        var timeout = 20000;  
        if (socket.readyState == socket.OPEN) {  
            socket.send('');  
        }  
        timerId = setTimeout(keepAlive, timeout);  
    }  
    keepAlive();
    term.attach(socket);
    term._initialized = true;
  }

  $(document).ready(function() {
    var terminalContainer = $('#terminal-container').get(0);
    const taskId = terminalContainer.getAttribute('data-taskid');
    const container = $('#terminal-container').parent();
    $('#terminal-container').css('height', parseInt(container.height()) - 105);
    createTerminal(terminalContainer, taskId);
  });
})()
