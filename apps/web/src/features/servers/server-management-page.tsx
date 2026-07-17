import { useQuery } from '@tanstack/react-query';
import { Database } from 'lucide-react';
import { EmptyState } from '../../components/empty-state';
import { LoadingState } from '../../components/loading-state';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { apiClient } from '../../services/api-client';
import { queryKeys } from '../../services/query-keys';

export function ServerManagementPage() {
  const serversQuery = useQuery({
    queryKey: queryKeys.servers,
    queryFn: apiClient.servers,
    retry: false
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitored Servers"
        description="Manage read-only MySQL monitoring targets. Credentials are stored only by the API."
        actions={
          <button className="inline-flex h-10 items-center gap-2 rounded bg-slate-900 px-3 text-sm font-medium text-white">
            <Database className="h-4 w-4" aria-hidden="true" />
            Add Server
          </button>
        }
      />
      {serversQuery.isLoading ? <LoadingState /> : null}
      {serversQuery.isError ? (
        <EmptyState
          title="Server list unavailable"
          body="Start the API, apply migrations, and sign in with a user that has dashboard permissions."
        />
      ) : null}
      {serversQuery.data?.servers.length === 0 ? (
        <EmptyState
          title="No monitored servers configured"
          body="Add a MySQL server with a least-privilege monitoring account to begin collection."
        />
      ) : null}
      {serversQuery.data && serversQuery.data.servers.length > 0 ? (
        <div className="overflow-hidden rounded border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Host</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {serversQuery.data.servers.map((server) => (
                <tr key={server.id}>
                  <td className="px-4 py-3 font-medium">{server.name}</td>
                  <td className="px-4 py-3 text-muted">
                    {server.host}:{server.port}
                  </td>
                  <td className="px-4 py-3 text-muted">{server.username}</td>
                  <td className="px-4 py-3">
                    <StatusBadge label={server.status} tone="neutral" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
