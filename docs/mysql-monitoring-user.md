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

The initial product must not terminate queries, restart servers, change configuration, or run destructive SQL on monitored servers.
