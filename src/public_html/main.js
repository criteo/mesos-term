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
    $('.status-bar .bar-item').css('height', statusBarHeight);
    $('.status-bar .bar-item span').css('height', statusBarHeight);
    resizeTerminal();
  }

  function resizeTerminal(fn) {
    if (!window.pid || !term) return;

    var initialGeometry = term.proposeGeometry(),
        cols = initialGeometry.cols,
        rows = initialGeometry.rows;
    $.ajax({
        url: `/terminals/${window.pid}/size?cols=${cols}&rows=${rows}`,
        method: 'POST',
        xhrFields: {
          withCredentials: true
        }
      })
      .done(() => {
        console.log(`Resized to ${cols}x${rows}`);
        if(fn) fn();
      });
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

    $.ajax({
        url: `/terminals/${task_id}`,
        method: 'POST',
        xhrFields: {
          withCredentials: true
        }
      })
      .done(function (pid) {
        window.pid = pid;
        socketURL += pid;
        socket = new WebSocket(socketURL);
        socket.onopen = runRealTerminal;
        socket.onclose = onSocketClose;
        socket.onerror = onSocketError;
        resizeTerminal();
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

  function clipboard() {
    $('.copy-btn').mousedown(function() {
      $(this).addClass('click');
    });
    $('.copy-btn').mouseup(function() {
      const that = this;
      setTimeout(function() {
        $(that).removeClass('click');
      }, 200);
    });
  }

  $(document).ready(function() {
    var terminalContainer = $('#terminal-container').get(0);
    const taskId = terminalContainer.getAttribute('data-taskid');
    console.log(taskId);
    createTerminal(terminalContainer, taskId);
    $(window).resize(resize);
    new ClipboardJS('.copy-btn');
    clipboard(); 
  });
})()
