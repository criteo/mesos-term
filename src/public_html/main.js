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
    if (!window.token) return;

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
  
  function createTerminal(terminalContainer, taskId, accessToken) {
    while (terminalContainer.children.length) {
      terminalContainer.removeChild(terminalContainer.children[0]);
    }
    Terminal.applyAddon(attach);
    Terminal.applyAddon(fit);
    term = new Terminal();
    protocol = (location.protocol === 'https:') ? 'wss://' : 'ws://';
    socketURL = protocol + location.hostname + ((location.port) ? (':' + location.port) : '') + '/terminals/ws?token=';

    term.open(terminalContainer, true);
    resize();

    const initialGeometry = term.proposeGeometry();
    const cols = initialGeometry.cols;
    const rows = initialGeometry.rows;

    let url = `/terminals/create/${taskId}?`;
    if(accessToken) {
      url += `&access_token=${accessToken}`;
    }

    $.ajax({
        url: url, 
        method: 'POST',
        xhrFields: {
          withCredentials: true
        }
      })
      .done(function (data) {
        window.token = data.token;
        setTimeout(function() {
          resizeTerminal();
          setTimeout(function() {
            socketURL += window.token;
            socket = new WebSocket(socketURL);
            socket.onopen = runRealTerminal(data);
            socket.onclose = onSocketClose;
            socket.onerror = onSocketError;
          }, 200);
        }, 100);
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
        if(jqXHR.responseText.indexOf('Unauthorized access to container.') > -1
           || jqXHR.responseText.indexOf('Unauthorized access to root container.') > -1) {
          throwUnauthorized();
        } else {
          throwError(jqXHR.responseText);
        }
      });
  }

  function throwError(error) {
    $('.progress-spin').css({ display: 'none' });
    $('.error-splash .error').text(error);
    $('.error-splash').show();
    showStatusBar(false);
  }

  function throwUnauthorized() {
    $('.progress-spin').css({ display: 'none' });
    $('.unauthorized-splash').show();
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

  function setupAccessTokenSplash() {
    $('.access-token-field').keyup(function(e) {
      e.preventDefault();
      if(e.keyCode == 13) {
        $('.access-token-button').click();
      }
    });
    $('.access-token-button').click(function() {
      const urlWithoutParameters = location.protocol + '//' + location.host + location.pathname;
      const accessToken = $('.access-token-field').val();
      if(accessToken) {
        window.location.href = urlWithoutParameters + `?access_token=${accessToken}`;
      }
    });
  }

  function clearDelegationForm() {
    $('.delegate-form-user').val('');
    $('.delegate-form-duration').val('1h');
  }

  function clearAndHideDelegationForm() {
    clearDelegationForm();
    $('.delegation-form').hide();
  }

  function generateAccessToken(taskId) {
    const username = $('.delegate-form-user').val();
    const duration = $('.delegate-form-duration').val();

    const payload = {
      delegate_to: username,
      task_id: taskId,
      duration: duration
    };
    
    $.ajax('/delegate', {
      data : JSON.stringify(payload),
      contentType : 'application/json',
      type : 'POST'
    })
    .then(function(accessToken) {
      showDelegationAccessToken(accessToken)
    })
    .catch(function(err) {
      showDelegationErrorToken(err.responseText);
    })
  }

  function showDelegationForm() {
    $('.delegation-form').show();
    $('.delegation-form .form-body').show();
    $('.delegation-form .access-token').hide();
    $('.delegation-form .error').hide();
  }

  function showDelegationAccessToken(accessToken) {
    $('.delegation-form').show();
    $('.delegation-form .form-body').hide();
    $('.delegation-form .access-token').show();
    $('.delegation-form .error').hide();
    var newURL = 
      window.location.protocol + "//" + window.location.host +
      "" + window.location.pathname + window.location.search;
    $('.delegation-form .access-token textarea').val(
      newURL + '?access_token=' + accessToken);
  }

  function showDelegationErrorToken(errorMessage) {
    $('.delegation-form').show();
    $('.delegation-form .form-body').hide();
    $('.delegation-form .access-token').hide();
    $('.delegation-form .error').show();
    $('.delegation-form .error p').html(errorMessage);
  }

  function setupDelegationForm(taskId) {
    $('.delegate-button').click(showDelegationForm);

    $('.delegate-form-abort').click(function() {
      clearAndHideDelegationForm();
    });

    $('.delegate-form-delegate').click(function() {
      generateAccessToken(taskId);
    });

    $('.delegate-form-retry').click(function() {
      clearDelegationForm();
      showDelegationForm();
    });

    $('.delegate-form-ok').click(function() {
      clearAndHideDelegationForm();
    });
  }

  $(document).ready(function() {
    const terminalContainer = $('#terminal-container').get(0);
    const taskId = terminalContainer.getAttribute('data-taskid');
    const accessToken = terminalContainer.getAttribute('data-access-token');
    createTerminal(terminalContainer, taskId, accessToken);
    $(window).resize(function() {
      resize(); // resize geometry
      resizeTerminal();
    });
    clipboard(); 
    setupAccessTokenSplash();
    setupDelegationForm(taskId);
  });
})()
