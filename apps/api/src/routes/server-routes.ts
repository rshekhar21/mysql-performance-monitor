import { Router } from 'express';
import {
  monitoredServerCreateSchema,
  monitoredServerUpdateSchema
} from '@mysql-monitor/validation';
import { MetricsController } from '../controllers/metrics-controller.js';
import { MonitoredServerController } from '../controllers/monitored-server-controller.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const controller = new MonitoredServerController();
const metricsController = new MetricsController();
export const serverRoutes = Router();

serverRoutes.use(authenticate);

serverRoutes.get('/', requirePermission('dashboard:read'), (req, res, next) => {
  void controller.list(req, res).catch(next);
});
serverRoutes.post(
  '/',
  requirePermission('servers:manage'),
  validateBody(monitoredServerCreateSchema),
  (req, res, next) => {
    void controller.create(req, res).catch(next);
  }
);
serverRoutes.post(
  '/test-connection',
  requirePermission('servers:manage'),
  validateBody(monitoredServerCreateSchema),
  (req, res, next) => {
    void controller.testConnection(req, res).catch(next);
  }
);
serverRoutes.get('/:serverId', requirePermission('dashboard:read'), (req, res, next) => {
  void controller.get(req, res).catch(next);
});
serverRoutes.get('/:serverId/overview', requirePermission('dashboard:read'), (req, res, next) => {
  void metricsController.overview(req, res).catch(next);
});
serverRoutes.get('/:serverId/metrics', requirePermission('dashboard:read'), (req, res, next) => {
  void metricsController.metrics(req, res).catch(next);
});
serverRoutes.get('/:serverId/databases', requirePermission('dashboard:read'), (req, res, next) => {
  void metricsController.databases(req, res).catch(next);
});
serverRoutes.get('/:serverId/tables', requirePermission('dashboard:read'), (req, res, next) => {
  void metricsController.tables(req, res).catch(next);
});
serverRoutes.get(
  '/:serverId/storage-history',
  requirePermission('dashboard:read'),
  (req, res, next) => {
    void metricsController.storage(req, res).catch(next);
  }
);
serverRoutes.get(
  '/:serverId/collector-runs',
  requirePermission('dashboard:read'),
  (req, res, next) => {
    void metricsController.collectorRuns(req, res).catch(next);
  }
);
serverRoutes.get(
  '/:serverId/query-performance',
  requirePermission('running_queries:read'),
  (req, res, next) => {
    void metricsController.queryPerformance(req, res).catch(next);
  }
);
serverRoutes.get(
  '/:serverId/running-queries',
  requirePermission('running_queries:read'),
  (req, res, next) => {
    void metricsController.runningQueries(req, res).catch(next);
  }
);
serverRoutes.get(
  '/:serverId/replication',
  requirePermission('dashboard:read'),
  (req, res, next) => {
    void metricsController.replication(req, res).catch(next);
  }
);
serverRoutes.get('/:serverId/innodb', requirePermission('dashboard:read'), (req, res, next) => {
  void metricsController.innoDb(req, res).catch(next);
});
serverRoutes.patch(
  '/:serverId',
  requirePermission('servers:manage'),
  validateBody(monitoredServerUpdateSchema),
  (req, res, next) => {
    void controller.update(req, res).catch(next);
  }
);
serverRoutes.delete('/:serverId', requirePermission('servers:manage'), (req, res, next) => {
  void controller.delete(req, res).catch(next);
});
serverRoutes.post(
  '/:serverId/test-connection',
  requirePermission('servers:manage'),
  (req, res, next) => {
    void controller.testStoredConnection(req, res).catch(next);
  }
);
