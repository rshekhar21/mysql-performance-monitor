import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { EmptyState } from '../../components/empty-state';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { formatDateTime } from '../../lib/format';
import { apiClient } from '../../services/api-client';
import { queryKeys } from '../../services/query-keys';

export function AlertsPage() {
  const queryClient = useQueryClient();
  const alertsQuery = useQuery({ queryKey: queryKeys.alerts, queryFn: apiClient.alerts });
  const acknowledgeMutation = useMutation({
    mutationFn: apiClient.acknowledgeAlert,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
    }
  });
  const alerts = alertsQuery.data?.alerts ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Alerts" description="Open, acknowledged, and resolved alert events." />
      {alerts.length === 0 ? (
        <EmptyState
          title="No alert events"
          body="Create alert rules and keep the collector running to evaluate them."
        />
      ) : (
        <div className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Last Seen</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {alerts.map((alert) => (
                <tr key={alert.id}>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={alert.severity}
                      tone={alert.severity === 'critical' ? 'critical' : 'warning'}
                    />
                  </td>
                  <td className="px-4 py-3 text-muted">{alert.status}</td>
                  <td className="px-4 py-3">{alert.message}</td>
                  <td className="px-4 py-3 text-muted">{formatDateTime(alert.lastSeenAt)}</td>
                  <td className="px-4 py-3">
                    {alert.status === 'open' ? (
                      <button
                        className="rounded border border-slate-300 px-3 py-1 text-sm"
                        onClick={() => acknowledgeMutation.mutate(alert.id)}
                      >
                        Acknowledge
                      </button>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AlertRulesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('High connection utilization');
  const [metricKey, setMetricKey] = useState('connection_utilization');
  const [warningThreshold, setWarningThreshold] = useState('75');
  const [criticalThreshold, setCriticalThreshold] = useState('90');
  const rulesQuery = useQuery({ queryKey: queryKeys.alertRules, queryFn: apiClient.alertRules });
  const createMutation = useMutation({
    mutationFn: apiClient.createAlertRule,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.alertRules });
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Alert Rules" description="Database-backed alert rule configuration." />
      <div className="grid gap-3 rounded border border-slate-200 bg-white p-4 md:grid-cols-5">
        <input
          className="h-10 rounded border border-slate-300 px-3 text-sm"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <select
          className="h-10 rounded border border-slate-300 px-3 text-sm"
          value={metricKey}
          onChange={(event) => setMetricKey(event.target.value)}
        >
          <option value="connection_utilization">Connection utilization</option>
          <option value="running_threads">Running threads</option>
          <option value="buffer_pool_hit_ratio">Buffer pool hit ratio</option>
          <option value="replication_lag">Replication lag</option>
          <option value="replication_stopped">Replication stopped</option>
        </select>
        <input
          className="h-10 rounded border border-slate-300 px-3 text-sm"
          value={warningThreshold}
          onChange={(event) => setWarningThreshold(event.target.value)}
        />
        <input
          className="h-10 rounded border border-slate-300 px-3 text-sm"
          value={criticalThreshold}
          onChange={(event) => setCriticalThreshold(event.target.value)}
        />
        <button
          className="h-10 rounded bg-slate-900 px-3 text-sm font-medium text-white"
          onClick={() =>
            createMutation.mutate({
              name,
              metricKey,
              warningThreshold: Number(warningThreshold),
              criticalThreshold: Number(criticalThreshold)
            })
          }
        >
          Create Rule
        </button>
      </div>
      <div className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Metric</th>
              <th className="px-4 py-3">Warning</th>
              <th className="px-4 py-3">Critical</th>
              <th className="px-4 py-3">Enabled</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {(rulesQuery.data?.rules ?? []).map((rule) => (
              <tr key={rule.id}>
                <td className="px-4 py-3 font-medium">{rule.name}</td>
                <td className="px-4 py-3 text-muted">{rule.metricKey}</td>
                <td className="px-4 py-3 text-muted">{rule.warningThreshold ?? '-'}</td>
                <td className="px-4 py-3 text-muted">{rule.criticalThreshold ?? '-'}</td>
                <td className="px-4 py-3 text-muted">{rule.enabled ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
