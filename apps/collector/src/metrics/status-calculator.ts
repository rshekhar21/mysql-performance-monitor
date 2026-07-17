import { calculateCounterRate } from '@mysql-monitor/shared';

export type StatusMap = Record<string, string>;

export interface PreviousStatusSnapshot {
  collectedAt: Date;
  uptimeSeconds: number | null;
  questions: number | null;
  queries: number | null;
  bytesReceived: number | null;
  bytesSent: number | null;
}

export interface ServerStatusSnapshotInput {
  collectedAt: Date;
  uptimeSeconds: number | null;
  threadsConnected: number | null;
  threadsRunning: number | null;
  maxUsedConnections: number | null;
  maxConnections: number | null;
  questions: number | null;
  queries: number | null;
  bytesReceived: number | null;
  bytesSent: number | null;
  questionsPerSecond: number | null;
  queriesPerSecond: number | null;
  bytesReceivedPerSecond: number | null;
  bytesSentPerSecond: number | null;
  rawStatus: StatusMap;
}

const maxRateGapSeconds = 300;

export function buildServerStatusSnapshot(
  status: StatusMap,
  variables: StatusMap,
  collectedAt: Date,
  previous: PreviousStatusSnapshot | null
): ServerStatusSnapshotInput {
  const uptimeSeconds = numberOrNull(status.Uptime);
  const questions = numberOrNull(status.Questions);
  const queries = numberOrNull(status.Queries);
  const bytesReceived = numberOrNull(status.Bytes_received);
  const bytesSent = numberOrNull(status.Bytes_sent);

  return {
    collectedAt,
    uptimeSeconds,
    threadsConnected: numberOrNull(status.Threads_connected),
    threadsRunning: numberOrNull(status.Threads_running),
    maxUsedConnections: numberOrNull(status.Max_used_connections),
    maxConnections: numberOrNull(variables.max_connections),
    questions,
    queries,
    bytesReceived,
    bytesSent,
    questionsPerSecond: rate(
      previous?.questions ?? null,
      questions,
      previous,
      collectedAt,
      uptimeSeconds
    ),
    queriesPerSecond: rate(
      previous?.queries ?? null,
      queries,
      previous,
      collectedAt,
      uptimeSeconds
    ),
    bytesReceivedPerSecond: rate(
      previous?.bytesReceived ?? null,
      bytesReceived,
      previous,
      collectedAt,
      uptimeSeconds
    ),
    bytesSentPerSecond: rate(
      previous?.bytesSent ?? null,
      bytesSent,
      previous,
      collectedAt,
      uptimeSeconds
    ),
    rawStatus: status
  };
}

export function numberOrNull(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function rate(
  previousValue: number | null,
  currentValue: number | null,
  previous: PreviousStatusSnapshot | null,
  collectedAt: Date,
  uptimeSeconds: number | null
): number | null {
  return calculateCounterRate({
    previousValue,
    currentValue,
    previousCollectedAt: previous?.collectedAt ?? null,
    currentCollectedAt: collectedAt,
    previousUptimeSeconds: previous?.uptimeSeconds ?? null,
    currentUptimeSeconds: uptimeSeconds,
    maxGapSeconds: maxRateGapSeconds
  }).rate;
}
