import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '../../components/empty-state';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { formatDateTime, formatNumber } from '../../lib/format';
import { apiClient } from '../../services/api-client';
import { queryKeys } from '../../services/query-keys';

export function CollectorHealthPage() {
  const [searchParams] = useSearchParams();
  const serversQuery = useQuery({ queryKey: queryKeys.servers, queryFn: apiClient.servers });
  const serverId = searchParams.get('serverId') ?? serversQuery.data?.servers[0]?.id ?? '';
  const runsQuery = useQuery({
    queryKey: serverId ? queryKeys.collectorRuns(serverId) : ['collector-runs', 'none'],
    queryFn: () => apiClient.collectorRuns(serverId, 50),
    enabled: serverId.length > 0
  });
  const runs = runsQuery.data?.runs ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collector Health"
        description="Recent collection runs, failures, durations, and record counts."
      />
      {runs.length === 0 ? (
        <EmptyState
          title="No collector runs recorded"
          body="Start the collector process and wait for scheduled metric groups to run."
        />
      ) : (
        <div className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Metric Group</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Records</th>
                <th className="px-4 py-3">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {runs.map((run) => (
                <tr key={run.id}>
                  <td className="px-4 py-3 font-medium">{run.metricGroup}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={run.success ? 'success' : 'failed'}
                      tone={run.success ? 'success' : 'critical'}
                    />
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDateTime(run.startedAt)}</td>
                  <td className="px-4 py-3 text-muted">
                    {run.durationMs === null ? '-' : `${formatNumber(run.durationMs, 0)} ms`}
                  </td>
                  <td className="px-4 py-3 text-muted">{formatNumber(run.recordsCollected, 0)}</td>
                  <td className="px-4 py-3 text-muted">{run.sanitizedErrorCode ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
