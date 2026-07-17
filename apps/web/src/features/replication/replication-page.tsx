import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '../../components/empty-state';
import { MetricCard } from '../../components/metric-card';
import { PageHeader } from '../../components/page-header';
import { formatDateTime, formatNumber } from '../../lib/format';
import { apiClient } from '../../services/api-client';
import { queryKeys } from '../../services/query-keys';

export function ReplicationPage() {
  const [searchParams] = useSearchParams();
  const serversQuery = useQuery({ queryKey: queryKeys.servers, queryFn: apiClient.servers });
  const serverId = searchParams.get('serverId') ?? serversQuery.data?.servers[0]?.id ?? '';
  const replicationQuery = useQuery({
    queryKey: serverId ? queryKeys.replication(serverId) : ['replication', 'none'],
    queryFn: () => apiClient.replication(serverId),
    enabled: serverId.length > 0
  });
  const replication = replicationQuery.data?.replication;

  return (
    <div className="space-y-6">
      <PageHeader title="Replication" description="Latest replication snapshot where available." />
      {!replication ? (
        <EmptyState
          title="No replication snapshot"
          body="The collector records replication status when the monitored server exposes it."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Replication"
            value={replication.replicationAvailable ? 'Available' : 'Unavailable'}
          />
          <MetricCard
            label="IO Thread"
            value={
              replication.ioThreadRunning === null
                ? '-'
                : replication.ioThreadRunning
                  ? 'Yes'
                  : 'No'
            }
          />
          <MetricCard
            label="SQL Thread"
            value={
              replication.sqlThreadRunning === null
                ? '-'
                : replication.sqlThreadRunning
                  ? 'Yes'
                  : 'No'
            }
          />
          <MetricCard
            label="Lag"
            value={formatNumber(replication.lagSeconds, 0)}
            unit="seconds"
            status={`Measured ${formatDateTime(replication.collectedAt)}`}
          />
        </div>
      )}
    </div>
  );
}
