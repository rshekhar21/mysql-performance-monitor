import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '../../components/empty-state';
import { PageHeader } from '../../components/page-header';
import { formatDateTime } from '../../lib/format';
import { apiClient } from '../../services/api-client';
import { queryKeys } from '../../services/query-keys';

export function UsersPage() {
  const usersQuery = useQuery({
    queryKey: queryKeys.users,
    queryFn: apiClient.users,
    retry: false
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users And Roles"
        description="Application users, assigned roles, and sign-in status."
      />
      {usersQuery.isError ? (
        <EmptyState
          title="Users unavailable"
          body="Sign in with a role that has user-management permission."
        />
      ) : null}
      <div className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Roles</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Failed Logins</th>
              <th className="px-4 py-3">Last Login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {(usersQuery.data?.users ?? []).length ? (
              usersQuery.data?.users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{user.displayName}</div>
                    <div className="text-muted">{user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-muted">{user.roles.join(', ') || '-'}</td>
                  <td className="px-4 py-3">{user.disabled ? 'Disabled' : 'Active'}</td>
                  <td className="px-4 py-3 text-muted">{user.failedLoginCount}</td>
                  <td className="px-4 py-3 text-muted">{formatDateTime(user.lastLoginAt)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={5}>
                  {usersQuery.isLoading ? 'Loading users...' : 'No users found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
