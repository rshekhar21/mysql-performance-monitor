import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '../../components/empty-state';
import { PageHeader } from '../../components/page-header';
import { formatNumber } from '../../lib/format';
import { apiClient } from '../../services/api-client';
import { queryKeys } from '../../services/query-keys';

export function RunningQueriesPage() {
  const [searchParams] = useSearchParams();
  const serversQuery = useQuery({ queryKey: queryKeys.servers, queryFn: apiClient.servers });
  const serverId = searchParams.get('serverId') ?? serversQuery.data?.servers[0]?.id ?? '';
  const queriesQuery = useQuery({
    queryKey: serverId ? queryKeys.runningQueries(serverId) : ['running-queries', 'none'],
    queryFn: () => apiClient.runningQueries(serverId),
    enabled: serverId.length > 0,
    refetchInterval: 15_000
  });
  const queries = queriesQuery.data?.queries ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Running Queries" description="Read-only live processlist inspection." />
      {queries.length === 0 ? (
        <EmptyState
          title="No running queries"
          body="Sleeping connections are intentionally omitted."
        />
      ) : (
        <div className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Host</th>
                  <th className="px-4 py-3">DB</th>
                  <th className="px-4 py-3">Runtime</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">Query</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {queries.map((query) => (
                  <tr key={query.connectionId}>
                    <td className="px-4 py-3">{query.connectionId}</td>
                    <td className="px-4 py-3 text-muted">{query.user ?? '-'}</td>
                    <td className="px-4 py-3 text-muted">{query.host ?? '-'}</td>
                    <td className="px-4 py-3 text-muted">{query.database ?? '-'}</td>
                    <td className="px-4 py-3 text-muted">
                      {formatNumber(query.runtimeSeconds, 0)}s
                    </td>
                    <td className="px-4 py-3 text-muted">{query.state ?? '-'}</td>
                    <td className="max-w-xl px-4 py-3 font-mono text-xs">
                      {query.queryText ?? query.command ?? '-'}
                    </td>
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
