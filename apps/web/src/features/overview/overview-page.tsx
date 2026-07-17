import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, Database, Server } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '../../components/empty-state';
import { LineChartPanel } from '../../components/line-chart-panel';
import { LoadingState } from '../../components/loading-state';
import { MetricCard } from '../../components/metric-card';
import { PageHeader } from '../../components/page-header';
import { formatBytes, formatDateTime, formatDuration, formatNumber } from '../../lib/format';
import { apiClient } from '../../services/api-client';
import { queryKeys } from '../../services/query-keys';

export function OverviewPage() {
  const [searchParams] = useSearchParams();
  const serversQuery = useQuery({
    queryKey: queryKeys.servers,
    queryFn: apiClient.servers,
    retry: false
  });
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
  const databasesQuery = useQuery({
    queryKey: enabled ? queryKeys.databases(serverId) : ['databases', 'none'],
    queryFn: () => apiClient.databases(serverId, 5),
    enabled
  });
  const tablesQuery = useQuery({
    queryKey: enabled ? queryKeys.tables(serverId) : ['tables', 'none'],
    queryFn: () => apiClient.tables(serverId, 5),
    enabled
  });

  if (!enabled && !serversQuery.isLoading) {
    return (
      <EmptyState
        title="No monitored server selected"
        body="Add a monitored MySQL server and let the collector write snapshots to populate the dashboard."
      />
    );
  }

  const overview = overviewQuery.data?.overview;
  const points = metricsQuery.data?.points ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Operational summary from historical snapshots collected by the worker process."
      />
      {overviewQuery.isLoading || serversQuery.isLoading ? <LoadingState /> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Server Status"
          value={overview?.serverStatus ?? 'Unknown'}
          status={`Last collection ${formatDateTime(overview?.lastSuccessfulCollectionAt)}`}
          icon={<Server className="h-5 w-5 text-brand" />}
        />
        <MetricCard
          label="Uptime"
          value={formatDuration(overview?.uptimeSeconds)}
          status={overview?.mysqlVersion ? `MySQL ${overview.mysqlVersion}` : 'Version unknown'}
          icon={<Activity className="h-5 w-5 text-brand" />}
        />
        <MetricCard
          label="Connections"
          value={formatNumber(overview?.activeConnections, 0)}
          unit={`${formatNumber(overview?.connectionUtilization)}% used`}
          icon={<Activity className="h-5 w-5 text-brand" />}
        />
        <MetricCard
          label="Queries Per Second"
          value={formatNumber(overview?.queriesPerSecond)}
          unit="qps"
          icon={<Activity className="h-5 w-5 text-brand" />}
        />
        <MetricCard
          label="Current Storage"
          value={formatBytes(overview?.currentDatabaseSizeBytes)}
          icon={<Database className="h-5 w-5 text-brand" />}
        />
        <MetricCard
          label="Running Threads"
          value={formatNumber(overview?.runningThreads, 0)}
          icon={<Activity className="h-5 w-5 text-brand" />}
        />
        <MetricCard
          label="Unresolved Alerts"
          value={formatNumber(overview?.unresolvedAlerts, 0)}
          status="Alert engine pending"
          icon={<AlertTriangle className="h-5 w-5 text-warning" />}
        />
        <MetricCard
          label="Last Snapshot"
          value={formatDateTime(overview?.lastCollectedAt)}
          icon={<Server className="h-5 w-5 text-brand" />}
        />
      </div>
      {points.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <LineChartPanel
            title="Queries Per Second"
            unit="qps"
            data={points}
            series={[{ key: 'queriesPerSecond', label: 'Queries', color: '#1f7a8c' }]}
          />
          <LineChartPanel
            title="Connections"
            unit="connections"
            data={points}
            series={[
              { key: 'threadsConnected', label: 'Connected', color: '#1f7a8c' },
              { key: 'threadsRunning', label: 'Running', color: '#c92a2a' }
            ]}
          />
          <LineChartPanel
            title="Network Throughput"
            unit="bytes/sec"
            data={points}
            series={[
              { key: 'bytesReceivedPerSecond', label: 'Received', color: '#087f5b' },
              { key: 'bytesSentPerSecond', label: 'Sent', color: '#b7791f' }
            ]}
          />
        </div>
      ) : (
        <EmptyState
          title="No time-series snapshots for this range"
          body="Keep the collector running or choose a wider time range after snapshots have been collected."
        />
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        <SummaryTable
          title="Top Databases"
          rows={(databasesQuery.data?.databases ?? []).map((database) => [
            database.databaseName,
            formatBytes(database.totalBytes),
            `${database.tableCount} tables`
          ])}
          headings={['Database', 'Size', 'Tables']}
        />
        <SummaryTable
          title="Top Tables"
          rows={(tablesQuery.data?.tables ?? []).map((table) => [
            `${table.databaseName}.${table.tableName}`,
            formatBytes(table.totalBytes),
            table.engine ?? '-'
          ])}
          headings={['Table', 'Size', 'Engine']}
        />
      </div>
    </div>
  );
}

function SummaryTable({
  title,
  headings,
  rows
}: {
  title: string;
  headings: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <div className="p-6 text-sm text-muted">No snapshot data available.</div>
      ) : (
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              {headings.map((heading) => (
                <th key={heading} className="px-4 py-3">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((row) => (
              <tr key={row.join(':')}>
                {row.map((cell) => (
                  <td key={cell} className="px-4 py-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
