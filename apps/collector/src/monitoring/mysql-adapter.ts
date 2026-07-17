import type { RowDataPacket } from 'mysql2';
import type { CollectorMonitoredServer } from '../repositories/monitored-server-repository.js';
import { numberOrNull, type StatusMap } from '../metrics/status-calculator.js';
import type {
  DatabaseSizeSnapshotInput,
  QueryDigestSnapshotInput,
  ReplicationSnapshotInput,
  TableSizeSnapshotInput
} from '../repositories/snapshot-repository.js';
import type { MonitoredPoolManager } from './monitored-pool-manager.js';

interface StatusRow extends RowDataPacket {
  Variable_name: string;
  Value: string;
}

interface VariableRow extends RowDataPacket {
  Variable_name: string;
  Value: string;
}

interface SchemaRow extends RowDataPacket {
  SCHEMA_NAME: string;
}

interface DatabaseSizeRow extends RowDataPacket {
  database_name: string;
  data_length_bytes: string | number | null;
  index_length_bytes: string | number | null;
  total_bytes: string | number | null;
  table_count: string | number | null;
}

interface TableSizeRow extends RowDataPacket {
  database_name: string;
  table_name: string;
  engine: string | null;
  table_rows: string | number | null;
  data_length_bytes: string | number | null;
  index_length_bytes: string | number | null;
  data_free_bytes: string | number | null;
  total_bytes: string | number | null;
}

interface QueryDigestRow extends RowDataPacket {
  schema_name: string | null;
  digest: string | null;
  digest_text: string | null;
  count_star: string | number;
  sum_timer_wait: string | number | null;
  avg_timer_wait: string | number | null;
  max_timer_wait: string | number | null;
  sum_rows_examined: string | number | null;
  sum_rows_sent: string | number | null;
}

export interface ServerCapabilities {
  flavor: string;
  version: string;
  performanceSchemaAvailable: boolean;
  sysSchemaAvailable: boolean;
  innodbAvailable: boolean;
  queryDigestAvailable: boolean;
  replicationStatusCommand: 'SHOW REPLICA STATUS' | 'SHOW SLAVE STATUS' | null;
}

export class MySqlMonitoringAdapter {
  constructor(private readonly pools: MonitoredPoolManager) {}

  async detectCapabilities(server: CollectorMonitoredServer): Promise<ServerCapabilities> {
    const variables = await this.getVariables(server, [
      'version',
      'version_comment',
      'performance_schema'
    ]);
    const schemas = await this.pools.query<SchemaRow[]>(
      server,
      `SELECT SCHEMA_NAME
       FROM information_schema.SCHEMATA
       WHERE SCHEMA_NAME IN ('performance_schema', 'sys')`
    );
    const schemaNames = new Set(schemas.map((row) => row.SCHEMA_NAME));
    const status = await this.getGlobalStatus(server, ['Innodb_buffer_pool_read_requests']);

    return {
      flavor: variables.version_comment ?? 'MySQL compatible',
      version: variables.version ?? 'unknown',
      performanceSchemaAvailable:
        variables.performance_schema === 'ON' && schemaNames.has('performance_schema'),
      sysSchemaAvailable: schemaNames.has('sys'),
      innodbAvailable: 'Innodb_buffer_pool_read_requests' in status,
      queryDigestAvailable:
        variables.performance_schema === 'ON' && schemaNames.has('performance_schema'),
      replicationStatusCommand: await this.detectReplicationCommand(server)
    };
  }

  async getGlobalStatus(server: CollectorMonitoredServer, names?: string[]): Promise<StatusMap> {
    const rows =
      names && names.length > 0
        ? await this.pools.query<StatusRow[]>(
            server,
            `SHOW GLOBAL STATUS WHERE Variable_name IN (${names.map(() => '?').join(', ')})`,
            names
          )
        : await this.pools.query<StatusRow[]>(server, 'SHOW GLOBAL STATUS');

    return toMap(rows);
  }

  async getVariables(server: CollectorMonitoredServer, names: string[]): Promise<StatusMap> {
    const rows = await this.pools.query<VariableRow[]>(
      server,
      `SHOW GLOBAL VARIABLES WHERE Variable_name IN (${names.map(() => '?').join(', ')})`,
      names
    );

    return toMap(rows);
  }

  async getDatabaseSizes(server: CollectorMonitoredServer): Promise<DatabaseSizeSnapshotInput[]> {
    const rows = await this.pools.query<DatabaseSizeRow[]>(
      server,
      `SELECT TABLE_SCHEMA AS database_name,
              COALESCE(SUM(DATA_LENGTH), 0) AS data_length_bytes,
              COALESCE(SUM(INDEX_LENGTH), 0) AS index_length_bytes,
              COALESCE(SUM(DATA_LENGTH + INDEX_LENGTH), 0) AS total_bytes,
              COUNT(*) AS table_count
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA NOT IN ('mysql', 'sys', 'performance_schema', 'information_schema')
       GROUP BY TABLE_SCHEMA
       ORDER BY total_bytes DESC`
    );

    return rows.map((row) => ({
      databaseName: row.database_name,
      dataLengthBytes: numberOrNull(row.data_length_bytes) ?? 0,
      indexLengthBytes: numberOrNull(row.index_length_bytes) ?? 0,
      totalBytes: numberOrNull(row.total_bytes) ?? 0,
      tableCount: numberOrNull(row.table_count) ?? 0
    }));
  }

