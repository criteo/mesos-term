import 'express-session';
import { User } from '../src/express_helpers';

declare module 'express-session' {
  interface SessionData {
    user?: User;
  }
}
