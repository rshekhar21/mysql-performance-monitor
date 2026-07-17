import { createServer } from 'node:http';
import { apiConfig } from './config/env.js';
import { logger } from './config/logger.js';
import { applicationPool } from './db/app-pool.js';
import { createApp } from './app.js';

const app = createApp();
const server = createServer(app);

server.listen(apiConfig.API_PORT, () => {
  logger.info({ port: apiConfig.API_PORT }, 'api server listening');
});

function shutdown(signal: NodeJS.Signals): void {
  logger.info({ signal }, 'api shutdown requested');
  server.close((error) => {
    void (async () => {
      if (error) {
        logger.error({ err: error }, 'error closing api server');
        process.exitCode = 1;
      }

      await applicationPool.end();
      logger.info('api shutdown completed');
    })();
  });
}

process.on('SIGTERM', (signal) => {
  shutdown(signal);
});

process.on('SIGINT', (signal) => {
  shutdown(signal);
});
