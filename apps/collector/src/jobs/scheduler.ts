import { logger } from '../config/logger.js';
import { collectorConfig } from '../config/env.js';
import type { CollectionService, MetricGroup } from '../services/collection-service.js';
import type { RetentionRepository } from '../repositories/retention-repository.js';

export interface ScheduledJob {
  name: string;
  intervalMs: number;
  run: () => Promise<void>;
}

export class Scheduler {
  private readonly timers: NodeJS.Timeout[] = [];
  private stopping = false;

  start(jobs: ScheduledJob[]): void {
    for (const job of jobs) {
      const timer = setInterval(() => {
        if (this.stopping) {
          return;
        }

        void job.run().catch((error: unknown) => {
          logger.error({ err: error, job: job.name }, 'scheduled job failed');
        });
      }, job.intervalMs);

      timer.unref();
      this.timers.push(timer);
      void job.run().catch((error: unknown) => {
        logger.error({ err: error, job: job.name }, 'initial scheduled job failed');
      });
    }
  }

  stop(): void {
    this.stopping = true;
    for (const timer of this.timers) {
      clearInterval(timer);
    }
  }
}

export function createCollectionJobs(
  collectionService: CollectionService,
  retentionRepository: RetentionRepository
): ScheduledJob[] {
  const jobs: Array<{ metricGroup: MetricGroup; intervalMs: number }> = [
    { metricGroup: 'capabilities', intervalMs: 300_000 },
    { metricGroup: 'status', intervalMs: collectorConfig.COLLECT_STATUS_INTERVAL_MS },
    { metricGroup: 'innodb', intervalMs: collectorConfig.COLLECT_INNODB_INTERVAL_MS },
    { metricGroup: 'replication', intervalMs: collectorConfig.COLLECT_REPLICATION_INTERVAL_MS },
    { metricGroup: 'query_digests', intervalMs: collectorConfig.COLLECT_QUERY_DIGEST_INTERVAL_MS },
    { metricGroup: 'database_sizes', intervalMs: collectorConfig.COLLECT_STORAGE_INTERVAL_MS },
    { metricGroup: 'table_sizes', intervalMs: collectorConfig.COLLECT_TABLE_SIZE_INTERVAL_MS }
  ];

  return [
    ...jobs.map((job) => ({
      name: `collect-${job.metricGroup}`,
      intervalMs: job.intervalMs,
      async run() {
        await collectionService.collectAll(job.metricGroup);
      }
    })),
    {
      name: 'retention-cleanup',
      intervalMs: 86_400_000,
      async run() {
        const result = await retentionRepository.cleanup({
          highFrequencyDays: collectorConfig.RETENTION_HIGH_FREQUENCY_DAYS,
          storageDays: collectorConfig.RETENTION_STORAGE_DAYS,
          collectorRunDays: collectorConfig.RETENTION_COLLECTOR_RUN_DAYS
        });
        logger.info({ result }, 'retention cleanup completed');
      }
    }
  ];
}
