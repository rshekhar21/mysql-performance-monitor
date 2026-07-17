import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import {
  monitoredMysqlConnectionAttempts,
  sanitizeMysqlError,
  shouldRetryWithoutSsl
} from '@mysql-monitor/shared';
import { collectorConfig } from '../config/env.js';
import { logger } from '../config/logger.js';
import type { CollectorMonitoredServer } from '../repositories/monitored-server-repository.js';

export interface QueryOptions {
  timeoutMs?: number;
}

export class MonitoredPoolManager {
  private readonly pools = new Map<string, { pool: Pool; attemptIndex: number }>();

  async query<T extends RowDataPacket[]>(
    server: CollectorMonitoredServer,
    sql: string,
    values: unknown[] = [],
    options: QueryOptions = {}
  ): Promise<T> {
    const startedAt = Date.now();
    let poolState = this.getPool(server);

    try {
      const [rows] = await poolState.pool.query<T>({
        sql,
        values,
        timeout: options.timeoutMs ?? 10_000
      });

      return rows;
    } catch (error) {
      if (shouldRetryWithoutSsl(server.sslMode, error, poolState.attemptIndex)) {
        await this.removePool(server.id);
        poolState = this.getPool(server, poolState.attemptIndex + 1);

        try {
          const [rows] = await poolState.pool.query<T>({
            sql,
            values,
            timeout: options.timeoutMs ?? 10_000
          });

          return rows;
        } catch (retryError) {
          logger.warn(
            {
              mysqlErrorCode: sanitizeMysqlError(retryError).code,
              operation: 'collector.query',
              monitoredServerId: server.id,
              elapsedMs: Date.now() - startedAt
            },
            'monitored mysql query failed'
          );
          throw retryError;
        }
      }

      logger.warn(
        {
          mysqlErrorCode: sanitizeMysqlError(error).code,
          operation: 'collector.query',
          monitoredServerId: server.id,
          elapsedMs: Date.now() - startedAt
        },
        'monitored mysql query failed'
      );
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    const pools = [...this.pools.values()].map((entry) => entry.pool);
    this.pools.clear();
    await Promise.all(pools.map((pool) => pool.end()));
  }

  private getPool(
    server: CollectorMonitoredServer,
    attemptIndex = 0
  ): { pool: Pool; attemptIndex: number } {
    const existing = this.pools.get(server.id);

    if (existing) {
      return existing;
    }

    const attempt = monitoredMysqlConnectionAttempts(server.sslMode)[attemptIndex];

    const pool = mysql.createPool({
      host: server.host,
      port: server.port,
      user: server.username,
      password: server.password,
      waitForConnections: false,
      connectionLimit: 3,
      maxIdle: 1,
      idleTimeout: 60_000,
      connectTimeout: collectorConfig.MONITORED_MYSQL_CONNECT_TIMEOUT_MS,
      queueLimit: 0,
      enableKeepAlive: true,
      timezone: 'Z',
      ssl: attempt?.ssl
    });

    const entry = { pool, attemptIndex };
    this.pools.set(server.id, entry);
    return entry;
  }

  private async removePool(serverId: string): Promise<void> {
    const existing = this.pools.get(serverId);
    this.pools.delete(serverId);

    if (existing) {
      await existing.pool.end();
    }
  }
}
