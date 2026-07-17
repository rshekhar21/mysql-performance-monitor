import { lazy, Suspense, type ComponentType, type ReactElement } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../layouts/app-layout';
import { PlaceholderPage } from './placeholder-page';
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

export const router = createBrowserRouter([
  {
    path: '/login',
    element: page(LoginPage)
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: page(OverviewPage) },
      { path: 'servers', element: page(ServerManagementPage) },
      { path: 'connections', element: <PlaceholderPage title="Connections" /> },
      { path: 'queries', element: page(QueryPerformancePage) },
      { path: 'running-queries', element: page(RunningQueriesPage) },
      { path: 'innodb', element: <PlaceholderPage title="InnoDB" /> },
      { path: 'storage', element: page(StoragePage) },
      { path: 'replication', element: page(ReplicationPage) },
      { path: 'alerts', element: page(AlertsPage) },
      { path: 'alert-rules', element: page(AlertRulesPage) },
      { path: 'collector', element: page(CollectorHealthPage) },
      { path: 'users', element: <PlaceholderPage title="Users And Roles" /> },
      { path: 'audit', element: <PlaceholderPage title="Audit Logs" /> },
      { path: 'settings', element: <PlaceholderPage title="Settings" /> }
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
