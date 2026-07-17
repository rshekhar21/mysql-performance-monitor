# Database Schema

The monitoring application database stores application state and metric history. It is separate from monitored MySQL servers.

Initial logical entities:

- users, roles, user_roles
- monitored_servers, server_credentials
- collector_configs, collector_runs
- server_status_snapshots, innodb_snapshots
- database_size_snapshots, table_size_snapshots
- query_digest_snapshots, replication_snapshots
- alert_rules, alert_events, alert_acknowledgements
- audit_logs, app_settings

Metric tables are indexed for time-series access by `server_id` and `collected_at`.

Timestamps are persisted in UTC. Retention cleanup is a scheduled job, not an API request side effect.
