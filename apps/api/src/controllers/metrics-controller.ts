import type { Request, Response } from 'express';
import { ValidationError } from '../errors/app-error.js';
import { sendSuccess } from '../middleware/responses.js';
import { liveMySqlService, metricsService } from '../services/index.js';

export class MetricsController {
  async overview(req: Request, res: Response): Promise<void> {
    sendSuccess(res, { overview: await metricsService.overview(getServerId(req)) });
  }

  async metrics(req: Request, res: Response): Promise<void> {
    sendSuccess(res, {
      points: await metricsService.timeSeries(getServerId(req), queryString(req, 'range'))
    });
  }

  async databases(req: Request, res: Response): Promise<void> {
    sendSuccess(res, {
      databases: await metricsService.databases(getServerId(req), queryNumber(req, 'limit', 10))
    });
  }

  async tables(req: Request, res: Response): Promise<void> {
    sendSuccess(res, {
      tables: await metricsService.tables(getServerId(req), queryNumber(req, 'limit', 10))
    });
  }

  async storage(req: Request, res: Response): Promise<void> {
    sendSuccess(res, {
      points: await metricsService.storage(getServerId(req), queryString(req, 'range'))
    });
  }

  async collectorRuns(req: Request, res: Response): Promise<void> {
    sendSuccess(res, {
      runs: await metricsService.collectorRuns(getServerId(req), queryNumber(req, 'limit', 20))
    });
  }

  async queryPerformance(req: Request, res: Response): Promise<void> {
    sendSuccess(res, {
      digests: await metricsService.queryDigests(getServerId(req), queryNumber(req, 'limit', 25))
    });
  }

  async runningQueries(req: Request, res: Response): Promise<void> {
    sendSuccess(res, { queries: await liveMySqlService.runningQueries(getServerId(req)) });
  }

  async replication(req: Request, res: Response): Promise<void> {
    sendSuccess(res, { replication: await metricsService.replication(getServerId(req)) });
  }
}

function getServerId(req: Request): string {
  const serverId = req.params.serverId;

  if (typeof serverId !== 'string') {
    throw new ValidationError([{ path: ['serverId'], message: 'serverId is required' }]);
  }

  return serverId;
}

function queryString(req: Request, key: string): string | undefined {
  const value = req.query[key];

  return typeof value === 'string' ? value : undefined;
}

function queryNumber(req: Request, key: string, fallback: number): number {
  const value = req.query[key];

  if (typeof value !== 'string') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 100 ? parsed : fallback;
}
