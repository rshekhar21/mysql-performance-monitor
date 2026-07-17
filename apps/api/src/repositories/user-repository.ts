import type { RowDataPacket } from 'mysql2';
import type { ApplicationPool } from '@mysql-monitor/database';
import type { RoleName, UserSummary } from '@mysql-monitor/types';
import { binToUuid, uuidToBin } from '../utils/ids.js';

interface UserRow extends RowDataPacket {
  id: Buffer;
  email: string;
  display_name: string;
  password_hash: string;
  disabled: 0 | 1;
  failed_login_count: number;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface RoleRow extends RowDataPacket {
  name: RoleName;
}

export interface AuthUserRecord {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  disabled: boolean;
  roles: RoleName[];
}

export class UserRepository {
  constructor(private readonly pool: ApplicationPool) {}

  async list(): Promise<UserSummary[]> {
    const [rows] = await this.pool.execute<UserRow[]>(
      `SELECT id, email, display_name, password_hash, disabled, failed_login_count,
              last_login_at, created_at, updated_at
       FROM users
       ORDER BY created_at DESC
       LIMIT 200`
    );

    return Promise.all(
      rows.map(async (row) => {
        const id = binToUuid(row.id);

        return {
          id,
          email: row.email,
          displayName: row.display_name,
          disabled: row.disabled === 1,
          roles: await this.findRolesForUser(id),
          failedLoginCount: row.failed_login_count,
          lastLoginAt: row.last_login_at?.toISOString() ?? null,
          createdAt: row.created_at.toISOString(),
          updatedAt: row.updated_at.toISOString()
        };
      })
    );
  }

  async findByEmail(email: string): Promise<AuthUserRecord | null> {
    const [rows] = await this.pool.execute<UserRow[]>(
      `SELECT id, email, display_name, password_hash, disabled FROM users WHERE email = ? LIMIT 1`,
      [email]
    );
    const row = rows[0];

    if (!row) {
      return null;
    }

    return {
      id: binToUuid(row.id),
      email: row.email,
      displayName: row.display_name,
      passwordHash: row.password_hash,
      disabled: row.disabled === 1,
      roles: await this.findRolesForUser(binToUuid(row.id))
    };
  }

  async findRolesForUser(userId: string): Promise<RoleName[]> {
    const [rows] = await this.pool.execute<RoleRow[]>(
      `SELECT r.name
       FROM roles r
       INNER JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = ?`,
      [uuidToBin(userId)]
    );

    return rows.map((row) => row.name);
  }

  async recordSuccessfulLogin(userId: string): Promise<void> {
    await this.pool.execute(
      `UPDATE users SET failed_login_count = 0, last_login_at = UTC_TIMESTAMP(3) WHERE id = ?`,
      [uuidToBin(userId)]
    );
  }

  async recordFailedLogin(email: string): Promise<void> {
    await this.pool.execute(
      `UPDATE users SET failed_login_count = failed_login_count + 1 WHERE email = ?`,
      [email]
    );
  }
}