  async getTableSizes(server: CollectorMonitoredServer): Promise<TableSizeSnapshotInput[]> {
    const rows = await this.pools.query<TableSizeRow[]>(
      server,
      `SELECT TABLE_SCHEMA AS database_name,
              TABLE_NAME AS table_name,
              ENGINE AS engine,
              TABLE_ROWS AS table_rows,
              COALESCE(DATA_LENGTH, 0) AS data_length_bytes,
              COALESCE(INDEX_LENGTH, 0) AS index_length_bytes,
              COALESCE(DATA_FREE, 0) AS data_free_bytes,
              COALESCE(DATA_LENGTH + INDEX_LENGTH, 0) AS total_bytes
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA NOT IN ('mysql', 'sys', 'performance_schema', 'information_schema')
       ORDER BY total_bytes DESC
       LIMIT 1000`
    );

    return rows.map((row) => ({
      databaseName: row.database_name,
      tableName: row.table_name,
      engine: row.engine,
      tableRows: numberOrNull(row.table_rows),
      dataLengthBytes: numberOrNull(row.data_length_bytes) ?? 0,
      indexLengthBytes: numberOrNull(row.index_length_bytes) ?? 0,
      dataFreeBytes: numberOrNull(row.data_free_bytes) ?? 0,
      totalBytes: numberOrNull(row.total_bytes) ?? 0
    }));
  }

  async getQueryDigests(server: CollectorMonitoredServer): Promise<QueryDigestSnapshotInput[]> {
    const rows = await this.pools.query<QueryDigestRow[]>(
      server,
      `SELECT SCHEMA_NAME AS schema_name,
              DIGEST AS digest,
              DIGEST_TEXT AS digest_text,
              COUNT_STAR AS count_star,
              SUM_TIMER_WAIT AS sum_timer_wait,
              AVG_TIMER_WAIT AS avg_timer_wait,
              MAX_TIMER_WAIT AS max_timer_wait,
              SUM_ROWS_EXAMINED AS sum_rows_examined,
              SUM_ROWS_SENT AS sum_rows_sent
       FROM performance_schema.events_statements_summary_by_digest
       WHERE DIGEST IS NOT NULL
       ORDER BY SUM_TIMER_WAIT DESC
       LIMIT 100`
    );

    return rows
      .filter((row) => row.digest !== null)
      .map((row) => ({
        schemaName: row.schema_name,
        digest: row.digest ?? '',
        digestText: row.digest_text ? row.digest_text.slice(0, 4096) : null,
        countStar: numberOrNull(row.count_star) ?? 0,
        sumTimerWait: numberOrNull(row.sum_timer_wait),
        avgTimerWait: numberOrNull(row.avg_timer_wait),
        maxTimerWait: numberOrNull(row.max_timer_wait),
        sumRowsExamined: numberOrNull(row.sum_rows_examined),
        sumRowsSent: numberOrNull(row.sum_rows_sent)
      }));
  }

  async getReplication(server: CollectorMonitoredServer): Promise<ReplicationSnapshotInput> {
    const row = await this.getReplicationRow(server);

    if (!row) {
      return {
        replicationAvailable: false,
        ioThreadRunning: null,
        sqlThreadRunning: null,
        lagSeconds: null,
        rawStatus: null
      };
    }

    const raw = { ...row } as Record<string, unknown>;
    const ioValue = stringValue(raw.Replica_IO_Running ?? raw.Slave_IO_Running);
    const sqlValue = stringValue(raw.Replica_SQL_Running ?? raw.Slave_SQL_Running);

    return {
      replicationAvailable: true,
      ioThreadRunning: ioValue === null ? null : ioValue === 'Yes',
      sqlThreadRunning: sqlValue === null ? null : sqlValue === 'Yes',
      lagSeconds: numberFromUnknown(raw.Seconds_Behind_Source ?? raw.Seconds_Behind_Master),
      rawStatus: raw
    };
  }

  private async detectReplicationCommand(
    server: CollectorMonitoredServer
  ): Promise<'SHOW REPLICA STATUS' | 'SHOW SLAVE STATUS' | null> {
    try {
      await this.pools.query<RowDataPacket[]>(server, 'SHOW REPLICA STATUS', [], {
        timeoutMs: 5_000
      });
      return 'SHOW REPLICA STATUS';
    } catch {
      try {
        await this.pools.query<RowDataPacket[]>(server, 'SHOW SLAVE STATUS', [], {
          timeoutMs: 5_000
        });
        return 'SHOW SLAVE STATUS';
      } catch {
        return null;
      }
    }
  }

  private async getReplicationRow(server: CollectorMonitoredServer): Promise<RowDataPacket | null> {
    try {
      const rows = await this.pools.query<RowDataPacket[]>(server, 'SHOW REPLICA STATUS', [], {
        timeoutMs: 5_000
      });
      return rows[0] ?? null;
    } catch {
      try {
        const rows = await this.pools.query<RowDataPacket[]>(server, 'SHOW SLAVE STATUS', [], {
          timeoutMs: 5_000
        });
        return rows[0] ?? null;
      } catch {
        return null;
      }
    }
  }
}

function toMap(rows: Array<StatusRow | VariableRow>): StatusMap {
  return Object.fromEntries(rows.map((row) => [row.Variable_name, row.Value]));
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function numberFromUnknown(value: unknown): number | null {
  return typeof value === 'string' || typeof value === 'number' ? numberOrNull(value) : null;
}
