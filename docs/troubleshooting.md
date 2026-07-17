# Troubleshooting

## PowerShell blocks npm

Use `npm.cmd` instead of `npm`.

## API readiness fails

Check `APP_DATABASE_URL`, make sure `app-db` is healthy, and run migrations.

## Server connection tests fail

Check host, port, firewall rules, SSL mode, and least-privilege monitoring-user grants.

## Dashboard has no metrics

That is expected in Phase 1. Phase 2 adds snapshot collection and persistence.
