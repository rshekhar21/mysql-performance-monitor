import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import type { RunningQuerySummary } from '@mysql-monitor/types';
import { apiConfig } from '../config/env.js';
import { NotFoundError } from '../errors/app-error.js';
import type { MonitoredServerRepository } from '../repositories/monitored-server-repository.js';
import { decryptSecret } from '../utils/crypto.js';

interface ProcessRow extends RowDataPacket {
  ID: number;
  USER: string | null;
  HOST: string | null;
  DB: string | null;
  COMMAND: string | null;
  TIME: number | null;
  STATE: string | null;
  INFO: string | null;
}

export class LiveMySqlService {
  constructor(private readonly servers: MonitoredServerRepository) {}

  async runningQueries(serverId: string): Promise<RunningQuerySummary[]> {
    const server = await this.servers.findById(serverId);
    const credential = await this.servers.getCredential(serverId);

    if (!server || !credential) {
      throw new NotFoundError('Monitored server');
    }

    const connection = await mysql.createConnection({
      host: server.host,
      port: server.port,
      user: server.username,
      password: decryptSecret(credential.encryptedPassword, apiConfig.CREDENTIAL_ENCRYPTION_KEY),
      connectTimeout: 5_000,
      ssl: server.sslMode === 'disabled' ? undefined : {}
    });

    try {
      const [rows] = await connection.query<ProcessRow[]>(
        `SELECT ID, USER, HOST, DB, COMMAND, TIME, STATE, INFO
         FROM information_schema.PROCESSLIST
         WHERE COMMAND <> 'Sleep'
         ORDER BY TIME DESC
         LIMIT 100`
      );

      return rows.map((row) => ({
        connectionId: row.ID,
        user: row.USER,
        host: maskHost(row.HOST),
        database: row.DB,
        command: row.COMMAND,
        runtimeSeconds: row.TIME,
        state: row.STATE,
        queryText: row.INFO ? row.INFO.slice(0, 2000) : null
      }));
    } finally {
      await connection.end();
    }
  }
}

function maskHost(host: string | null): string | null {
  if (!host) {
    return null;
  }

  const [address, port] = host.split(':');
  if (!address) {
    return host;
  }

  return `${address.replace(/\d+$/u, 'x')}${port ? `:${port}` : ''}`;
}
