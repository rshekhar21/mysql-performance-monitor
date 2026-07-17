import type { Request, Response } from 'express';
import type { AlertRuleCreateInput, AlertRuleUpdateInput } from '@mysql-monitor/validation';
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

  async updateRule(req: Request, res: Response): Promise<void> {
    const body = req.body as AlertRuleUpdateInput;
    sendSuccess(res, { rule: await alertService.updateRule(getRuleId(req), body) });
  }

  async deleteRule(req: Request, res: Response): Promise<void> {
    await alertService.deleteRule(getRuleId(req));
    sendSuccess(res, { ok: true });
  }
}

function getAlertId(req: Request): string {
  const alertId = req.params.alertId;

  if (typeof alertId !== 'string') {
    throw new ValidationError([{ path: ['alertId'], message: 'alertId is required' }]);
  }

  return alertId;
}

function getRuleId(req: Request): string {
  const ruleId = req.params.ruleId;

  if (typeof ruleId !== 'string') {
    throw new ValidationError([{ path: ['ruleId'], message: 'ruleId is required' }]);
  }

  return ruleId;
}
