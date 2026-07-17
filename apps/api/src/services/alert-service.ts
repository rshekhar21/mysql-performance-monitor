import type { AlertRuleCreateInput, AlertRuleUpdateInput } from '@mysql-monitor/validation';
import { NotFoundError } from '../errors/app-error.js';
import type { AlertRepository } from '../repositories/alert-repository.js';

export class AlertService {
  constructor(private readonly alerts: AlertRepository) {}

  listRules() {
    return this.alerts.listRules();
  }

  createRule(input: AlertRuleCreateInput) {
    return this.alerts.createRule(input);
  }

  async updateRule(ruleId: string, input: AlertRuleUpdateInput) {
    const rule = await this.alerts.updateRule(ruleId, input);

    if (!rule) {
      throw new NotFoundError('Alert rule');
    }

    return rule;
  }

  async deleteRule(ruleId: string) {
    const deleted = await this.alerts.deleteRule(ruleId);

    if (!deleted) {
      throw new NotFoundError('Alert rule');
    }
  }

  listEvents() {
    return this.alerts.listEvents();
  }

  acknowledge(alertId: string, userId: string) {
    return this.alerts.acknowledge(alertId, userId);
  }
}
