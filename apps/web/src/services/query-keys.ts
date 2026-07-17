export const queryKeys = {
  health: ['health'] as const,
  servers: ['servers'] as const,
  overview: (serverId: string) => ['servers', serverId, 'overview'] as const,
  metrics: (serverId: string, range: string) => ['servers', serverId, 'metrics', range] as const,
  databases: (serverId: string) => ['servers', serverId, 'databases'] as const,
  tables: (serverId: string) => ['servers', serverId, 'tables'] as const,
  storage: (serverId: string, range: string) => ['servers', serverId, 'storage', range] as const,
  collectorRuns: (serverId: string) => ['servers', serverId, 'collector-runs'] as const,
  queryPerformance: (serverId: string) => ['servers', serverId, 'query-performance'] as const,
  runningQueries: (serverId: string) => ['servers', serverId, 'running-queries'] as const,
  replication: (serverId: string) => ['servers', serverId, 'replication'] as const,
  innoDb: (serverId: string) => ['servers', serverId, 'innodb'] as const,
  alerts: ['alerts'] as const,
  alertRules: ['alert-rules'] as const,
  users: ['users'] as const,
  auditLogs: ['audit-logs'] as const,
  settings: ['settings'] as const
};
