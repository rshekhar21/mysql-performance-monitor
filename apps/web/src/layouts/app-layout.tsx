import {
  Activity,
  AlertTriangle,
  Bell,
  Database,
  Gauge,
  HardDrive,
  LockKeyhole,
  Menu,
  RefreshCw,
  Search,
  Server,
  Settings,
  Shield,
  Users
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { apiClient } from '../services/api-client';
import { queryKeys } from '../services/query-keys';
import { useAuth } from '../features/auth/auth-provider';

const navItems = [
  { to: '/', label: 'Overview', icon: Gauge },
  { to: '/servers', label: 'Servers', icon: Server },
  { to: '/connections', label: 'Connections', icon: Activity },
  { to: '/queries', label: 'Query Performance', icon: Search },
  { to: '/running-queries', label: 'Running Queries', icon: Activity },
  { to: '/innodb', label: 'InnoDB', icon: Database },
  { to: '/storage', label: 'Storage Growth', icon: HardDrive },
  { to: '/replication', label: 'Replication', icon: RefreshCw },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/alert-rules', label: 'Alert Rules', icon: Bell },
  { to: '/collector', label: 'Collector Health', icon: Shield },
  { to: '/users', label: 'Users And Roles', icon: Users },
  { to: '/audit', label: 'Audit Logs', icon: LockKeyhole },
  { to: '/settings', label: 'Settings', icon: Settings }
];

const ranges = [
  ['15m', 'Last 15 minutes'],
  ['1h', 'Last 1 hour'],
  ['6h', 'Last 6 hours'],
  ['24h', 'Last 24 hours'],
  ['7d', 'Last 7 days'],
  ['30d', 'Last 30 days']
] as const;

export function AppLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const auth = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const serversQuery = useQuery({
    queryKey: queryKeys.servers,
    queryFn: apiClient.servers,
    retry: false
  });
  const serverId = searchParams.get('serverId') ?? serversQuery.data?.servers[0]?.id ?? '';
  const range = searchParams.get('range') ?? '1h';

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    setSearchParams(next);
  }

  return (
    <div className="min-h-screen bg-surface text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-16 items-center border-b border-slate-200 px-5">
          <Database className="mr-3 h-6 w-6 text-brand" aria-hidden="true" />
          <span className="text-base font-semibold">MySQL Monitor</span>
        </div>
        <nav className="space-y-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded px-3 py-2 text-sm font-medium',
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                )
              }
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded border border-slate-200 p-2 text-slate-700 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <select
              className="h-10 rounded border border-slate-300 bg-white px-3 text-sm"
              value={serverId}
              onChange={(event) => updateParam('serverId', event.target.value)}
            >
              {serversQuery.data?.servers.length ? null : (
                <option value="">No server selected</option>
              )}
              {serversQuery.data?.servers.map((server) => (
                <option key={server.id} value={server.id}>
                  {server.name}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded border border-slate-300 bg-white px-3 text-sm"
              value={range}
              onChange={(event) => updateParam('range', event.target.value)}
            >
              {ranges.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">
              {serverId ? 'Collector snapshots' : 'Awaiting server'}
            </span>
            <button
              className="inline-flex h-10 items-center gap-2 rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700"
              onClick={() => {
                void queryClient.invalidateQueries();
              }}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </button>
            <button
              className="h-10 rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700"
              onClick={() => {
                void auth.logout().then(() => {
                  queryClient.clear();
                  void navigate('/login');
                });
              }}
            >
              Sign Out
            </button>
            <AlertTriangle className="h-5 w-5 text-warning" aria-label="Alert status unavailable" />
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
