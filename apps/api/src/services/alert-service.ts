import type { AlertRuleCreateInput } from '@mysql-monitor/validation';
import type { AlertRepository } from '../repositories/alert-repository.js';

export class AlertService {
  constructor(private readonly alerts: AlertRepository) {}

  listRules() {
    return this.alerts.listRules();
  }

  createRule(input: AlertRuleCreateInput) {
    return this.alerts.createRule(input);
  }

  listEvents() {
    return this.alerts.listEvents();
  }

  acknowledge(alertId: string, userId: string) {
    return this.alerts.acknowledge(alertId, userId);
  }
}
