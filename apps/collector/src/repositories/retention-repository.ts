import type { ResultSetHeader } from 'mysql2';
import type { ApplicationPool } from '@mysql-monitor/database';

export interface RetentionResult {
  serverStatusDeleted: number;
  innodbDeleted: number;
  databaseSizesDeleted: number;
  tableSizesDeleted: number;
  collectorRunsDeleted: number;
}

export class RetentionRepository {
  constructor(private readonly pool: ApplicationPool) {}

  async cleanup(input: {
    highFrequencyDays: number;
    storageDays: number;
    collectorRunDays: number;
  }): Promise<RetentionResult> {
    const serverStatusDeleted = await this.deleteOlderThan(
      'server_status_snapshots',
      'collected_at',
      input.highFrequencyDays
    );
    const innodbDeleted = await this.deleteOlderThan(
      'innodb_snapshots',
      'collected_at',
      input.highFrequencyDays
    );
    const databaseSizesDeleted = await this.deleteOlderThan(
      'database_size_snapshots',
      'collected_at',
      input.storageDays
    );
    const tableSizesDeleted = await this.deleteOlderThan(
      'table_size_snapshots',
      'collected_at',
      input.storageDays
    );
    const collectorRunsDeleted = await this.deleteOlderThan(
      'collector_runs',
      'started_at',
      input.collectorRunDays
    );

    return {
      serverStatusDeleted,
      innodbDeleted,
      databaseSizesDeleted,
      tableSizesDeleted,
      collectorRunsDeleted
    };
  }

  private async deleteOlderThan(table: string, column: string, days: number): Promise<number> {
    const [result] = await this.pool.query<ResultSetHeader>(
      `DELETE FROM ${table} WHERE ${column} < (UTC_TIMESTAMP(3) - INTERVAL ? DAY)`,
      [days]
    );

    return result.affectedRows;
  }
}
