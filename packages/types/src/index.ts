export type RoleName = 'super_admin' | 'administrator' | 'operator' | 'viewer';

export type Permission =
  | 'dashboard:read'
  | 'reports:read'
  | 'alerts:acknowledge'
  | 'running_queries:read'
  | 'servers:manage'
  | 'collectors:manage'
  | 'alerts:manage'
  | 'users:manage'
  | 'audit:read'
  | 'settings:manage';

export type AlertSeverity = 'normal' | 'warning' | 'critical';

export type MonitoredServerStatus = 'enabled' | 'disabled' | 'unavailable';

export interface ApiSuccess<TData, TMeta = Record<string, never>> {
  success: true;
  data: TData;
  meta: TMeta;
  requestId: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
  requestId: string;
}

export type ApiResponse<TData, TMeta = Record<string, never>> = ApiSuccess<TData, TMeta> | ApiError;

export interface User {
  id: string;
  email: string;
  displayName: string;
  disabled: boolean;
  roles: RoleName[];
  createdAt: string;
  updatedAt: string;
}

export interface MonitoredServer {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  sslMode: 'disabled' | 'preferred' | 'required';
  status: MonitoredServerStatus;
  environment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MetricPoint {
  collectedAt: string;
  metricKey: string;
  value: number | null;
  unit: string;
}

export interface OverviewSummary {
  serverStatus: MonitoredServerStatus | 'unknown';
  uptimeSeconds: number | null;
  mysqlVersion: string | null;
  activeConnections: number | null;
  connectionUtilization: number | null;
  runningThreads: number | null;
  queriesPerSecond: number | null;
  slowQueryRate: number | null;
  currentDatabaseSizeBytes: number | null;
  unresolvedAlerts: number;
  lastSuccessfulCollectionAt: string | null;
  lastCollectedAt: string | null;
}

export interface TimeSeriesPoint {
  collectedAt: string;
  [metricKey: string]: string | number | null;
}

export interface DatabaseSizeSummary {
  databaseName: string;
  dataLengthBytes: number;
  indexLengthBytes: number;
  totalBytes: number;
  tableCount: number;
  collectedAt: string;
}

export interface TableSizeSummary {
  databaseName: string;
  tableName: string;
  engine: string | null;
  tableRows: number | null;
  dataLengthBytes: number;
  indexLengthBytes: number;
  dataFreeBytes: number;
  totalBytes: number;
  collectedAt: string;
}

export interface CollectorRunSummary {
  id: string;
  serverId: string;
  metricGroup: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  success: boolean;
  recordsCollected: number;
  sanitizedErrorCode: string | null;
}

export interface QueryDigestSummary {
  schemaName: string | null;
  digest: string;
  digestText: string | null;
  executionCount: number;
  totalTimerWait: number | null;
  averageTimerWait: number | null;
  maxTimerWait: number | null;
  rowsExamined: number | null;
  rowsSent: number | null;
  collectedAt: string;
}

export interface RunningQuerySummary {
  connectionId: number;
  user: string | null;
  host: string | null;
  database: string | null;
  command: string | null;
  runtimeSeconds: number | null;
  state: string | null;
  queryText: string | null;
}

export interface ReplicationSummary {
  replicationAvailable: boolean;
  ioThreadRunning: boolean | null;
  sqlThreadRunning: boolean | null;
  lagSeconds: number | null;
  collectedAt: string;
}

export type AlertEventStatus = 'open' | 'acknowledged' | 'resolved';

export interface AlertRuleSummary {
  id: string;
  serverId: string | null;
  name: string;
  metricKey: string;
  enabled: boolean;
  warningThreshold: number | null;
  criticalThreshold: number | null;
  evaluationWindowSeconds: number;
  minimumConsecutiveFailures: number;
  cooldownSeconds: number;
  autoResolve: boolean;
  description: string | null;
  remediation: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlertEventSummary {
  id: string;
  alertRuleId: string;
  serverId: string | null;
  severity: AlertSeverity;
  status: AlertEventStatus;
  message: string;
  fingerprint: string;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt: string | null;
}
