const proxy = require('http-proxy-middleware');

module.exports = function (app) {
  // Beware, version 3.3.0 of react-scripts broke websocket support: https://github.com/facebook/create-react-app/issues/8094
  app.use(proxy('/api/terminals/ws', { target: 'http://mesos-term:3000', ws: true }));
  app.use(proxy('/api/', { target: 'http://mesos-term:3000' }));
};

