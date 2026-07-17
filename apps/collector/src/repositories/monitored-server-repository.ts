import type { RowDataPacket } from 'mysql2';
import type { ApplicationPool } from '@mysql-monitor/database';
import { collectorConfig } from '../config/env.js';
import { decryptSecret } from '../utils/crypto.js';
import { binToUuid, uuidToBin } from '../utils/ids.js';

export interface CollectorMonitoredServer {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  sslMode: 'disabled' | 'preferred' | 'required';
}

interface ServerRow extends RowDataPacket {
  id: Buffer;
  name: string;
  host: string;
  port: number;
  username: string;
  ssl_mode: 'disabled' | 'preferred' | 'required';
  encrypted_password: Buffer;
}

export class MonitoredServerRepository {
  constructor(private readonly pool: ApplicationPool) {}

  async listEnabled(): Promise<CollectorMonitoredServer[]> {
    const [rows] = await this.pool.execute<ServerRow[]>(
      `SELECT s.id, s.name, s.host, s.port, s.username, s.ssl_mode, c.encrypted_password
       FROM monitored_servers s
       INNER JOIN server_credentials c ON c.server_id = s.id
       WHERE s.enabled = TRUE
       ORDER BY s.name ASC`
    );

    return rows.map((row) => ({
      id: binToUuid(row.id),
      name: row.name,
      host: row.host,
      port: row.port,
      username: row.username,
      password: decryptSecret(row.encrypted_password, collectorConfig.CREDENTIAL_ENCRYPTION_KEY),
      sslMode: row.ssl_mode
    }));
  }

  async markCapabilities(serverId: string, capabilities: object): Promise<void> {
    await this.pool.execute(
      `UPDATE monitored_servers
       SET capabilities_json = CAST(? AS JSON), status = 'enabled'
       WHERE id = ?`,
      [JSON.stringify(capabilities), uuidToBin(serverId)]
    );
  }

  async markAvailable(serverId: string): Promise<void> {
    await this.pool.execute(`UPDATE monitored_servers SET status = 'enabled' WHERE id = ?`, [
      uuidToBin(serverId)
    ]);
  }

  async markUnavailable(serverId: string): Promise<void> {
    await this.pool.execute(`UPDATE monitored_servers SET status = 'unavailable' WHERE id = ?`, [
      uuidToBin(serverId)
    ]);
  }
}
