# MySQL Monitoring User

Basic monitoring should use a least-privilege account.

Example for local development:

```sql
CREATE USER 'monitor_user'@'%' IDENTIFIED BY 'monitor_password';
GRANT PROCESS, REPLICATION CLIENT ON *.* TO 'monitor_user'@'%';
GRANT SELECT ON performance_schema.* TO 'monitor_user'@'%';
GRANT SELECT ON sys.* TO 'monitor_user'@'%';
GRANT SELECT ON information_schema.* TO 'monitor_user'@'%';
FLUSH PRIVILEGES;
```

Optional advanced features may require additional read-only access depending on MySQL version and configuration.

When adding a remote server over a higher-latency network, the API and collector use `MONITORED_MYSQL_CONNECT_TIMEOUT_MS` for monitored MySQL connection establishment. The production default is `15000` ms. SSL mode behavior is:

- `disabled`: connect without TLS.
- `preferred`: try TLS first, then fall back to non-TLS only when TLS negotiation is unavailable.
- `required`: require TLS and fail if TLS negotiation cannot be established.

The initial product must not terminate queries, restart servers, change configuration, or run destructive SQL on monitored servers.
