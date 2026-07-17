import type { Request, Response } from 'express';
import { sendSuccess } from '../middleware/responses.js';
import { auditLogRepository, settingsRepository, userRepository } from '../services/index.js';

export class AdminController {
  async users(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, { users: await userRepository.list() });
  }

  async auditLogs(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, { logs: await auditLogRepository.list() });
  }

  async settings(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, { settings: await settingsRepository.list() });
  }
}
