import { collectorConfig } from '../config/env.js';
import { logger } from '../config/logger.js';
import { buildInnoDbSnapshot } from '../metrics/innodb-calculator.js';
import { buildServerStatusSnapshot } from '../metrics/status-calculator.js';
import type { MySqlMonitoringAdapter } from '../monitoring/mysql-adapter.js';
import type { AlertEvaluationRepository } from '../repositories/alert-evaluation-repository.js';
import type { CollectorRunRepository } from '../repositories/collector-run-repository.js';
import type {
  CollectorMonitoredServer,
  MonitoredServerRepository
} from '../repositories/monitored-server-repository.js';
import type { SnapshotRepository } from '../repositories/snapshot-repository.js';

export type MetricGroup =
  | 'capabilities'
  | 'status'
  | 'innodb'
  | 'database_sizes'
  | 'table_sizes'
  | 'query_digests'
  | 'replication';

export class CollectionService {
  constructor(
    private readonly servers: MonitoredServerRepository,
    private readonly runs: CollectorRunRepository,
    private readonly snapshots: SnapshotRepository,
    private readonly adapter: MySqlMonitoringAdapter,
    private readonly alerts: AlertEvaluationRepository
  ) {}

  async collectAll(metricGroup: MetricGroup): Promise<void> {
    const servers = await this.servers.listEnabled();
    const chunks = chunk(servers, collectorConfig.COLLECTOR_CONCURRENCY);

    for (const group of chunks) {
      await Promise.all(group.map((server) => this.collectServer(server, metricGroup)));
    }
  }

  private async collectServer(
    server: CollectorMonitoredServer,
    metricGroup: MetricGroup
  ): Promise<void> {
    const acquired = await this.runs.acquireLock(server.id, metricGroup);

    if (!acquired) {
      logger.info({ serverId: server.id, metricGroup }, 'collector run skipped due to active lock');
      return;
    }

    const startedAt = new Date();
    const runId = await this.runs.start(server.id, metricGroup, startedAt);

    try {
      const recordsCollected = await this.collectByGroup(server, metricGroup);
      await this.runs.finish({
        runId,
        startedAt,
        success: true,
        recordsCollected
      });
    } catch (error) {
      await this.servers.markUnavailable(server.id);
      await this.runs.finish({
        runId,
        startedAt,
        success: false,
        recordsCollected: 0,
        sanitizedErrorCode: sanitizeError(error)
      });
      logger.warn({ err: error, serverId: server.id, metricGroup }, 'collector run failed');
    } finally {
      await this.runs.releaseLock(server.id, metricGroup);
    }
  }

  private async collectByGroup(
    server: CollectorMonitoredServer,
    metricGroup: MetricGroup
  ): Promise<number> {
    if (metricGroup === 'capabilities') {
      const capabilities = await this.adapter.detectCapabilities(server);
      await this.servers.markCapabilities(server.id, capabilities);
      return 1;
    }

    if (metricGroup === 'status') {
      const collectedAt = new Date();
      const [status, variables, previous] = await Promise.all([
        this.adapter.getGlobalStatus(server, [
          'Uptime',
          'Threads_connected',
          'Threads_running',
          'Max_used_connections',
          'Questions',
          'Queries',
          'Bytes_received',
          'Bytes_sent'
        ]),
        this.adapter.getVariables(server, ['max_connections']),
        this.snapshots.getLatestStatus(server.id)
      ]);
      const snapshot = buildServerStatusSnapshot(status, variables, collectedAt, previous);
      await this.snapshots.insertServerStatus(server.id, snapshot);
      await this.servers.markAvailable(server.id);
      await this.alerts.evaluate(server.id);
      return 1;
    }

    if (metricGroup === 'innodb') {
      const collectedAt = new Date();
      const status = await this.adapter.getGlobalStatus(server, [
        'Innodb_buffer_pool_pages_total',
        'Innodb_buffer_pool_pages_dirty',
        'Innodb_buffer_pool_read_requests',
        'Innodb_buffer_pool_reads'
      ]);
      await this.snapshots.insertInnoDb(server.id, buildInnoDbSnapshot(status, collectedAt));
      await this.alerts.evaluate(server.id);
      return 1;
    }

    if (metricGroup === 'database_sizes') {
      return this.snapshots.insertDatabaseSizes(
        server.id,
        new Date(),
        await this.adapter.getDatabaseSizes(server)
      );
    }

    if (metricGroup === 'table_sizes') {
      return this.snapshots.insertTableSizes(
        server.id,
        new Date(),
        await this.adapter.getTableSizes(server)
      );
    }

    if (metricGroup === 'query_digests') {
      return this.snapshots.insertQueryDigests(
        server.id,
        new Date(),
        await this.adapter.getQueryDigests(server)
      );
    }

    await this.snapshots.insertReplication(
      server.id,
      new Date(),
      await this.adapter.getReplication(server)
    );
    await this.alerts.evaluate(server.id);
    return 1;
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function sanitizeError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code.slice(0, 120) : 'UNKNOWN_COLLECTOR_ERROR';
  }

  return error instanceof Error ? error.name.slice(0, 120) : 'UNKNOWN_COLLECTOR_ERROR';
}
