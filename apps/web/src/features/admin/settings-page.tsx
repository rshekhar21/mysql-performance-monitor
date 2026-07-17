import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '../../components/empty-state';
import { PageHeader } from '../../components/page-header';
import { formatDateTime } from '../../lib/format';
import { apiClient } from '../../services/api-client';
import { queryKeys } from '../../services/query-keys';

export function SettingsPage() {
  const settingsQuery = useQuery({
    queryKey: queryKeys.settings,
    queryFn: apiClient.settings,
    retry: false
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Application settings persisted in the monitoring database."
      />
      {settingsQuery.isError ? (
        <EmptyState
          title="Settings unavailable"
          body="This page requires settings-management permission."
        />
      ) : null}
      <div className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {(settingsQuery.data?.settings ?? []).length ? (
              settingsQuery.data?.settings.map((setting) => (
                <tr key={setting.key}>
                  <td className="px-4 py-3 font-medium">{setting.key}</td>
                  <td className="max-w-xl px-4 py-3 text-muted">
                    <code className="whitespace-pre-wrap break-words text-xs">
                      {JSON.stringify(setting.value)}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDateTime(setting.updatedAt)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={3}>
                  {settingsQuery.isLoading ? 'Loading settings...' : 'No persisted settings found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
