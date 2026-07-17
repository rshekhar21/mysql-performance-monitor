import type { RowDataPacket } from 'mysql2';
import type { ApplicationPool } from '@mysql-monitor/database';
import type {
  CollectorRunSummary,
  DatabaseSizeSummary,
  InnoDbSummary,
  QueryDigestSummary,
  ReplicationSummary,
  OverviewSummary,
  TableSizeSummary,
  TimeSeriesPoint
} from '@mysql-monitor/types';
import { binToUuid, uuidToBin } from '../utils/ids.js';

interface OverviewRow extends RowDataPacket {
  status: 'enabled' | 'disabled' | 'unavailable';
  capabilities_json: string | Record<string, unknown> | null;
  uptime_seconds: number | null;
  threads_connected: number | null;
  threads_running: number | null;
  max_connections: number | null;
  queries_per_second: number | null;
  collected_at: Date | null;
}

interface StorageRow extends RowDataPacket {
  total_bytes: number | string | null;
  collected_at: Date | null;
}

interface CollectionRow extends RowDataPacket {
  last_successful_collection_at: Date | null;
}

interface SeriesRow extends RowDataPacket {
  collected_at: Date;
  threads_connected: number | null;
  threads_running: number | null;
  queries_per_second: number | null;
  questions_per_second: number | null;
  bytes_received_per_second: number | null;
  bytes_sent_per_second: number | null;
}

interface DatabaseRow extends RowDataPacket {
  database_name: string;
  data_length_bytes: number | string;
  index_length_bytes: number | string;
  total_bytes: number | string;
  table_count: number | string;
  collected_at: Date;
}

interface TableRow extends RowDataPacket {
  database_name: string;
  table_name: string;
  engine: string | null;
  table_rows: number | string | null;
  data_length_bytes: number | string;
  index_length_bytes: number | string;
  data_free_bytes: number | string;
  total_bytes: number | string;
  collected_at: Date;
}

interface CollectorRunRow extends RowDataPacket {
  id: Buffer;
  server_id: Buffer;
  metric_group: string;
  started_at: Date;
  finished_at: Date | null;
  duration_ms: number | null;
  success: 0 | 1;
  records_collected: number;
  sanitized_error_code: string | null;
}

interface QueryDigestRow extends RowDataPacket {
  schema_name: string | null;
  digest: string;
  digest_text: string | null;
  count_star: number | string;
  sum_timer_wait: number | string | null;
  avg_timer_wait: number | string | null;
  max_timer_wait: number | string | null;
  sum_rows_examined: number | string | null;
  sum_rows_sent: number | string | null;
  collected_at: Date;
}

interface ReplicationRow extends RowDataPacket {
  replication_available: 0 | 1;
  io_thread_running: 0 | 1 | null;
  sql_thread_running: 0 | 1 | null;
  lag_seconds: number | string | null;
  collected_at: Date;
}

interface InnoDbRow extends RowDataPacket {
  collected_at: Date;
  buffer_pool_pages_total: number | string | null;
  buffer_pool_pages_dirty: number | string | null;
  buffer_pool_read_requests: number | string | null;
  buffer_pool_reads: number | string | null;
  buffer_pool_hit_ratio: number | string | null;
}

export interface MetricRange {
  start: Date;
  end: Date;
}

export class MetricsRepository {
  constructor(private readonly pool: ApplicationPool) {}

  async getOverview(serverId: string): Promise<OverviewSummary | null> {
    const [overviewRows] = await this.pool.execute<OverviewRow[]>(
      `SELECT s.status,
              s.capabilities_json,
              ss.uptime_seconds,
              ss.threads_connected,
              ss.threads_running,
              ss.max_connections,
              ss.queries_per_second,
              ss.collected_at
       FROM monitored_servers s
       LEFT JOIN server_status_snapshots ss
         ON ss.server_id = s.id
        AND ss.collected_at = (
          SELECT MAX(collected_at)
          FROM server_status_snapshots
          WHERE server_id = s.id
        )
       WHERE s.id = ?
       LIMIT 1`,
      [uuidToBin(serverId)]
    );
    const row = overviewRows[0];

    if (!row) {
      return null;
    }

    const [storageRows] = await this.pool.execute<StorageRow[]>(
      `SELECT SUM(total_bytes) AS total_bytes, MAX(collected_at) AS collected_at
       FROM database_size_snapshots
       WHERE server_id = ?
         AND collected_at = (
           SELECT MAX(collected_at)
           FROM database_size_snapshots
           WHERE server_id = ?
         )`,
      [uuidToBin(serverId), uuidToBin(serverId)]
    );
    const [collectionRows] = await this.pool.execute<CollectionRow[]>(
      `SELECT MAX(finished_at) AS last_successful_collection_at
       FROM collector_runs
       WHERE server_id = ? AND success = TRUE`,
      [uuidToBin(serverId)]
    );
    const capabilities = parseCapabilities(row.capabilities_json);
    const maxConnections = toNumber(row.max_connections);
    const activeConnections = toNumber(row.threads_connected);

    return {
      serverStatus: row.status ?? 'unknown',
      uptimeSeconds: toNumber(row.uptime_seconds),
      mysqlVersion: typeof capabilities.version === 'string' ? capabilities.version : null,
      activeConnections,
      connectionUtilization:
        activeConnections !== null && maxConnections !== null && maxConnections > 0
          ? (activeConnections / maxConnections) * 100
          : null,
      runningThreads: toNumber(row.threads_running),
      queriesPerSecond: toNumber(row.queries_per_second),
      slowQueryRate: null,
      currentDatabaseSizeBytes: toNumber(storageRows[0]?.total_bytes ?? null),
      unresolvedAlerts: 0,
      lastSuccessfulCollectionAt:
        collectionRows[0]?.last_successful_collection_at?.toISOString() ?? null,
      lastCollectedAt: row.collected_at?.toISOString() ?? null
    };
  }

