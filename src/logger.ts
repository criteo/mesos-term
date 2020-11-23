import { CustomRequest } from './express_helpers';


export abstract class Logger {
  abstract request(req: CustomRequest, taskId: string): void;
  abstract openContainer(req: CustomRequest, taskId: string, terminalPid: number): void;
  abstract open(req: CustomRequest, terminalPid: number): void;
  abstract connect(req: CustomRequest, terminalPid: number): void;
  abstract disconnect(req: CustomRequest, terminalPid: number): void;
  abstract connectionClosed(req: CustomRequest, terminalPid: number): void;
}

export class AnonymousLogger extends Logger {
  request(req: CustomRequest, taskId: string): void {
    console.log('Anonymous user requested a session in container "%s".',
      taskId);
  }

  openContainer(req: CustomRequest, taskId: string, terminalPid: number): void {
    console.log('Anonymous user opened a session in container "%s." (pid=%s)',
      taskId, terminalPid);
  }

  open(req: CustomRequest, terminalPid: number): void {
    console.log('Websocket for terminal %s of anonymous user is open.', terminalPid);
  }

  connect(req: CustomRequest, terminalPid: number): void {
    console.log('Anonymous user connected to terminal %s.', terminalPid);
  }

  disconnect(req: CustomRequest, terminalPid: number): void {
    console.log('Anonymous user diconnected from terminal %s.', terminalPid);
  }

  connectionClosed(req: CustomRequest, terminalPid: number): void {
    console.log('Anonymous user has been disconnected from terminal %s.', terminalPid);
  }
}

export class AuthenticatedLogger extends Logger {
  request(req: CustomRequest, taskId: string): void {
    console.log('User "%s" requested a session in container "%s".',
      req.user.cn, taskId);
  }

  openContainer(req: CustomRequest, taskId: string, terminalPid: number): void {
    console.log('User "%s" opened a session in container "%s". (pid=%s)',
      req.user.cn, taskId, terminalPid);
  }

  open(req: CustomRequest, terminalPid: number): void {
    console.log('Websocket for terminal %s of of user "%s" user is open.', req.user.cn, terminalPid);
  }

  connect(req: CustomRequest, terminalPid: number): void {
    console.log('User "%s" connected to terminal %s.', req.user.cn, terminalPid);
  }

  disconnect(req: CustomRequest, terminalPid: number): void {
    console.log('User "%s" is diconnected from terminal %s', req.user.cn, terminalPid);
  }

  connectionClosed(req: CustomRequest, terminalPid: number): void {
    console.log('User "%s" has been disconnected from terminal %s.', req.user.cn, terminalPid);
  }
}
