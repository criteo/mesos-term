declare module 'express-ws' {
  import Express = require('express');

  function expressWs(app: Express.Application, server?: any, options?: any): any;

  export = expressWs;
}
