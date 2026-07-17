export interface CounterRateInput {
  previousValue: number | null;
  currentValue: number | null;
  previousCollectedAt: Date | null;
  currentCollectedAt: Date;
  previousUptimeSeconds?: number | null;
  currentUptimeSeconds?: number | null;
  maxGapSeconds?: number;
}

export interface CounterRateResult {
  rate: number | null;
  delta: number | null;
  elapsedSeconds: number | null;
  reason?:
    'first_snapshot' | 'missing_counter' | 'duplicate_snapshot' | 'counter_reset' | 'gap_too_large';
}

export function calculateCounterRate(input: CounterRateInput): CounterRateResult {
  if (
    input.previousValue === null ||
    input.currentValue === null ||
    input.previousCollectedAt === null
  ) {
    return { rate: null, delta: null, elapsedSeconds: null, reason: 'first_snapshot' };
  }

  const elapsedSeconds =
    (input.currentCollectedAt.getTime() - input.previousCollectedAt.getTime()) / 1000;

  if (elapsedSeconds <= 0) {
    return { rate: null, delta: null, elapsedSeconds, reason: 'duplicate_snapshot' };
  }

  if (input.maxGapSeconds !== undefined && elapsedSeconds > input.maxGapSeconds) {
    return { rate: null, delta: null, elapsedSeconds, reason: 'gap_too_large' };
  }

  const restarted =
    input.previousUptimeSeconds !== null &&
    input.previousUptimeSeconds !== undefined &&
    input.currentUptimeSeconds !== null &&
    input.currentUptimeSeconds !== undefined &&
    input.currentUptimeSeconds < input.previousUptimeSeconds;

  const delta = input.currentValue - input.previousValue;

  if (restarted || delta < 0) {
    return { rate: null, delta: null, elapsedSeconds, reason: 'counter_reset' };
  }

  return { rate: delta / elapsedSeconds, delta, elapsedSeconds };
}

export function calculatePercentage(numerator: number, denominator: number): number | null {
  if (denominator <= 0) {
    return null;
  }

  return (numerator / denominator) * 100;
}

export function calculateBufferPoolHitRatio(
  readRequests: number,
  diskReads: number
): number | null {
  if (readRequests <= 0 || diskReads < 0) {
    return null;
  }

  return Math.max(0, (1 - diskReads / readRequests) * 100);
}

export function calculateStorageGrowthRateBytesPerDay(
  previousBytes: number,
  currentBytes: number,
  elapsedSeconds: number
): number | null {
  if (elapsedSeconds <= 0 || currentBytes < previousBytes) {
    return null;
  }

  return ((currentBytes - previousBytes) / elapsedSeconds) * 86_400;
}
