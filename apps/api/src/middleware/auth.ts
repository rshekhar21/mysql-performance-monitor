import type { Permission, RoleName } from '@mysql-monitor/types';
import type { NextFunction, Request, Response } from 'express';
import { AuthenticationError } from '../errors/app-error.js';
import { authService } from '../services/index.js';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('authorization');

  if (!header?.startsWith('Bearer ')) {
    next(new AuthenticationError());
    return;
  }

  try {
    const principal = authService.verifyToken(header.slice('Bearer '.length));
    req.user = {
      id: principal.id,
      email: principal.email,
      roles: principal.roles as RoleName[],
      permissions: principal.permissions
    };
    next();
  } catch (error) {
    next(error instanceof Error ? new AuthenticationError() : error);
  }
}

export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthenticationError());
      return;
    }

    try {
      authService.requirePermission(req.user.permissions, permission);
      next();
    } catch (error) {
      next(error);
    }
  };
}
