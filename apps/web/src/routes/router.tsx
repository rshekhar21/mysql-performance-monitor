import { lazy, Suspense, type ComponentType, type ReactElement } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from '../features/auth/protected-route';
import { AppLayout } from '../layouts/app-layout';
import { RouteFallback } from './route-fallback';

const LoginPage = lazy(() =>
  import('../features/auth/login-page').then((module) => ({ default: module.LoginPage }))
);
const OverviewPage = lazy(() =>
  import('../features/overview/overview-page').then((module) => ({ default: module.OverviewPage }))
);
const ServerManagementPage = lazy(() =>
  import('../features/servers/server-management-page').then((module) => ({
    default: module.ServerManagementPage
  }))
);
const ConnectionsPage = lazy(() =>
  import('../features/connections/connections-page').then((module) => ({
    default: module.ConnectionsPage
  }))
);
const InnoDbPage = lazy(() =>
  import('../features/innodb/innodb-page').then((module) => ({ default: module.InnoDbPage }))
);
const QueryPerformancePage = lazy(() =>
  import('../features/queries/query-performance-page').then((module) => ({
    default: module.QueryPerformancePage
  }))
);
const RunningQueriesPage = lazy(() =>
  import('../features/queries/running-queries-page').then((module) => ({
    default: module.RunningQueriesPage
  }))
);
const StoragePage = lazy(() =>
  import('../features/storage/storage-page').then((module) => ({ default: module.StoragePage }))
);
const ReplicationPage = lazy(() =>
  import('../features/replication/replication-page').then((module) => ({
    default: module.ReplicationPage
  }))
);
const AlertsPage = lazy(() =>
  import('../features/alerts/alerts-page').then((module) => ({ default: module.AlertsPage }))
);
const AlertRulesPage = lazy(() =>
  import('../features/alerts/alerts-page').then((module) => ({ default: module.AlertRulesPage }))
);
const CollectorHealthPage = lazy(() =>
  import('../features/collector/collector-health-page').then((module) => ({
    default: module.CollectorHealthPage
  }))
);
const UsersPage = lazy(() =>
  import('../features/admin/users-page').then((module) => ({ default: module.UsersPage }))
);
const AuditPage = lazy(() =>
  import('../features/admin/audit-page').then((module) => ({ default: module.AuditPage }))
);
const SettingsPage = lazy(() =>
  import('../features/admin/settings-page').then((module) => ({ default: module.SettingsPage }))
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: page(LoginPage)
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: page(OverviewPage) },
          { path: 'servers', element: page(ServerManagementPage) },
          { path: 'connections', element: page(ConnectionsPage) },
          { path: 'queries', element: page(QueryPerformancePage) },
          { path: 'running-queries', element: page(RunningQueriesPage) },
          { path: 'innodb', element: page(InnoDbPage) },
          { path: 'storage', element: page(StoragePage) },
          { path: 'replication', element: page(ReplicationPage) },
          { path: 'alerts', element: page(AlertsPage) },
          { path: 'alert-rules', element: page(AlertRulesPage) },
          { path: 'collector', element: page(CollectorHealthPage) },
          { path: 'users', element: page(UsersPage) },
          { path: 'audit', element: page(AuditPage) },
          { path: 'settings', element: page(SettingsPage) }
        ]
      }
    ]
  }
]);

function page(Page: ComponentType): ReactElement {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Page />
    </Suspense>
  );
}
