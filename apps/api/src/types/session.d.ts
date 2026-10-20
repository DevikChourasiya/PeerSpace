import 'express-session';
import type { UserRole, UserStatus } from '@peerspace/shared';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    role: UserRole;
    status: UserStatus;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        role: UserRole;
        status: UserStatus;
      };
    }
  }
}
