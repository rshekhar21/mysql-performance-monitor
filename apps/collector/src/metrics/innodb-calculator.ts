import { calculateBufferPoolHitRatio } from '@mysql-monitor/shared';
import { numberOrNull, type StatusMap } from './status-calculator.js';

export interface InnoDbSnapshotInput {
  collectedAt: Date;
  bufferPoolPagesTotal: number | null;
  bufferPoolPagesDirty: number | null;
  bufferPoolReadRequests: number | null;
  bufferPoolReads: number | null;
  bufferPoolHitRatio: number | null;
  rawStatus: StatusMap;
}

export function buildInnoDbSnapshot(status: StatusMap, collectedAt: Date): InnoDbSnapshotInput {
  const readRequests = numberOrNull(status.Innodb_buffer_pool_read_requests);
  const diskReads = numberOrNull(status.Innodb_buffer_pool_reads);

  return {
    collectedAt,
    bufferPoolPagesTotal: numberOrNull(status.Innodb_buffer_pool_pages_total),
    bufferPoolPagesDirty: numberOrNull(status.Innodb_buffer_pool_pages_dirty),
    bufferPoolReadRequests: readRequests,
    bufferPoolReads: diskReads,
    bufferPoolHitRatio:
      readRequests !== null && diskReads !== null
        ? calculateBufferPoolHitRatio(readRequests, diskReads)
        : null,
    rawStatus: status
  };
}
