# Architecture

The system has three executable applications:

- Web dashboard: displays operational views and retrieves data from the API.
- API service: authenticates users, enforces permissions, manages monitored servers, exposes metric/history endpoints, and owns administrative workflows.
- Collector service: runs independently from HTTP traffic, queries monitored MySQL servers, calculates derived metrics, persists snapshots, and evaluates alert rules.

Routine collection must never depend on a browser, page refresh, or manually called API endpoint.

## Data Flow

1. Administrators add monitored-server definitions through the API.
2. The API encrypts monitored-server passwords before persistence.
3. The collector periodically loads enabled servers from the monitoring application database.
4. The collector queries each monitored server through server-specific connections.
5. Snapshots and derived metrics are stored in the monitoring application database.
6. The web dashboard reads current and historical data through the API.

## Live Versus Historical Data

- Live data: explicitly requested diagnostics such as connection testing and current running queries.
- Historical snapshots: data persisted by the collector and used by dashboards/charts.
- Derived metrics: rates and ratios calculated from snapshots, never guessed from cumulative counters.

## Failure Isolation

The collector uses bounded concurrency, per-server monitored MySQL pools, query timeouts, and database-backed locks per server and metric group. A failure for one monitored server records a failed collector run and marks that server unavailable without stopping collection for other servers.
