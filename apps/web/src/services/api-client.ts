import type {
  ApiResponse,
  AppSettingSummary,
  AuditLogSummary,
  AlertEventSummary,
  AlertRuleSummary,
  CollectorRunSummary,
  DatabaseSizeSummary,
  InnoDbSummary,
  MonitoredServer,
  OverviewSummary,
  QueryDigestSummary,
  ReplicationSummary,
  RunningQuerySummary,
  TableSizeSummary,
  TimeSeriesPoint,
  User,
  UserSummary
} from '@mysql-monitor/types';
import type {
  MonitoredServerCreateInput,
  MonitoredServerUpdateInput,
  AlertRuleUpdateInput
} from '@mysql-monitor/validation';

const viteEnv = import.meta.env as unknown as { PROD?: boolean; VITE_API_BASE_URL?: string };
const configuredBaseUrl = viteEnv.VITE_API_BASE_URL ?? '';
const baseUrl = configuredBaseUrl.length > 0 ? configuredBaseUrl : developmentBaseUrl();
const authTokenKey = 'authToken';

function developmentBaseUrl(): string {
  if (viteEnv.PROD) {
    throw new Error('VITE_API_BASE_URL is required for production builds');
  }

  return 'http://localhost:4000';
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
  }
}

export const authTokenStorage = {
  get(): string | null {
    return localStorage.getItem(authTokenKey);
  },
  set(token: string): void {
    localStorage.setItem(authTokenKey, token);
  },
  clear(): void {
    localStorage.removeItem(authTokenKey);
  }
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = authTokenStorage.get();
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    }
  });
  const payload = (await response.json()) as ApiResponse<T>;

  if (!payload.success) {
    throw new ApiClientError(payload.error.message, response.status, payload.error.code);
  }

  return payload.data;
}

export const apiClient = {
  health: () => request<{ status: string; service: string }>('/health'),
  login: (input: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(input)
    }),
  logout: () => request<{ ok: true }>('/api/v1/auth/logout', { method: 'POST' }),
  me: () => request<{ user: User }>('/api/v1/auth/me'),
  servers: () => request<{ servers: MonitoredServer[] }>('/api/v1/servers'),
  createServer: (input: MonitoredServerCreateInput) =>
    request<{ server: MonitoredServer }>('/api/v1/servers', {
      method: 'POST',
      body: JSON.stringify(input)
    }),
  updateServer: (serverId: string, input: MonitoredServerUpdateInput) =>
    request<{ server: MonitoredServer }>(`/api/v1/servers/${serverId}`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    }),
  deleteServer: (serverId: string) =>
    request<{ ok: true }>(`/api/v1/servers/${serverId}`, { method: 'DELETE' }),
  testServerConnection: (input: MonitoredServerCreateInput) =>
    request<{ ok: true }>('/api/v1/servers/test-connection', {
      method: 'POST',
      body: JSON.stringify(input)
    }),
  testStoredServerConnection: (serverId: string) =>
    request<{ ok: true }>(`/api/v1/servers/${serverId}/test-connection`, { method: 'POST' }),
  overview: (serverId: string) =>
    request<{ overview: OverviewSummary }>(`/api/v1/servers/${serverId}/overview`),
  metrics: (serverId: string, range: string) =>
    request<{ points: TimeSeriesPoint[] }>(`/api/v1/servers/${serverId}/metrics?range=${range}`),
  databases: (serverId: string, limit = 10) =>
    request<{ databases: DatabaseSizeSummary[] }>(
      `/api/v1/servers/${serverId}/databases?limit=${limit}`
    ),
  tables: (serverId: string, limit = 10) =>
    request<{ tables: TableSizeSummary[] }>(`/api/v1/servers/${serverId}/tables?limit=${limit}`),
  storage: (serverId: string, range: string) =>
    request<{ points: TimeSeriesPoint[] }>(
      `/api/v1/servers/${serverId}/storage-history?range=${range}`
    ),
  collectorRuns: (serverId: string, limit = 20) =>
    request<{ runs: CollectorRunSummary[] }>(
      `/api/v1/servers/${serverId}/collector-runs?limit=${limit}`
    ),
  queryPerformance: (serverId: string, limit = 25) =>
    request<{ digests: QueryDigestSummary[] }>(
      `/api/v1/servers/${serverId}/query-performance?limit=${limit}`
    ),
  runningQueries: (serverId: string) =>
    request<{ queries: RunningQuerySummary[] }>(`/api/v1/servers/${serverId}/running-queries`),
  replication: (serverId: string) =>
    request<{ replication: ReplicationSummary | null }>(`/api/v1/servers/${serverId}/replication`),
  innoDb: (serverId: string) =>
    request<{ innodb: InnoDbSummary | null }>(`/api/v1/servers/${serverId}/innodb`),
  alerts: () => request<{ alerts: AlertEventSummary[] }>('/api/v1/alerts'),
  alertRules: () => request<{ rules: AlertRuleSummary[] }>('/api/v1/alert-rules'),
  users: () => request<{ users: UserSummary[] }>('/api/v1/users'),
  auditLogs: () => request<{ logs: AuditLogSummary[] }>('/api/v1/audit-logs'),
  settings: () => request<{ settings: AppSettingSummary[] }>('/api/v1/settings'),
  createAlertRule: (input: {
    name: string;
    metricKey: string;
    serverId?: string | null;
    warningThreshold?: number | null;
    criticalThreshold?: number | null;
  }) =>
    request<{ rule: AlertRuleSummary }>('/api/v1/alert-rules', {
      method: 'POST',
      body: JSON.stringify(input)
    }),
  updateAlertRule: (ruleId: string, input: AlertRuleUpdateInput) =>
    request<{ rule: AlertRuleSummary }>(`/api/v1/alert-rules/${ruleId}`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    }),
  deleteAlertRule: (ruleId: string) =>
    request<{ ok: true }>(`/api/v1/alert-rules/${ruleId}`, { method: 'DELETE' }),
  acknowledgeAlert: (alertId: string) =>
    request<{ ok: true }>(`/api/v1/alerts/${alertId}/acknowledge`, { method: 'POST' })
};
