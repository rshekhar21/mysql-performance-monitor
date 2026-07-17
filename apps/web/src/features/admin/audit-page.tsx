import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '../../components/empty-state';
import { PageHeader } from '../../components/page-header';
import { formatDateTime } from '../../lib/format';
import { apiClient } from '../../services/api-client';
import { queryKeys } from '../../services/query-keys';

export function AuditPage() {
  const auditQuery = useQuery({
    queryKey: queryKeys.auditLogs,
    queryFn: apiClient.auditLogs,
    retry: false
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Security and administrative actions recorded by the API."
      />
      {auditQuery.isError ? (
        <EmptyState
          title="Audit logs unavailable"
          body="This page requires audit-read permission."
        />
      ) : null}
      <div className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Request</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {(auditQuery.data?.logs ?? []).length ? (
              auditQuery.data?.logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 text-muted">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-3">{log.actorEmail ?? log.actorUserId ?? 'System'}</td>
                  <td className="px-4 py-3 font-medium">{log.action}</td>
                  <td className="px-4 py-3 text-muted">
                    {log.entityType}
                    {log.entityId ? `:${log.entityId}` : ''}
                  </td>
                  <td className="px-4 py-3 text-muted">{log.requestId ?? '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={5}>
                  {auditQuery.isLoading ? 'Loading audit logs...' : 'No audit events recorded yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
