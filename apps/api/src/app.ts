import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { apiConfig } from './config/env.js';
import { logger } from './config/logger.js';
import { HealthController } from './controllers/health-controller.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { apiRoutes } from './routes/index.js';

const healthController = new HealthController();

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      customProps: (req: express.Request) => ({ requestId: req.requestId }),
      redact: ['req.headers.authorization', 'req.headers.cookie']
    })
  );
  app.use(helmet());
  app.use(
    cors({
      origin: apiConfig.CORS_ORIGIN,
      credentials: true
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (req, res) => healthController.health(req, res));
  app.get('/ready', (req, res, next) => {
    void healthController.ready(req, res).catch(next);
  });

  app.get('/openapi.json', (_req, res) => {
    res.json({
      openapi: '3.1.0',
      info: {
        title: 'MySQL Performance Monitor API',
        version: '0.1.0'
      },
      paths: {
        '/api/v1/auth/login': { post: { summary: 'Authenticate a user' } },
        '/api/v1/auth/logout': { post: { summary: 'Log out the current user' } },
        '/api/v1/auth/me': { get: { summary: 'Return the current user principal' } },
        '/api/v1/servers': {
          get: { summary: 'List monitored servers' },
          post: { summary: 'Create a monitored server' }
        },
        '/api/v1/servers/test-connection': {
          post: { summary: 'Test a new monitored-server connection' }
        },
        '/api/v1/servers/{serverId}/test-connection': {
          post: { summary: 'Test an existing monitored-server connection' }
        },
        '/api/v1/servers/{serverId}/overview': {
          get: { summary: 'Return latest operational overview from collector snapshots' }
        },
        '/api/v1/servers/{serverId}/metrics': {
          get: { summary: 'Return bounded time-series server status metrics' }
        },
        '/api/v1/servers/{serverId}/databases': {
          get: { summary: 'Return latest database size summaries' }
        },
        '/api/v1/servers/{serverId}/tables': {
          get: { summary: 'Return latest table size summaries' }
        },
        '/api/v1/servers/{serverId}/storage-history': {
          get: { summary: 'Return total storage history' }
        },
        '/api/v1/servers/{serverId}/collector-runs': {
          get: { summary: 'Return recent collector runs' }
        }
      }
    });
  });

  app.use('/api/v1', apiRoutes);
  app.use(errorHandler);

  return app;
}
