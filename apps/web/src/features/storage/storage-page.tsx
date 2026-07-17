import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '../../components/empty-state';
import { LineChartPanel } from '../../components/line-chart-panel';
import { PageHeader } from '../../components/page-header';
import { formatBytes, formatDateTime, formatNumber } from '../../lib/format';
import { apiClient } from '../../services/api-client';
import { queryKeys } from '../../services/query-keys';

export function StoragePage() {
  const [searchParams] = useSearchParams();
  const serversQuery = useQuery({ queryKey: queryKeys.servers, queryFn: apiClient.servers });
  const serverId = searchParams.get('serverId') ?? serversQuery.data?.servers[0]?.id ?? '';
  const range = searchParams.get('range') ?? '24h';
  const enabled = serverId.length > 0;
  const storageQuery = useQuery({
    queryKey: enabled ? queryKeys.storage(serverId, range) : ['storage', 'none'],
    queryFn: () => apiClient.storage(serverId, range),
    enabled
  });
  const databasesQuery = useQuery({
    queryKey: enabled ? queryKeys.databases(serverId) : ['databases', 'none'],
    queryFn: () => apiClient.databases(serverId, 25),
    enabled
  });
  const tablesQuery = useQuery({
    queryKey: enabled ? queryKeys.tables(serverId) : ['tables', 'none'],
    queryFn: () => apiClient.tables(serverId, 25),
    enabled
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Storage Growth"
        description="Database and table sizes from collector snapshots."
      />
      {storageQuery.data?.points.length ? (
        <LineChartPanel
          title="Total Storage"
          unit="bytes"
          data={storageQuery.data.points}
          series={[{ key: 'totalBytes', label: 'Total', color: '#1f7a8c' }]}
        />
      ) : (
        <EmptyState
          title="No storage history available"
          body="Storage snapshots are collected every configured storage interval."
        />
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        <StorageTable
          title="Databases"
          headings={['Database', 'Data', 'Index', 'Total', 'Measured']}
          rows={(databasesQuery.data?.databases ?? []).map((database) => [
            database.databaseName,
            formatBytes(database.dataLengthBytes),
            formatBytes(database.indexLengthBytes),
            formatBytes(database.totalBytes),
            formatDateTime(database.collectedAt)
          ])}
        />
        <StorageTable
          title="Tables"
          headings={['Table', 'Rows', 'Data', 'Index', 'Total']}
          rows={(tablesQuery.data?.tables ?? []).map((table) => [
            `${table.databaseName}.${table.tableName}`,
            formatNumber(table.tableRows, 0),
            formatBytes(table.dataLengthBytes),
            formatBytes(table.indexLengthBytes),
            formatBytes(table.totalBytes)
          ])}
        />
      </div>
    </div>
  );
}

function StorageTable({
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
      <div className="overflow-x-auto">
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
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.join(':')}>
                  {row.map((cell, index) => (
                    <td key={`${cell}-${index}`} className="px-4 py-3">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={headings.length}>
                  No snapshot data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
