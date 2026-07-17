import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { rolePermissions } from '@mysql-monitor/shared';
import type { Permission } from '@mysql-monitor/types';
import { AuthenticationError, AuthorizationError } from '../errors/app-error.js';
import type { UserRepository } from '../repositories/user-repository.js';

export interface TokenPayload {
  sub: string;
  email: string;
  roles: string[];
}

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly jwtSecret: string
  ) {}

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);

    if (!user || user.disabled) {
      throw new AuthenticationError();
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      await this.users.recordFailedLogin(email);
      throw new AuthenticationError();
    }

    await this.users.recordSuccessfulLogin(user.id);

    const token = jwt.sign({ sub: user.id, email: user.email, roles: user.roles }, this.jwtSecret, {
      expiresIn: '8h',
      issuer: 'mysql-performance-monitor'
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        disabled: user.disabled,
        roles: user.roles,
        createdAt: '',
        updatedAt: ''
      }
    };
  }

  verifyToken(token: string) {
    const payload = jwt.verify(token, this.jwtSecret) as TokenPayload;
    const permissions = payload.roles.flatMap((role) => {
      return role in rolePermissions
        ? rolePermissions[role as keyof typeof rolePermissions]
        : ([] as Permission[]);
    });

    return {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles,
      permissions
    };
  }

  requirePermission(userPermissions: Permission[], permission: Permission): void {
    if (!userPermissions.includes(permission)) {
      throw new AuthorizationError();
    }
  }
}
