import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { ApplicationPool } from '@mysql-monitor/database';
import type { MonitoredServer } from '@mysql-monitor/types';
import type {
  MonitoredServerCreateInput,
  MonitoredServerUpdateInput
} from '@mysql-monitor/validation';
import { binToUuid, newId, uuidToBin } from '../utils/ids.js';

interface ServerRow extends RowDataPacket {
  id: Buffer;
  name: string;
  host: string;
  port: number;
  username: string;
  ssl_mode: 'disabled' | 'preferred' | 'required';
  status: 'enabled' | 'disabled' | 'unavailable';
  environment: string | null;
  created_at: Date;
  updated_at: Date;
}

interface CredentialRow extends RowDataPacket {
  encrypted_password: Buffer;
}

export interface ServerCredentialRecord {
  serverId: string;
  encryptedPassword: Buffer;
}

export class MonitoredServerRepository {
  constructor(private readonly pool: ApplicationPool) {}

  async list(): Promise<MonitoredServer[]> {
    const [rows] = await this.pool.execute<ServerRow[]>(
      `SELECT id, name, host, port, username, ssl_mode, status, environment, created_at, updated_at
       FROM monitored_servers
       ORDER BY name ASC`
    );

    return rows.map(mapServerRow);
  }

  async findById(id: string): Promise<MonitoredServer | null> {
    const [rows] = await this.pool.execute<ServerRow[]>(
      `SELECT id, name, host, port, username, ssl_mode, status, environment, created_at, updated_at
       FROM monitored_servers
       WHERE id = ?
       LIMIT 1`,
      [uuidToBin(id)]
    );

    return rows[0] ? mapServerRow(rows[0]) : null;
  }

  async create(input: MonitoredServerCreateInput, encryptedPassword: Buffer, keyId: string) {
    const id = newId();
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();
      await connection.execute<ResultSetHeader>(
        `INSERT INTO monitored_servers (id, name, host, port, username, ssl_mode, environment, enabled, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidToBin(id),
          input.name,
          input.host,
          input.port,
          input.username,
          input.sslMode,
          input.environment ?? null,
          input.enabled,
          input.enabled ? 'enabled' : 'disabled'
        ]
      );
      await connection.execute(
        `INSERT INTO server_credentials (server_id, encrypted_password, encryption_key_id)
         VALUES (?, ?, ?)`,
        [uuidToBin(id), encryptedPassword, keyId]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const created = await this.findById(id);

    if (!created) {
      throw new Error('Created server could not be loaded');
    }

    return created;
  }

  async update(id: string, input: MonitoredServerUpdateInput): Promise<MonitoredServer | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    const fieldMap = {
      name: 'name',
      host: 'host',
      port: 'port',
      username: 'username',
      environment: 'environment',
      enabled: 'enabled'
    } as const;

    for (const [key, column] of Object.entries(fieldMap)) {
      if (key in input && input[key as keyof typeof fieldMap] !== undefined) {
        fields.push(`${column} = ?`);
        values.push(input[key as keyof typeof fieldMap]);
      }
    }

    if (input.sslMode !== undefined) {
      fields.push('ssl_mode = ?');
      values.push(input.sslMode);
    }

    if (input.enabled !== undefined) {
      fields.push('status = ?');
      values.push(input.enabled ? 'enabled' : 'disabled');
    }

    if (fields.length > 0) {
      await this.pool.query(`UPDATE monitored_servers SET ${fields.join(', ')} WHERE id = ?`, [
        ...values,
        uuidToBin(id)
      ]);
    }

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      `DELETE FROM monitored_servers WHERE id = ?`,
      [uuidToBin(id)]
    );

    return result.affectedRows > 0;
  }

  async getCredential(serverId: string): Promise<ServerCredentialRecord | null> {
    const [rows] = await this.pool.execute<CredentialRow[]>(
      `SELECT encrypted_password FROM server_credentials WHERE server_id = ? LIMIT 1`,
      [uuidToBin(serverId)]
    );

    const row = rows[0];
    return row ? { serverId, encryptedPassword: row.encrypted_password } : null;
  }
}

function mapServerRow(row: ServerRow): MonitoredServer {
  return {
    id: binToUuid(row.id),
    name: row.name,
    host: row.host,
    port: row.port,
    username: row.username,
    sslMode: row.ssl_mode,
    status: row.status,
    ...(row.environment ? { environment: row.environment } : {}),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}
