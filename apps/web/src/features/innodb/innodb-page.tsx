import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Database, Gauge, HardDrive, Waves } from 'lucide-react';
import { EmptyState } from '../../components/empty-state';
import { MetricCard } from '../../components/metric-card';
import { PageHeader } from '../../components/page-header';
import { formatDateTime, formatNumber } from '../../lib/format';
import { apiClient } from '../../services/api-client';
import { queryKeys } from '../../services/query-keys';

export function InnoDbPage() {
  const [searchParams] = useSearchParams();
  const serversQuery = useQuery({ queryKey: queryKeys.servers, queryFn: apiClient.servers });
  const serverId = searchParams.get('serverId') ?? serversQuery.data?.servers[0]?.id ?? '';
  const enabled = serverId.length > 0;
  const innoDbQuery = useQuery({
    queryKey: enabled ? queryKeys.innoDb(serverId) : ['innodb', 'none'],
    queryFn: () => apiClient.innoDb(serverId),
    enabled
  });
  const snapshot = innoDbQuery.data?.innodb;

  if (!enabled && !serversQuery.isLoading) {
    return <EmptyState title="No server selected" body="Add or select a monitored server first." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="InnoDB"
        description="Latest buffer-pool health indicators from collector snapshots."
      />
      {!snapshot && !innoDbQuery.isLoading ? (
        <EmptyState
          title="No InnoDB snapshot available"
          body="The collector records InnoDB metrics when the monitored server exposes them."
        />
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Buffer Pool Hit Ratio"
          value={`${formatNumber(snapshot?.bufferPoolHitRatio)}%`}
          status={`Measured ${formatDateTime(snapshot?.collectedAt)}`}
          icon={<Gauge className="h-5 w-5 text-brand" />}
        />
        <MetricCard
          label="Dirty Pages"
          value={formatNumber(snapshot?.bufferPoolPagesDirty, 0)}
          unit={`${formatNumber(snapshot?.dirtyPagePercentage)}% dirty`}
          icon={<Waves className="h-5 w-5 text-warning" />}
        />
        <MetricCard
          label="Total Pages"
          value={formatNumber(snapshot?.bufferPoolPagesTotal, 0)}
          icon={<HardDrive className="h-5 w-5 text-brand" />}
        />
        <MetricCard
          label="Disk Reads"
          value={formatNumber(snapshot?.bufferPoolReads, 0)}
          unit={`${formatNumber(snapshot?.bufferPoolReadRequests, 0)} read requests`}
          icon={<Database className="h-5 w-5 text-brand" />}
        />
      </div>
    </div>
  );
}
