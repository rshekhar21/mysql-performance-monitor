import type { Permission, RoleName } from '@mysql-monitor/types';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: {
        id: string;
        email: string;
        roles: RoleName[];
        permissions: Permission[];
      };
    }
  }
}

export {};
