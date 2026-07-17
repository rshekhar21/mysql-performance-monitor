import { describe, expect, it } from 'vitest';
import {
  calculateBufferPoolHitRatio,
  calculateCounterRate,
  calculatePercentage,
  calculateStorageGrowthRateBytesPerDay
} from './metrics.js';

describe('metric calculations', () => {
  it('returns no rate for the first counter snapshot', () => {
    const result = calculateCounterRate({
      previousValue: null,
      currentValue: 100,
      previousCollectedAt: null,
      currentCollectedAt: new Date('2026-01-01T00:00:15Z')
    });

    expect(result).toMatchObject({ rate: null, reason: 'first_snapshot' });
  });

  it('calculates a per-second counter rate', () => {
    const result = calculateCounterRate({
      previousValue: 100,
      currentValue: 160,
      previousCollectedAt: new Date('2026-01-01T00:00:00Z'),
      currentCollectedAt: new Date('2026-01-01T00:00:15Z')
    });

    expect(result.rate).toBe(4);
    expect(result.delta).toBe(60);
  });

  it('detects counter reset from lower values', () => {
    const result = calculateCounterRate({
      previousValue: 160,
      currentValue: 20,
      previousCollectedAt: new Date('2026-01-01T00:00:00Z'),
      currentCollectedAt: new Date('2026-01-01T00:00:15Z')
    });

    expect(result).toMatchObject({ rate: null, reason: 'counter_reset' });
  });

  it('detects server restart from uptime', () => {
    const result = calculateCounterRate({
      previousValue: 100,
      currentValue: 120,
      previousCollectedAt: new Date('2026-01-01T00:00:00Z'),
      currentCollectedAt: new Date('2026-01-01T00:00:15Z'),
      previousUptimeSeconds: 1000,
      currentUptimeSeconds: 5
    });

    expect(result).toMatchObject({ rate: null, reason: 'counter_reset' });
  });

  it('calculates reusable ratios', () => {
    expect(calculatePercentage(25, 100)).toBe(25);
    expect(calculateBufferPoolHitRatio(1000, 3)).toBeCloseTo(99.7);
    expect(calculateStorageGrowthRateBytesPerDay(100, 200, 86_400)).toBe(100);
  });
});
