import type { RowDataPacket } from 'mysql2';
import type { ApplicationPool } from '@mysql-monitor/database';
import type {
  PreviousStatusSnapshot,
  ServerStatusSnapshotInput
} from '../metrics/status-calculator.js';
import type { InnoDbSnapshotInput } from '../metrics/innodb-calculator.js';
import { newId, uuidToBin } from '../utils/ids.js';

interface PreviousStatusRow extends RowDataPacket {
  collected_at: Date;
  uptime_seconds: number | null;
  questions: number | null;
  queries: number | null;
  bytes_received: number | null;
  bytes_sent: number | null;
}

export interface DatabaseSizeSnapshotInput {
  databaseName: string;
  dataLengthBytes: number;
  indexLengthBytes: number;
  totalBytes: number;
  tableCount: number;
}

export interface TableSizeSnapshotInput {
  databaseName: string;
  tableName: string;
  engine: string | null;
  tableRows: number | null;
  dataLengthBytes: number;
  indexLengthBytes: number;
  dataFreeBytes: number;
  totalBytes: number;
}

export interface QueryDigestSnapshotInput {
  schemaName: string | null;
  digest: string;
  digestText: string | null;
  countStar: number;
  sumTimerWait: number | null;
  avgTimerWait: number | null;
  maxTimerWait: number | null;
  sumRowsExamined: number | null;
  sumRowsSent: number | null;
}

export interface ReplicationSnapshotInput {
  replicationAvailable: boolean;
  ioThreadRunning: boolean | null;
  sqlThreadRunning: boolean | null;
  lagSeconds: number | null;
  rawStatus: Record<string, unknown> | null;
}

export class SnapshotRepository {
  constructor(private readonly pool: ApplicationPool) {}

  async getLatestStatus(serverId: string): Promise<PreviousStatusSnapshot | null> {
    const [rows] = await this.pool.execute<PreviousStatusRow[]>(
      `SELECT collected_at, uptime_seconds, questions, queries, bytes_received, bytes_sent
       FROM server_status_snapshots
       WHERE server_id = ?
       ORDER BY collected_at DESC
       LIMIT 1`,
      [uuidToBin(serverId)]
    );
    const row = rows[0];

    return row
      ? {
          collectedAt: row.collected_at,
          uptimeSeconds: row.uptime_seconds,
          questions: row.questions,
          queries: row.queries,
          bytesReceived: row.bytes_received,
          bytesSent: row.bytes_sent
        }
      : null;
  }

  async insertServerStatus(serverId: string, snapshot: ServerStatusSnapshotInput): Promise<void> {
    await this.pool.execute(
      `INSERT INTO server_status_snapshots
       (id, server_id, collected_at, uptime_seconds, threads_connected, threads_running,
        max_used_connections, max_connections, questions, queries, bytes_received, bytes_sent,
        questions_per_second, queries_per_second, bytes_received_per_second, bytes_sent_per_second,
        raw_status_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))`,
      [
        uuidToBin(newId()),
        uuidToBin(serverId),
        snapshot.collectedAt,
        snapshot.uptimeSeconds,
        snapshot.threadsConnected,
        snapshot.threadsRunning,
        snapshot.maxUsedConnections,
        snapshot.maxConnections,
        snapshot.questions,
        snapshot.queries,
        snapshot.bytesReceived,
        snapshot.bytesSent,
        snapshot.questionsPerSecond,
        snapshot.queriesPerSecond,
        snapshot.bytesReceivedPerSecond,
        snapshot.bytesSentPerSecond,
        JSON.stringify(snapshot.rawStatus)
      ]
    );
  }

  async insertInnoDb(serverId: string, snapshot: InnoDbSnapshotInput): Promise<void> {
    await this.pool.execute(
      `INSERT INTO innodb_snapshots
       (id, server_id, collected_at, buffer_pool_pages_total, buffer_pool_pages_dirty,
        buffer_pool_read_requests, buffer_pool_reads, buffer_pool_hit_ratio, raw_status_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))`,
      [
        uuidToBin(newId()),
        uuidToBin(serverId),
        snapshot.collectedAt,
        snapshot.bufferPoolPagesTotal,
        snapshot.bufferPoolPagesDirty,
        snapshot.bufferPoolReadRequests,
        snapshot.bufferPoolReads,
        snapshot.bufferPoolHitRatio,
        JSON.stringify(snapshot.rawStatus)
      ]
    );
  }

  async insertDatabaseSizes(
    serverId: string,
    collectedAt: Date,
    snapshots: DatabaseSizeSnapshotInput[]
  ): Promise<number> {
    for (const snapshot of snapshots) {
      await this.pool.execute(
        `INSERT INTO database_size_snapshots
         (id, server_id, database_name, collected_at, data_length_bytes, index_length_bytes,
          total_bytes, table_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidToBin(newId()),
          uuidToBin(serverId),
          snapshot.databaseName,
          collectedAt,
          snapshot.dataLengthBytes,
          snapshot.indexLengthBytes,
          snapshot.totalBytes,
          snapshot.tableCount
        ]
      );
    }

    return snapshots.length;
  }

  async insertTableSizes(
    serverId: string,
    collectedAt: Date,
    snapshots: TableSizeSnapshotInput[]
  ): Promise<number> {
    for (const snapshot of snapshots) {
      await this.pool.execute(
        `INSERT INTO table_size_snapshots
         (id, server_id, database_name, table_name, collected_at, engine, table_rows,
          data_length_bytes, index_length_bytes, data_free_bytes, total_bytes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidToBin(newId()),
          uuidToBin(serverId),
          snapshot.databaseName,
          snapshot.tableName,
          collectedAt,
          snapshot.engine,
          snapshot.tableRows,
          snapshot.dataLengthBytes,
          snapshot.indexLengthBytes,
          snapshot.dataFreeBytes,
          snapshot.totalBytes
        ]
      );
    }

    return snapshots.length;
  }

  async insertQueryDigests(
    serverId: string,
    collectedAt: Date,
    snapshots: QueryDigestSnapshotInput[]
  ): Promise<number> {
    for (const snapshot of snapshots) {
      await this.pool.execute(
        `INSERT INTO query_digest_snapshots
         (id, server_id, collected_at, schema_name, digest, digest_text, count_star,
          sum_timer_wait, avg_timer_wait, max_timer_wait, sum_rows_examined, sum_rows_sent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidToBin(newId()),
          uuidToBin(serverId),
          collectedAt,
          snapshot.schemaName,
          snapshot.digest,
          snapshot.digestText,
          snapshot.countStar,
          snapshot.sumTimerWait,
          snapshot.avgTimerWait,
          snapshot.maxTimerWait,
          snapshot.sumRowsExamined,
          snapshot.sumRowsSent
        ]
      );
    }

    return snapshots.length;
  }

  async insertReplication(
    serverId: string,
    collectedAt: Date,
    snapshot: ReplicationSnapshotInput
  ): Promise<void> {
    await this.pool.execute(
      `INSERT INTO replication_snapshots
       (id, server_id, collected_at, replication_available, io_thread_running,
        sql_thread_running, lag_seconds, raw_status_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))`,
      [
        uuidToBin(newId()),
        uuidToBin(serverId),
        collectedAt,
        snapshot.replicationAvailable,
        snapshot.ioThreadRunning,
        snapshot.sqlThreadRunning,
        snapshot.lagSeconds,
        JSON.stringify(snapshot.rawStatus ?? {})
      ]
    );
  }
}
