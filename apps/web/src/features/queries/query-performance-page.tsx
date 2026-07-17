import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '../../components/empty-state';
import { PageHeader } from '../../components/page-header';
import { formatDateTime, formatNumber } from '../../lib/format';
import { apiClient } from '../../services/api-client';
import { queryKeys } from '../../services/query-keys';

export function QueryPerformancePage() {
  const [searchParams] = useSearchParams();
  const serversQuery = useQuery({ queryKey: queryKeys.servers, queryFn: apiClient.servers });
  const serverId = searchParams.get('serverId') ?? serversQuery.data?.servers[0]?.id ?? '';
  const digestsQuery = useQuery({
    queryKey: serverId ? queryKeys.queryPerformance(serverId) : ['query-performance', 'none'],
    queryFn: () => apiClient.queryPerformance(serverId),
    enabled: serverId.length > 0
  });
  const digests = digestsQuery.data?.digests ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Query Performance"
        description="Normalized statement digests from performance_schema snapshots."
      />
      {digests.length === 0 ? (
        <EmptyState
          title="No query digest snapshots"
          body="Enable performance_schema statement digests and let the collector run."
        />
      ) : (
        <div className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Digest</th>
                  <th className="px-4 py-3">Schema</th>
                  <th className="px-4 py-3">Executions</th>
                  <th className="px-4 py-3">Avg Timer</th>
                  <th className="px-4 py-3">Rows Examined</th>
                  <th className="px-4 py-3">Measured</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {digests.map((digest) => (
                  <tr key={digest.digest}>
                    <td className="max-w-xl px-4 py-3 font-mono text-xs">
                      {digest.digestText ?? digest.digest}
                    </td>
                    <td className="px-4 py-3 text-muted">{digest.schemaName ?? '-'}</td>
                    <td className="px-4 py-3 text-muted">
                      {formatNumber(digest.executionCount, 0)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatNumber(digest.averageTimerWait, 0)}
                    </td>
                    <td className="px-4 py-3 text-muted">{formatNumber(digest.rowsExamined, 0)}</td>
                    <td className="px-4 py-3 text-muted">{formatDateTime(digest.collectedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
