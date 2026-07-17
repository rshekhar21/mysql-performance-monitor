import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import {
  monitoredMysqlConnectionAttempts,
  sanitizeMysqlError,
  shouldRetryWithoutSsl
} from '@mysql-monitor/shared';
import type { RunningQuerySummary } from '@mysql-monitor/types';
import { apiConfig } from '../config/env.js';
import { logger } from '../config/logger.js';
import { MonitoredServerUnavailableError, NotFoundError } from '../errors/app-error.js';
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

    const startedAt = Date.now();
    const connection = await createMonitoredConnection({
      host: server.host,
      port: server.port,
      user: server.username,
      password: decryptSecret(credential.encryptedPassword, apiConfig.CREDENTIAL_ENCRYPTION_KEY),
      sslMode: server.sslMode,
      operation: 'api.running_queries',
      monitoredServerId: server.id,
      startedAt
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

async function createMonitoredConnection(input: {
  host: string;
  port: number;
  user: string;
  password: string;
  sslMode: 'disabled' | 'preferred' | 'required';
  operation: string;
  monitoredServerId: string;
  startedAt: number;
}): Promise<mysql.Connection> {
  const attempts = monitoredMysqlConnectionAttempts(input.sslMode);
  let lastError: unknown;

  for (const [attemptIndex, attempt] of attempts.entries()) {
    try {
      return await mysql.createConnection({
        host: input.host,
        port: input.port,
        user: input.user,
        password: input.password,
        connectTimeout: apiConfig.MONITORED_MYSQL_CONNECT_TIMEOUT_MS,
        ssl: attempt.ssl
      });
    } catch (error) {
      lastError = error;

      if (shouldRetryWithoutSsl(input.sslMode, error, attemptIndex)) {
        continue;
      }

      break;
    }
  }

  logger.warn(
    {
      mysqlErrorCode: sanitizeMysqlError(lastError).code,
      operation: input.operation,
      monitoredServerId: input.monitoredServerId,
      elapsedMs: Date.now() - input.startedAt
    },
    'monitored mysql connection failed'
  );
  throw new MonitoredServerUnavailableError();
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
