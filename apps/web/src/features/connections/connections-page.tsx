import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Activity, Database, Search } from 'lucide-react';
import { EmptyState } from '../../components/empty-state';
import { LineChartPanel } from '../../components/line-chart-panel';
import { MetricCard } from '../../components/metric-card';
import { PageHeader } from '../../components/page-header';
import { formatDateTime, formatNumber } from '../../lib/format';
import { apiClient } from '../../services/api-client';
import { queryKeys } from '../../services/query-keys';

export function ConnectionsPage() {
  const [searchParams] = useSearchParams();
  const serversQuery = useQuery({ queryKey: queryKeys.servers, queryFn: apiClient.servers });
  const serverId = searchParams.get('serverId') ?? serversQuery.data?.servers[0]?.id ?? '';
  const range = searchParams.get('range') ?? '1h';
  const enabled = serverId.length > 0;
  const overviewQuery = useQuery({
    queryKey: enabled ? queryKeys.overview(serverId) : ['overview', 'none'],
    queryFn: () => apiClient.overview(serverId),
    enabled
  });
  const metricsQuery = useQuery({
    queryKey: enabled ? queryKeys.metrics(serverId, range) : ['metrics', 'none'],
    queryFn: () => apiClient.metrics(serverId, range),
    enabled
  });
  const runningQuery = useQuery({
    queryKey: enabled ? queryKeys.runningQueries(serverId) : ['running-queries', 'none'],
    queryFn: () => apiClient.runningQueries(serverId),
    enabled,
    retry: false
  });

  if (!enabled && !serversQuery.isLoading) {
    return <EmptyState title="No server selected" body="Add or select a monitored server first." />;
  }

  const overview = overviewQuery.data?.overview;
  const points = metricsQuery.data?.points ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Connections"
        description="Connection utilization from snapshots and live process-list context."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Active Connections"
          value={formatNumber(overview?.activeConnections, 0)}
          status={`Last snapshot ${formatDateTime(overview?.lastCollectedAt)}`}
          icon={<Activity className="h-5 w-5 text-brand" />}
        />
        <MetricCard
          label="Running Threads"
          value={formatNumber(overview?.runningThreads, 0)}
          icon={<Search className="h-5 w-5 text-brand" />}
        />
        <MetricCard
          label="Connection Utilization"
          value={`${formatNumber(overview?.connectionUtilization)}%`}
          icon={<Database className="h-5 w-5 text-brand" />}
        />
      </div>
      {points.length ? (
        <LineChartPanel
          title="Connection Activity"
          unit="connections"
          data={points}
          series={[
            { key: 'threadsConnected', label: 'Connected', color: '#1f7a8c' },
            { key: 'threadsRunning', label: 'Running', color: '#c92a2a' }
          ]}
        />
      ) : (
        <EmptyState
          title="No connection trend data"
          body="Connection metrics appear after the collector stores server status snapshots."
        />
      )}
      <div className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Currently Running Queries</h2>
        </div>
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Connection</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Host</th>
              <th className="px-4 py-3">Runtime</th>
              <th className="px-4 py-3">State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {(runningQuery.data?.queries ?? []).length ? (
              runningQuery.data?.queries.map((query) => (
                <tr key={query.connectionId}>
                  <td className="px-4 py-3 font-medium">{query.connectionId}</td>
                  <td className="px-4 py-3 text-muted">{query.user ?? '-'}</td>
                  <td className="px-4 py-3 text-muted">{query.host ?? '-'}</td>
                  <td className="px-4 py-3 text-muted">{formatNumber(query.runtimeSeconds, 0)}s</td>
                  <td className="px-4 py-3">{query.state ?? query.command ?? '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={5}>
                  {runningQuery.isError
                    ? 'Live process-list access is unavailable for this server or role.'
                    : 'No running queries currently reported.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
