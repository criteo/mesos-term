import Express = require('express');

export abstract class Logger {
  abstract request(req: Express.Request, taskId: string): void;
  abstract open(req: Express.Request, taskId: string, terminalPid: number): void;
  abstract connect(req: Express.Request, terminalPid: number): void;
  abstract disconnect(req: Express.Request, terminalPid: number): void;

  resizeTerminal(terminalPid: number, cols: number, rows: number): void {
    console.log('Resizing terminal %s to %s cols and %s rows.', terminalPid, cols, rows);
  }

  connectionClosed(terminalPid: number): void {
    console.log('Connection to terminal %s has been closed.', terminalPid);
  }
}

export class AnonymousLogger extends Logger {
  request(req: Express.Request, taskId: string): void {
    console.log('Anonymous user has requested a session in container "%s"',
      taskId);
  }

  open(req: Express.Request, taskId: string, terminalPid: number): void {
    console.log('Anonymous user has opened a session in container "%s" (pid=%s)',
      taskId, terminalPid);
  }

  connect(req: Express.Request, terminalPid: number): void {
    console.log('Anonymous user is connected to terminal %s', terminalPid);
  }

  disconnect(req: Express.Request, terminalPid: number): void {
    console.log('Anonymous user is diconnected from terminal %s', terminalPid);
  }
}

export class AuthenticatedLogger extends Logger {
  request(req: Express.Request, taskId: string): void {
    console.log('User "%s" has requested a session in container "%s"',
      req.user.cn, taskId);
  }

  open(req: Express.Request, taskId: string, terminalPid: number): void {
    console.log('User "%s" has opened a session in container "%s" (pid=%s)',
      req.user.cn, taskId, terminalPid);
  }

  connect(req: Express.Request, terminalPid: number): void {
    console.log('User "%s" is connected to terminal %s', req.user.cn, terminalPid);
  }

  disconnect(req: Express.Request, terminalPid: number): void {
    console.log('User "%s" is diconnected from terminal %s', req.user.cn, terminalPid);
  }
}
