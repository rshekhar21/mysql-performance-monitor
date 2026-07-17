import type { Request, Response } from 'express';
import { applicationPool } from '../db/app-pool.js';
import { sendSuccess } from '../middleware/responses.js';

export class HealthController {
  health(_req: Request, res: Response): void {
    sendSuccess(res, { status: 'ok', service: 'api' });
  }

  async ready(_req: Request, res: Response): Promise<void> {
    await applicationPool.query('SELECT 1');
    sendSuccess(res, { status: 'ready', service: 'api' });
  }
}
