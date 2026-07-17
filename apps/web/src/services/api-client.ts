import type {
  ApiResponse,
  AlertEventSummary,
  AlertRuleSummary,
  CollectorRunSummary,
  DatabaseSizeSummary,
  MonitoredServer,
  OverviewSummary,
  QueryDigestSummary,
  ReplicationSummary,
  RunningQuerySummary,
  TableSizeSummary,
  TimeSeriesPoint,
  User
} from '@mysql-monitor/types';

const viteEnv = import.meta.env as unknown as { VITE_API_BASE_URL?: string };
const configuredBaseUrl = viteEnv.VITE_API_BASE_URL ?? '';
const baseUrl = configuredBaseUrl.length > 0 ? configuredBaseUrl : 'http://localhost:4000';
const authTokenKey = 'authToken';

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
  alerts: () => request<{ alerts: AlertEventSummary[] }>('/api/v1/alerts'),
  alertRules: () => request<{ rules: AlertRuleSummary[] }>('/api/v1/alert-rules'),
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
  acknowledgeAlert: (alertId: string) =>
    request<{ ok: true }>(`/api/v1/alerts/${alertId}/acknowledge`, { method: 'POST' })
};
