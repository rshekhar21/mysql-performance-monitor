import type { Permission, RoleName } from '@mysql-monitor/types';

export const rolePermissions: Record<RoleName, Permission[]> = {
  viewer: ['dashboard:read', 'reports:read'],
  operator: ['dashboard:read', 'reports:read', 'alerts:acknowledge', 'running_queries:read'],
  administrator: [
    'dashboard:read',
    'reports:read',
    'alerts:acknowledge',
    'running_queries:read',
    'servers:manage',
    'collectors:manage',
    'alerts:manage',
    'users:manage',
    'audit:read',
    'settings:manage'
  ],
  super_admin: [
    'dashboard:read',
    'reports:read',
    'alerts:acknowledge',
    'running_queries:read',
    'servers:manage',
    'collectors:manage',
    'alerts:manage',
    'users:manage',
    'audit:read',
    'settings:manage'
  ]
};

export function hasPermission(roles: RoleName[], permission: Permission): boolean {
  return roles.some((role) => rolePermissions[role]?.includes(permission) ?? false);
}
