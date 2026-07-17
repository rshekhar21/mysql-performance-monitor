import type { Request, Response } from 'express';
import type { LoginInput } from '@mysql-monitor/validation';
import { sendSuccess } from '../middleware/responses.js';
import { authService } from '../services/index.js';

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    const body = req.body as LoginInput;
    const result = await authService.login(body.email, body.password);
    sendSuccess(res, result);
  }

  me(req: Request, res: Response): void {
    sendSuccess(res, { user: req.user });
  }

  logout(_req: Request, res: Response): void {
    sendSuccess(res, { ok: true });
  }
}
