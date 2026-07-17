import type { Request, Response } from 'express';
import type { AlertRuleCreateInput } from '@mysql-monitor/validation';
import { AuthenticationError, ValidationError } from '../errors/app-error.js';
import { sendSuccess } from '../middleware/responses.js';
import { alertService } from '../services/index.js';

export class AlertController {
  async listEvents(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, { alerts: await alertService.listEvents() });
  }

  async acknowledge(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AuthenticationError();
    }

    await alertService.acknowledge(getAlertId(req), req.user.id);
    sendSuccess(res, { ok: true });
  }

  async listRules(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, { rules: await alertService.listRules() });
  }

  async createRule(req: Request, res: Response): Promise<void> {
    const body = req.body as AlertRuleCreateInput;
    sendSuccess(res, { rule: await alertService.createRule(body) }, {}, 201);
  }
}

function getAlertId(req: Request): string {
  const alertId = req.params.alertId;

  if (typeof alertId !== 'string') {
    throw new ValidationError([{ path: ['alertId'], message: 'alertId is required' }]);
  }

  return alertId;
}
