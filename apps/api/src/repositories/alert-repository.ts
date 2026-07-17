import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { ApplicationPool } from '@mysql-monitor/database';
import type { AlertEventSummary, AlertRuleSummary, AlertSeverity } from '@mysql-monitor/types';
import { binToUuid, newId, uuidToBin } from '../utils/ids.js';

interface AlertRuleRow extends RowDataPacket {
  id: Buffer;
  server_id: Buffer | null;
  name: string;
  metric_key: string;
  enabled: 0 | 1;
  warning_threshold: number | null;
  critical_threshold: number | null;
  evaluation_window_seconds: number;
  minimum_consecutive_failures: number;
  cooldown_seconds: number;
  auto_resolve: 0 | 1;
  description: string | null;
  remediation: string | null;
  created_at: Date;
  updated_at: Date;
}

interface AlertEventRow extends RowDataPacket {
  id: Buffer;
  alert_rule_id: Buffer;
  server_id: Buffer | null;
  severity: AlertSeverity;
  status: 'open' | 'acknowledged' | 'resolved';
  message: string;
  fingerprint: string;
  first_seen_at: Date;
  last_seen_at: Date;
  resolved_at: Date | null;
}

export interface AlertRuleCreateInput {
  serverId?: string | null;
  name: string;
  metricKey: string;
  warningThreshold?: number | null;
  criticalThreshold?: number | null;
  evaluationWindowSeconds?: number;
  minimumConsecutiveFailures?: number;
  cooldownSeconds?: number;
  autoResolve?: boolean;
  description?: string | null;
  remediation?: string | null;
}

export class AlertRepository {
  constructor(private readonly pool: ApplicationPool) {}

  async listRules(): Promise<AlertRuleSummary[]> {
    const [rows] = await this.pool.execute<AlertRuleRow[]>(
      `SELECT id, server_id, name, metric_key, enabled, warning_threshold, critical_threshold,
              evaluation_window_seconds, minimum_consecutive_failures, cooldown_seconds,
              auto_resolve, description, remediation, created_at, updated_at
       FROM alert_rules
       ORDER BY created_at DESC`
    );

    return rows.map(mapRule);
  }

  async createRule(input: AlertRuleCreateInput): Promise<AlertRuleSummary> {
    const id = newId();
    await this.pool.execute<ResultSetHeader>(
      `INSERT INTO alert_rules
       (id, server_id, name, metric_key, warning_threshold, critical_threshold,
        evaluation_window_seconds, minimum_consecutive_failures, cooldown_seconds,
        auto_resolve, description, remediation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidToBin(id),
        input.serverId ? uuidToBin(input.serverId) : null,
        input.name,
        input.metricKey,
        input.warningThreshold ?? null,
        input.criticalThreshold ?? null,
        input.evaluationWindowSeconds ?? 300,
        input.minimumConsecutiveFailures ?? 1,
        input.cooldownSeconds ?? 300,
        input.autoResolve ?? true,
        input.description ?? null,
        input.remediation ?? null
      ]
    );

    const rules = await this.listRules();
    return rules.find((rule) => rule.id === id) ?? rules[0]!;
  }

  async listEvents(): Promise<AlertEventSummary[]> {
    const [rows] = await this.pool.execute<AlertEventRow[]>(
      `SELECT id, alert_rule_id, server_id, severity, status, message, fingerprint,
              first_seen_at, last_seen_at, resolved_at
       FROM alert_events
       ORDER BY last_seen_at DESC
       LIMIT 200`
    );

    return rows.map(mapEvent);
  }

  async acknowledge(alertId: string, userId: string): Promise<void> {
    await this.pool.execute(
      `UPDATE alert_events
       SET status = 'acknowledged', updated_at = UTC_TIMESTAMP(3)
       WHERE id = ? AND status = 'open'`,
      [uuidToBin(alertId)]
    );
    await this.pool.execute(
      `INSERT INTO alert_acknowledgements (id, alert_event_id, acknowledged_by)
       VALUES (?, ?, ?)`,
      [uuidToBin(newId()), uuidToBin(alertId), uuidToBin(userId)]
    );
  }
}

function mapRule(row: AlertRuleRow): AlertRuleSummary {
  return {
    id: binToUuid(row.id),
    serverId: row.server_id ? binToUuid(row.server_id) : null,
    name: row.name,
    metricKey: row.metric_key,
    enabled: row.enabled === 1,
    warningThreshold: row.warning_threshold,
    criticalThreshold: row.critical_threshold,
    evaluationWindowSeconds: row.evaluation_window_seconds,
    minimumConsecutiveFailures: row.minimum_consecutive_failures,
    cooldownSeconds: row.cooldown_seconds,
    autoResolve: row.auto_resolve === 1,
    description: row.description,
    remediation: row.remediation,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function mapEvent(row: AlertEventRow): AlertEventSummary {
  return {
    id: binToUuid(row.id),
    alertRuleId: binToUuid(row.alert_rule_id),
    serverId: row.server_id ? binToUuid(row.server_id) : null,
    severity: row.severity,
    status: row.status,
    message: row.message,
    fingerprint: row.fingerprint,
    firstSeenAt: row.first_seen_at.toISOString(),
    lastSeenAt: row.last_seen_at.toISOString(),
    resolvedAt: row.resolved_at?.toISOString() ?? null
  };
}
