import { createServer, type Server } from 'node:http';
import express from 'express';
import type { ApplicationPool } from '@mysql-monitor/database';

export function startHealthServer(pool: ApplicationPool, port: number): Server {
  const app = express();

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'collector' });
  });

  app.get('/ready', (_req, res, next) => {
    void pool
      .query('SELECT 1')
      .then(() => res.json({ status: 'ready', service: 'collector' }))
      .catch(next);
  });

  return createServer(app).listen(port);
}
