import mysql from 'mysql2/promise';
import {
  monitoredMysqlConnectionAttempts,
  sanitizeMysqlError,
  shouldRetryWithoutSsl
} from '@mysql-monitor/shared';
import type {
  MonitoredServerCreateInput,
  MonitoredServerUpdateInput
} from '@mysql-monitor/validation';
import { apiConfig } from '../config/env.js';
import { logger } from '../config/logger.js';
import {
  DuplicateResourceError,
  MonitoredServerUnavailableError,
  NotFoundError
} from '../errors/app-error.js';
import type { MonitoredServerRepository } from '../repositories/monitored-server-repository.js';
import { decryptSecret, encryptSecret } from '../utils/crypto.js';

export class MonitoredServerService {
  constructor(private readonly servers: MonitoredServerRepository) {}

  list() {
    return this.servers.list();
  }

  async get(id: string) {
    const server = await this.servers.findById(id);

    if (!server) {
      throw new NotFoundError('Monitored server');
    }

    return server;
  }

  async create(input: MonitoredServerCreateInput) {
    try {
      const encrypted = encryptSecret(input.password, apiConfig.CREDENTIAL_ENCRYPTION_KEY);
      return await this.servers.create(input, encrypted.encrypted, encrypted.keyId);
    } catch (error) {
      if (isDuplicateError(error)) {
        throw new DuplicateResourceError('Monitored server');
      }
      throw error;
    }
  }

  async update(id: string, input: MonitoredServerUpdateInput) {
    const updated = await this.servers.update(id, input);

    if (!updated) {
      throw new NotFoundError('Monitored server');
    }

    return updated;
  }

  async delete(id: string) {
    const deleted = await this.servers.delete(id);

    if (!deleted) {
      throw new NotFoundError('Monitored server');
    }
  }

  async testConnection(input: MonitoredServerCreateInput) {
    await testMysqlConnection({
      host: input.host,
      port: input.port,
      user: input.username,
      password: input.password,
      sslMode: input.sslMode,
      operation: 'api.test_connection',
      monitoredServerHost: input.host
    });

    return { ok: true };
  }

  async testStoredConnection(serverId: string) {
    const server = await this.get(serverId);
    const credential = await this.servers.getCredential(serverId);

    if (!credential) {
      throw new NotFoundError('Server credential');
    }

    await testMysqlConnection({
      host: server.host,
      port: server.port,
      user: server.username,
      password: decryptSecret(credential.encryptedPassword, apiConfig.CREDENTIAL_ENCRYPTION_KEY),
      sslMode: server.sslMode,
      operation: 'api.test_stored_connection',
      monitoredServerId: server.id
    });

    return { ok: true };
  }
}

async function testMysqlConnection(input: {
  host: string;
  port: number;
  user: string;
  password: string;
  sslMode: 'disabled' | 'preferred' | 'required';
  operation: string;
  monitoredServerId?: string;
  monitoredServerHost?: string;
}): Promise<void> {
  const startedAt = Date.now();
  const attempts = monitoredMysqlConnectionAttempts(input.sslMode);
  let lastError: unknown;

  for (const [attemptIndex, attempt] of attempts.entries()) {
    let connection: mysql.Connection | undefined;

    try {
      connection = await mysql.createConnection({
        host: input.host,
        port: input.port,
        user: input.user,
        password: input.password,
        connectTimeout: apiConfig.MONITORED_MYSQL_CONNECT_TIMEOUT_MS,
        ssl: attempt.ssl
      });

      await connection.query('SELECT 1');
      return;
    } catch (error) {
      lastError = error;

      if (shouldRetryWithoutSsl(input.sslMode, error, attemptIndex)) {
        continue;
      }

      break;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  logMonitoredMysqlFailure(input, lastError, Date.now() - startedAt);
  throw new MonitoredServerUnavailableError();
}

function logMonitoredMysqlFailure(
  input: {
    operation: string;
    monitoredServerId?: string;
    monitoredServerHost?: string;
  },
  error: unknown,
  elapsedMs: number
): void {
  logger.warn(
    {
      mysqlErrorCode: sanitizeMysqlError(error).code,
      operation: input.operation,
      monitoredServerId: input.monitoredServerId,
      monitoredServerHost: input.monitoredServerHost,
      elapsedMs
    },
    'monitored mysql connection failed'
  );
}

export const monitoredServerTestInternals = {
  testMysqlConnection
};

function isDuplicateError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'ER_DUP_ENTRY'
  );
}
