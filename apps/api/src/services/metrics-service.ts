import { NotFoundError, ValidationError } from '../errors/app-error.js';
import type { MetricsRepository, MetricRange } from '../repositories/metrics-repository.js';
import type { MonitoredServerRepository } from '../repositories/monitored-server-repository.js';

const rangeDurationsMs = {
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000
} as const;

export type PresetRange = keyof typeof rangeDurationsMs;

export class MetricsService {
  constructor(
    private readonly servers: MonitoredServerRepository,
    private readonly metrics: MetricsRepository
  ) {}

  async overview(serverId: string) {
    await this.ensureServer(serverId);
    const overview = await this.metrics.getOverview(serverId);

    if (!overview) {
      throw new NotFoundError('Monitored server');
    }

    return overview;
  }

  async timeSeries(serverId: string, rangeName: string | undefined) {
    await this.ensureServer(serverId);
    return this.metrics.getTimeSeries(serverId, resolveRange(rangeName));
  }

  async databases(serverId: string, limit = 10) {
    await this.ensureServer(serverId);
    return this.metrics.getTopDatabases(serverId, limit);
  }

  async tables(serverId: string, limit = 10) {
    await this.ensureServer(serverId);
    return this.metrics.getTopTables(serverId, limit);
  }

  async storage(serverId: string, rangeName: string | undefined) {
    await this.ensureServer(serverId);
    return this.metrics.getStorageSeries(serverId, resolveRange(rangeName));
  }

  async collectorRuns(serverId: string, limit = 20) {
    await this.ensureServer(serverId);
    return this.metrics.getCollectorRuns(serverId, limit);
  }

  async queryDigests(serverId: string, limit = 25) {
    await this.ensureServer(serverId);
    return this.metrics.getQueryDigests(serverId, limit);
  }

  async replication(serverId: string) {
    await this.ensureServer(serverId);
    return this.metrics.getReplication(serverId);
  }

  private async ensureServer(serverId: string): Promise<void> {
    const server = await this.servers.findById(serverId);

    if (!server) {
      throw new NotFoundError('Monitored server');
    }
  }
}

function resolveRange(rangeName: string | undefined): MetricRange {
  const range = rangeName && rangeName in rangeDurationsMs ? (rangeName as PresetRange) : '1h';
  const end = new Date();
  const start = new Date(end.getTime() - rangeDurationsMs[range]);

  if (start >= end) {
    throw new ValidationError([{ path: ['range'], message: 'Invalid time range' }]);
  }

  return { start, end };
}
