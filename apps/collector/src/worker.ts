import { collectorConfig } from './config/env.js';
import { logger } from './config/logger.js';
import { applicationPool } from './db.js';
import { startHealthServer } from './health.js';
import { createCollectionJobs, Scheduler } from './jobs/scheduler.js';
import { MonitoredPoolManager } from './monitoring/monitored-pool-manager.js';
import { MySqlMonitoringAdapter } from './monitoring/mysql-adapter.js';
import { AlertEvaluationRepository } from './repositories/alert-evaluation-repository.js';
import { CollectorRunRepository } from './repositories/collector-run-repository.js';
import { MonitoredServerRepository } from './repositories/monitored-server-repository.js';
import { RetentionRepository } from './repositories/retention-repository.js';
import { SnapshotRepository } from './repositories/snapshot-repository.js';
import { CollectionService } from './services/collection-service.js';

const scheduler = new Scheduler();
const healthServer = startHealthServer(applicationPool, collectorConfig.COLLECTOR_HEALTH_PORT);
const monitoredPools = new MonitoredPoolManager();
const retentionRepository = new RetentionRepository(applicationPool);
const collectionService = new CollectionService(
  new MonitoredServerRepository(applicationPool),
  new CollectorRunRepository(applicationPool),
  new SnapshotRepository(applicationPool),
  new MySqlMonitoringAdapter(monitoredPools),
  new AlertEvaluationRepository(applicationPool)
);

scheduler.start(createCollectionJobs(collectionService, retentionRepository));
logger.info({ port: collectorConfig.COLLECTOR_HEALTH_PORT }, 'collector worker started');

function shutdown(signal: NodeJS.Signals): void {
  logger.info({ signal }, 'collector shutdown requested');
  scheduler.stop();
  healthServer.close((error) => {
    void (async () => {
      if (error) {
        logger.error({ err: error }, 'error closing collector health server');
        process.exitCode = 1;
      }

      await monitoredPools.shutdown();
      await applicationPool.end();
      logger.info('collector shutdown completed');
    })();
  });
}

process.on('SIGTERM', (signal) => {
  shutdown(signal);
});

process.on('SIGINT', (signal) => {
  shutdown(signal);
});