  async getTimeSeries(serverId: string, range: MetricRange): Promise<TimeSeriesPoint[]> {
    const [rows] = await this.pool.execute<SeriesRow[]>(
      `SELECT collected_at,
              threads_connected,
              threads_running,
              queries_per_second,
              questions_per_second,
              bytes_received_per_second,
              bytes_sent_per_second
       FROM server_status_snapshots
       WHERE server_id = ?
         AND collected_at BETWEEN ? AND ?
       ORDER BY collected_at ASC
       LIMIT 2000`,
      [uuidToBin(serverId), range.start, range.end]
    );

    return rows.map((row) => ({
      collectedAt: row.collected_at.toISOString(),
      threadsConnected: toNumber(row.threads_connected),
      threadsRunning: toNumber(row.threads_running),
      queriesPerSecond: toNumber(row.queries_per_second),
      questionsPerSecond: toNumber(row.questions_per_second),
      bytesReceivedPerSecond: toNumber(row.bytes_received_per_second),
      bytesSentPerSecond: toNumber(row.bytes_sent_per_second)
    }));
  }

  async getTopDatabases(serverId: string, limit: number): Promise<DatabaseSizeSummary[]> {
    const safeLimit = sqlLimit(limit);
    const [rows] = await this.pool.execute<DatabaseRow[]>(
      `SELECT database_name, data_length_bytes, index_length_bytes, total_bytes, table_count, collected_at
       FROM database_size_snapshots
       WHERE server_id = ?
         AND collected_at = (
           SELECT MAX(collected_at)
           FROM database_size_snapshots
           WHERE server_id = ?
       )
       ORDER BY total_bytes DESC
       LIMIT ${safeLimit}`,
      [uuidToBin(serverId), uuidToBin(serverId)]
    );

    return rows.map(mapDatabaseRow);
  }

  async getTopTables(serverId: string, limit: number): Promise<TableSizeSummary[]> {
    const safeLimit = sqlLimit(limit);
    const [rows] = await this.pool.execute<TableRow[]>(
      `SELECT database_name, table_name, engine, table_rows, data_length_bytes, index_length_bytes,
              data_free_bytes, total_bytes, collected_at
       FROM table_size_snapshots
       WHERE server_id = ?
         AND collected_at = (
           SELECT MAX(collected_at)
           FROM table_size_snapshots
           WHERE server_id = ?
       )
       ORDER BY total_bytes DESC
       LIMIT ${safeLimit}`,
      [uuidToBin(serverId), uuidToBin(serverId)]
    );

    return rows.map(mapTableRow);
  }

  async getStorageSeries(serverId: string, range: MetricRange): Promise<TimeSeriesPoint[]> {
    const [rows] = await this.pool.execute<
      Array<RowDataPacket & { collected_at: Date; total_bytes: string | number }>
    >(
      `SELECT collected_at, SUM(total_bytes) AS total_bytes
       FROM database_size_snapshots
       WHERE server_id = ?
         AND collected_at BETWEEN ? AND ?
       GROUP BY collected_at
       ORDER BY collected_at ASC
       LIMIT 1000`,
      [uuidToBin(serverId), range.start, range.end]
    );

    return rows.map((row) => ({
      collectedAt: row.collected_at.toISOString(),
      totalBytes: toNumber(row.total_bytes)
    }));
  }

  async getCollectorRuns(serverId: string, limit: number): Promise<CollectorRunSummary[]> {
    const safeLimit = sqlLimit(limit);
    const [rows] = await this.pool.execute<CollectorRunRow[]>(
      `SELECT id, server_id, metric_group, started_at, finished_at, duration_ms, success,
              records_collected, sanitized_error_code
       FROM collector_runs
       WHERE server_id = ?
       ORDER BY started_at DESC
       LIMIT ${safeLimit}`,
      [uuidToBin(serverId)]
    );

    return rows.map((row) => ({
      id: binToUuid(row.id),
      serverId: binToUuid(row.server_id),
      metricGroup: row.metric_group,
      startedAt: row.started_at.toISOString(),
      finishedAt: row.finished_at?.toISOString() ?? null,
      durationMs: row.duration_ms,
      success: row.success === 1,
      recordsCollected: row.records_collected,
      sanitizedErrorCode: row.sanitized_error_code
    }));
  }

