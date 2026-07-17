import { describe, expect, it } from 'vitest';
import { buildInnoDbSnapshot } from './innodb-calculator.js';

describe('buildInnoDbSnapshot', () => {
  it('maps InnoDB gauges and calculates buffer pool hit ratio', () => {
    const snapshot = buildInnoDbSnapshot(
      {
        Innodb_buffer_pool_pages_total: '100',
        Innodb_buffer_pool_pages_dirty: '5',
        Innodb_buffer_pool_read_requests: '1000',
        Innodb_buffer_pool_reads: '2'
      },
      new Date('2026-01-01T00:00:00Z')
    );

    expect(snapshot.bufferPoolPagesTotal).toBe(100);
    expect(snapshot.bufferPoolPagesDirty).toBe(5);
    expect(snapshot.bufferPoolHitRatio).toBeCloseTo(99.8);
  });
});
