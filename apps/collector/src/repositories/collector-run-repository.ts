import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { ApplicationPool } from '@mysql-monitor/database';
import { newId, uuidToBin } from '../utils/ids.js';

interface LockRow extends RowDataPacket {
  acquired: 0 | 1 | null;
}

export interface CollectorRunFinishInput {
  runId: string;
  startedAt: Date;
  success: boolean;
  recordsCollected: number;
  sanitizedErrorCode?: string;
  retryCount?: number;
}

export class CollectorRunRepository {
  constructor(private readonly pool: ApplicationPool) {}

  async acquireLock(serverId: string, metricGroup: string): Promise<boolean> {
    const lockName = `collector:${serverId}:${metricGroup}`;
    const [rows] = await this.pool.query<LockRow[]>(`SELECT GET_LOCK(?, 0) AS acquired`, [
      lockName
    ]);

    return rows[0]?.acquired === 1;
  }

  async releaseLock(serverId: string, metricGroup: string): Promise<void> {
    const lockName = `collector:${serverId}:${metricGroup}`;
    await this.pool.query(`SELECT RELEASE_LOCK(?)`, [lockName]);
  }

  async start(serverId: string, metricGroup: string, startedAt: Date): Promise<string> {
    const runId = newId();
    await this.pool.execute<ResultSetHeader>(
      `INSERT INTO collector_runs (id, server_id, metric_group, started_at)
       VALUES (?, ?, ?, ?)`,
      [uuidToBin(runId), uuidToBin(serverId), metricGroup, startedAt]
    );

    return runId;
  }

  async finish(input: CollectorRunFinishInput): Promise<void> {
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - input.startedAt.getTime();

    await this.pool.execute(
      `UPDATE collector_runs
       SET finished_at = ?,
           duration_ms = ?,
           success = ?,
           records_collected = ?,
           sanitized_error_code = ?,
           retry_count = ?
       WHERE id = ?`,
      [
        finishedAt,
        durationMs,
        input.success,
        input.recordsCollected,
        input.sanitizedErrorCode ?? null,
        input.retryCount ?? 0,
        uuidToBin(input.runId)
      ]
    );
  }
}