  async getQueryDigests(serverId: string, limit: number): Promise<QueryDigestSummary[]> {
    const safeLimit = sqlLimit(limit);
    const [rows] = await this.pool.execute<QueryDigestRow[]>(
      `SELECT schema_name, digest, digest_text, count_star, sum_timer_wait, avg_timer_wait,
              max_timer_wait, sum_rows_examined, sum_rows_sent, collected_at
       FROM query_digest_snapshots
       WHERE server_id = ?
         AND collected_at = (
           SELECT MAX(collected_at)
           FROM query_digest_snapshots
           WHERE server_id = ?
       )
       ORDER BY sum_timer_wait DESC
       LIMIT ${safeLimit}`,
      [uuidToBin(serverId), uuidToBin(serverId)]
    );

    return rows.map((row) => ({
      schemaName: row.schema_name,
      digest: row.digest,
      digestText: row.digest_text,
      executionCount: toNumber(row.count_star) ?? 0,
      totalTimerWait: toNumber(row.sum_timer_wait),
      averageTimerWait: toNumber(row.avg_timer_wait),
      maxTimerWait: toNumber(row.max_timer_wait),
      rowsExamined: toNumber(row.sum_rows_examined),
      rowsSent: toNumber(row.sum_rows_sent),
      collectedAt: row.collected_at.toISOString()
    }));
  }

  async getReplication(serverId: string): Promise<ReplicationSummary | null> {
    const [rows] = await this.pool.execute<ReplicationRow[]>(
      `SELECT replication_available, io_thread_running, sql_thread_running, lag_seconds, collected_at
       FROM replication_snapshots
       WHERE server_id = ?
       ORDER BY collected_at DESC
       LIMIT 1`,
      [uuidToBin(serverId)]
    );
    const row = rows[0];

    return row
      ? {
          replicationAvailable: row.replication_available === 1,
          ioThreadRunning: row.io_thread_running === null ? null : row.io_thread_running === 1,
          sqlThreadRunning: row.sql_thread_running === null ? null : row.sql_thread_running === 1,
          lagSeconds: toNumber(row.lag_seconds),
          collectedAt: row.collected_at.toISOString()
        }
      : null;
  }

  async getInnoDb(serverId: string): Promise<InnoDbSummary | null> {
    const [rows] = await this.pool.execute<InnoDbRow[]>(
      `SELECT collected_at, buffer_pool_pages_total, buffer_pool_pages_dirty,
              buffer_pool_read_requests, buffer_pool_reads, buffer_pool_hit_ratio
       FROM innodb_snapshots
       WHERE server_id = ?
       ORDER BY collected_at DESC
       LIMIT 1`,
      [uuidToBin(serverId)]
    );
    const row = rows[0];

    if (!row) {
      return null;
    }

    const dirtyPages = toNumber(row.buffer_pool_pages_dirty);
    const totalPages = toNumber(row.buffer_pool_pages_total);

    return {
      collectedAt: row.collected_at.toISOString(),
      bufferPoolPagesTotal: totalPages,
      bufferPoolPagesDirty: dirtyPages,
      bufferPoolReadRequests: toNumber(row.buffer_pool_read_requests),
      bufferPoolReads: toNumber(row.buffer_pool_reads),
      bufferPoolHitRatio: toNumber(row.buffer_pool_hit_ratio),
      dirtyPagePercentage:
        dirtyPages !== null && totalPages !== null && totalPages > 0
          ? (dirtyPages / totalPages) * 100
          : null
    };
  }
}

function mapDatabaseRow(row: DatabaseRow): DatabaseSizeSummary {
  return {
    databaseName: row.database_name,
    dataLengthBytes: toNumber(row.data_length_bytes) ?? 0,
    indexLengthBytes: toNumber(row.index_length_bytes) ?? 0,
    totalBytes: toNumber(row.total_bytes) ?? 0,
    tableCount: toNumber(row.table_count) ?? 0,
    collectedAt: row.collected_at.toISOString()
  };
}

function mapTableRow(row: TableRow): TableSizeSummary {
  return {
    databaseName: row.database_name,
    tableName: row.table_name,
    engine: row.engine,
    tableRows: toNumber(row.table_rows),
    dataLengthBytes: toNumber(row.data_length_bytes) ?? 0,
    indexLengthBytes: toNumber(row.index_length_bytes) ?? 0,
    dataFreeBytes: toNumber(row.data_free_bytes) ?? 0,
    totalBytes: toNumber(row.total_bytes) ?? 0,
    collectedAt: row.collected_at.toISOString()
  };
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sqlLimit(limit: number): number {
  if (!Number.isInteger(limit) || limit < 1 || limit > 2_000) {
    throw new Error('Invalid metrics query limit');
  }

  return limit;
}

function parseCapabilities(
  value: string | Record<string, unknown> | null
): Record<string, unknown> {
  if (!value) {
    return {};
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}
