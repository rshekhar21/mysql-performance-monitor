# Production Upgrade

Use this procedure for routine updates on the CloudPanel VPS.

## Normal Upgrade

```bash
cd mysql-performance-monitor
git pull
./scripts/deploy-production.sh
```

`deploy-production.sh` performs these steps:

1. Creates a database backup.
2. Builds changed API, collector, and web images.
3. Keeps the `app-db` volume intact.
4. Starts the private app database if needed.
5. Runs migrations.
6. Runs the idempotent seed only when seed variables are set.
7. Recreates changed application services.

## Verify After Upgrade

```bash
docker compose --env-file .env.production -f docker-compose.production.yml ps
curl -fsS http://127.0.0.1:4400/health
curl -fsS http://127.0.0.1:4400/ready
curl -fsS http://127.0.0.1:8085/health
curl -fsS http://127.0.0.1:8085/servers
```

Open:

```text
https://mysqlmonitor.myebs.in
https://mysqlmonitor.myebs.in/servers
```

Direct navigation to `/servers` must load the React app.

## Rollback From Backup

```bash
./scripts/restore-production.sh backups/mysql-monitor-YYYYMMDDTHHMMSSZ.sql.gz
```

## Avoiding Compose Recreation Bugs

Prefer Docker Compose v2:

```bash
docker compose version
```

If only old `docker-compose` v1 is available, install Compose v2 before production upgrades. The scripts prefer Compose v2 automatically.

## Data Safety Rules

- Do not run `docker compose down -v` in production.
- Do not delete the `app-db-data` volume.
- Backups are created before migrations during normal deployment.
- The production compose file never publishes the app database port to the host.
