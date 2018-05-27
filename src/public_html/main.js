(function terminal() {
  var term,
      protocol,
      socketURL,
      socket,
      token;
  
  function resize() {
    term.fit();
    const terminal = $('.terminal');
    statusBarHeight = parseInt($(window).height() - terminal.height() - 2);
    $('.status-bar').css('height', statusBarHeight);
    $('.status-bar .bar-item').css('height', statusBarHeight);
    $('.status-bar .bar-item span').css('height', statusBarHeight);
  }

  function resizeTerminal() {
    if (!window.token || !term) return;

    const initialGeometry = term.proposeGeometry();
    const cols = initialGeometry.cols;
    const rows = initialGeometry.rows;

    $.ajax({
        url: `/terminals/resize?cols=${cols}&rows=${rows}&token=${window.token}`,
        method: 'POST',
        xhrFields: {
          withCredentials: true
        }
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
        throwError(jqXHR.responseText);
      });
  }
  
  function createTerminal(terminalContainer, taskId) {
    while (terminalContainer.children.length) {
      terminalContainer.removeChild(terminalContainer.children[0]);
    }
    term = new Terminal();
    protocol = (location.protocol === 'https:') ? 'wss://' : 'ws://';
    socketURL = protocol + location.hostname + ((location.port) ? (':' + location.port) : '') + '/terminals/ws?token=';
  
    term.open(terminalContainer, true);
    resize();

    $.ajax({
        url: `/terminals/create/${taskId}`,
        method: 'POST',
        xhrFields: {
          withCredentials: true
        }
      })
      .done(function (data) {
        setTimeout(function() {
          window.token = data.token;
          socketURL += window.token;
          socket = new WebSocket(socketURL);
          socket.onopen = runRealTerminal(data);
          socket.onclose = onSocketClose;
          socket.onerror = onSocketError;
        }, 800);
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
        throwError(jqXHR.responseText);
      });
  }

  function throwError(error) {
    $('.progress-spin').css({ display: 'none' });
    $('.error-splash .error').text(error);
    $('.error-splash').show();
    showStatusBar(false);
  }

  function onSocketClose() {
    throwError('Connection has been closed. The container probably stopped...');
  }

  function onSocketError(err) {
    throwError(`Error with websocket: ${err.message}`);
  }

  function showStatusBar(showContent) {
    // display the status bar
    $('.status-bar').removeClass('hidden');

    // slide up th status bar.
    $('.status-bar').animate({bottom: '0px'}, 'slow');
    if (showContent) {
      $('.status-bar .left-bar-content').show();
    }
  }

  function fillTaskInfo(task, master_url) {
    // fill missing fields
    $('.hostname .content').text(task.slave_hostname);
    $('.user .content').text(task.user);
    $('.task_id a').attr('href', 
      `${master_url}/#/agents/${task.slave_id}/frameworks/${task.framework_id}/executors/${task.task_id}`);

    showStatusBar(true);

    // Reduce opacity of Mesos logo to make it a watermark
    $('.background-watermark').css({opacity: '1'}).animate({opacity: '0.3'}, 'slow');

    // hide the progress spin progressively.
    $('.progress-spin').css({opacity: '1'}).animate({opacity: '0'}, 'slow', function() {
      $('.progress-spin').css({ display: 'none' });
    });
  }
  
  function runRealTerminal(data) {
    return function() {
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
      fillTaskInfo(data.task, data.master_url);
      // resizeTerminal();
    };
  }

  function clipboard() {
    new ClipboardJS('.copy-btn');
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
    const terminalContainer = $('#terminal-container').get(0);
    const taskId = terminalContainer.getAttribute('data-taskid');
    createTerminal(terminalContainer, taskId);
    $(window).resize(resize);
    clipboard(); 
  });
})()
