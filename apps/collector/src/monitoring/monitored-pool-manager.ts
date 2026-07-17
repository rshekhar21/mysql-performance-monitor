import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import type { CollectorMonitoredServer } from '../repositories/monitored-server-repository.js';

export interface QueryOptions {
  timeoutMs?: number;
}

export class MonitoredPoolManager {
  private readonly pools = new Map<string, Pool>();

  async query<T extends RowDataPacket[]>(
    server: CollectorMonitoredServer,
    sql: string,
    values: unknown[] = [],
    options: QueryOptions = {}
  ): Promise<T> {
    const pool = this.getPool(server);
    const [rows] = await pool.query<T>({
      sql,
      values,
      timeout: options.timeoutMs ?? 10_000
    });

    return rows;
  }

  async shutdown(): Promise<void> {
    const pools = [...this.pools.values()];
    this.pools.clear();
    await Promise.all(pools.map((pool) => pool.end()));
  }

  private getPool(server: CollectorMonitoredServer): Pool {
    const existing = this.pools.get(server.id);

    if (existing) {
      return existing;
    }

    const pool = mysql.createPool({
      host: server.host,
      port: server.port,
      user: server.username,
      password: server.password,
      waitForConnections: false,
      connectionLimit: 3,
      maxIdle: 1,
      idleTimeout: 60_000,
      connectTimeout: 5_000,
      queueLimit: 0,
      enableKeepAlive: true,
      timezone: 'Z',
      ssl: server.sslMode === 'disabled' ? undefined : {}
    });

    this.pools.set(server.id, pool);
    return pool;
  }
}
