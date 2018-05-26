import Express = require('express');

export abstract class Logger {
  abstract request(req: Express.Request, taskId: string): void;
  abstract open(req: Express.Request, taskId: string, terminalPid: number): void;
  abstract connect(req: Express.Request, terminalPid: number): void;
  abstract disconnect(req: Express.Request, terminalPid: number): void;
  abstract connectionClosed(req: Express.Request, terminalPid: number): void;
}

export class AnonymousLogger extends Logger {
  request(req: Express.Request, taskId: string): void {
    console.log('Anonymous user requested a session in container "%s".',
      taskId);
  }

  open(req: Express.Request, taskId: string, terminalPid: number): void {
    console.log('Anonymous user opened a session in container "%s." (pid=%s)',
      taskId, terminalPid);
  }

  connect(req: Express.Request, terminalPid: number): void {
    console.log('Anonymous user connected to terminal %s.', terminalPid);
  }

  disconnect(req: Express.Request, terminalPid: number): void {
    console.log('Anonymous user diconnected from terminal %s.', terminalPid);
  }

  connectionClosed(req: Express.Request, terminalPid: number): void {
    console.log('Anonymous user has been disconnected from terminal %s.', terminalPid);
  }
}

export class AuthenticatedLogger extends Logger {
  request(req: Express.Request, taskId: string): void {
    console.log('User "%s" requested a session in container "%s".',
      req.user.cn, taskId);
  }

  open(req: Express.Request, taskId: string, terminalPid: number): void {
    console.log('User "%s" opened a session in container "%s". (pid=%s)',
      req.user.cn, taskId, terminalPid);
  }

  connect(req: Express.Request, terminalPid: number): void {
    console.log('User "%s" connected to terminal %s.', req.user.cn, terminalPid);
  }

  disconnect(req: Express.Request, terminalPid: number): void {
    console.log('User "%s" is diconnected from terminal %s', req.user.cn, terminalPid);
  }

  connectionClosed(req: Express.Request, terminalPid: number): void {
    console.log('User "%s" has been disconnected from terminal %s.', req.user.cn, terminalPid);
  }
}
