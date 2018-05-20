(function terminal() {
  var term,
      protocol,
      socketURL,
      socket,
      pid;
  
  function resize() {
    term.fit();
    const terminal = $('.terminal');
    statusBarHeight = parseInt($(window).height() - terminal.height() - 2);
    $('.status-bar').css('height', statusBarHeight);
    $('.status-bar div').css('height', statusBarHeight);
    $('.status-bar div span').css('height', statusBarHeight);
  }
  
  function createTerminal(terminalContainer, task_id) {
    while (terminalContainer.children.length) {
      terminalContainer.removeChild(terminalContainer.children[0]);
    }
    term = new Terminal();
    protocol = (location.protocol === 'https:') ? 'wss://' : 'ws://';
    socketURL = protocol + location.hostname + ((location.port) ? (':' + location.port) : '') + '/terminals/';
  
    term.open(terminalContainer, true);
    resize();

    var initialGeometry = term.proposeGeometry(),
        cols = initialGeometry.cols,
        rows = initialGeometry.rows;
  
    $.post('/terminals/' + task_id)
      .done(function (pid) {
        window.pid = pid;
        socketURL += pid;
        socket = new WebSocket(socketURL);
        socket.onopen = runRealTerminal;
        socket.onclose = onSocketClose;
        socket.onerror = onSocketError;
      });
  }

  function onSocketClose() {
    $('.connection-closed-splash').show();
  }

  function onSocketError() {
    $('.connection-closed-splash').show();
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
    createTerminal(terminalContainer, taskId);
    $(window).resize(resize);
  });
})()
