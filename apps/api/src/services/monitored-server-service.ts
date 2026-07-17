import mysql from 'mysql2/promise';
import type {
  MonitoredServerCreateInput,
  MonitoredServerUpdateInput
} from '@mysql-monitor/validation';
import { apiConfig } from '../config/env.js';
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
      sslMode: input.sslMode
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
      sslMode: server.sslMode
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
}): Promise<void> {
  try {
    const connection = await mysql.createConnection({
      host: input.host,
      port: input.port,
      user: input.user,
      password: input.password,
      connectTimeout: 5_000,
      ssl: input.sslMode === 'disabled' ? undefined : {}
    });

    try {
      await connection.query('SELECT 1');
    } finally {
      await connection.end();
    }
  } catch {
    throw new MonitoredServerUnavailableError();
  }
}

function isDuplicateError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'ER_DUP_ENTRY'
  );
}
