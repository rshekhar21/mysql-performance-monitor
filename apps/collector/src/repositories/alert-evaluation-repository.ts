import type { RowDataPacket } from 'mysql2';
import type { ApplicationPool } from '@mysql-monitor/database';
import { newId, uuidToBin } from '../utils/ids.js';

interface AlertRuleRow extends RowDataPacket {
  id: Buffer;
  server_id: Buffer | null;
  name: string;
  metric_key: string;
  warning_threshold: number | null;
  critical_threshold: number | null;
}

interface LatestMetricRow extends RowDataPacket {
  connection_utilization: number | null;
  running_threads: number | null;
  buffer_pool_hit_ratio: number | null;
  replication_lag: number | null;
  replication_stopped: number | null;
}

export class AlertEvaluationRepository {
  constructor(private readonly pool: ApplicationPool) {}

  async evaluate(serverId: string): Promise<number> {
    const [rules] = await this.pool.execute<AlertRuleRow[]>(
      `SELECT id, server_id, name, metric_key, warning_threshold, critical_threshold
       FROM alert_rules
       WHERE enabled = TRUE
         AND (server_id IS NULL OR server_id = ?)`,
      [uuidToBin(serverId)]
    );

    if (rules.length === 0) {
      return 0;
    }

    const metrics = await this.getLatestMetrics(serverId);
    let events = 0;

    for (const rule of rules) {
      const value = metrics[rule.metric_key as keyof LatestMetricRow];

      if (typeof value !== 'number') {
        continue;
      }

      const severity = severityFor(
        rule.metric_key,
        value,
        rule.warning_threshold,
        rule.critical_threshold
      );

      if (!severity) {
        await this.resolve(rule.id, serverId);
        continue;
      }

      await this.raise(rule, serverId, severity, value);
      events += 1;
    }

    return events;
  }

  private async getLatestMetrics(serverId: string): Promise<Record<string, number | null>> {
    const [rows] = await this.pool.execute<LatestMetricRow[]>(
      `SELECT
         CASE
           WHEN ss.max_connections IS NULL OR ss.max_connections = 0 THEN NULL
           ELSE (ss.threads_connected / ss.max_connections) * 100
         END AS connection_utilization,
         ss.threads_running AS running_threads,
         inn.buffer_pool_hit_ratio AS buffer_pool_hit_ratio,
         repl.lag_seconds AS replication_lag,
         CASE
           WHEN repl.replication_available = TRUE
             AND (repl.io_thread_running = FALSE OR repl.sql_thread_running = FALSE)
           THEN 1
           ELSE 0
         END AS replication_stopped
       FROM monitored_servers s
       LEFT JOIN server_status_snapshots ss
         ON ss.server_id = s.id
        AND ss.collected_at = (SELECT MAX(collected_at) FROM server_status_snapshots WHERE server_id = s.id)
       LEFT JOIN innodb_snapshots inn
         ON inn.server_id = s.id
        AND inn.collected_at = (SELECT MAX(collected_at) FROM innodb_snapshots WHERE server_id = s.id)
       LEFT JOIN replication_snapshots repl
         ON repl.server_id = s.id
        AND repl.collected_at = (SELECT MAX(collected_at) FROM replication_snapshots WHERE server_id = s.id)
       WHERE s.id = ?
       LIMIT 1`,
      [uuidToBin(serverId)]
    );

    return rows[0] ?? {};
  }

  private async raise(
    rule: AlertRuleRow,
    serverId: string,
    severity: 'warning' | 'critical',
    value: number
  ): Promise<void> {
    const fingerprint = `${serverId}:${rule.metric_key}`;
    const now = new Date();

    await this.pool.execute(
      `INSERT INTO alert_events
       (id, alert_rule_id, server_id, severity, status, message, fingerprint, first_seen_at, last_seen_at)
       VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         severity = VALUES(severity),
         message = VALUES(message),
         last_seen_at = VALUES(last_seen_at),
         updated_at = UTC_TIMESTAMP(3)`,
      [
        uuidToBin(newId()),
        rule.id,
        uuidToBin(serverId),
        severity,
        `${rule.name}: ${rule.metric_key} is ${value.toFixed(2)}`,
        fingerprint,
        now,
        now
      ]
    );
  }

  private async resolve(ruleId: Buffer, serverId: string): Promise<void> {
    await this.pool.execute(
      `UPDATE alert_events
       SET status = 'resolved', resolved_at = UTC_TIMESTAMP(3), updated_at = UTC_TIMESTAMP(3)
       WHERE alert_rule_id = ? AND server_id = ? AND status IN ('open', 'acknowledged')`,
      [ruleId, uuidToBin(serverId)]
    );
  }
}

function severityFor(
  metricKey: string,
  value: number,
  warningThreshold: number | null,
  criticalThreshold: number | null
): 'warning' | 'critical' | null {
  const lowerIsWorse = metricKey === 'buffer_pool_hit_ratio';

  if (lowerIsWorse) {
    if (criticalThreshold !== null && value <= criticalThreshold) {
      return 'critical';
    }
    if (warningThreshold !== null && value <= warningThreshold) {
      return 'warning';
    }
    return null;
  }

  if (criticalThreshold !== null && value >= criticalThreshold) {
    return 'critical';
  }
  if (warningThreshold !== null && value >= warningThreshold) {
    return 'warning';
  }

  return null;
}
