# CloudPanel Production Deployment

This runbook deploys MySQL Performance Monitor on an Ubuntu VPS managed by CloudPanel.

It assumes the VPS already has a separate production MySQL server on host port `3306`. The monitoring application's own database runs in a private Docker volume and does not publish port `3306`.

## Files

- `docker-compose.production.yml`
- `.env.production`
- `scripts/install-production.sh`
- `scripts/deploy-production.sh`
- `scripts/backup-production.sh`
- `scripts/restore-production.sh`
- `apps/web/nginx.conf`

## First Install

Install Docker and Compose v2 on Ubuntu, then run:

```bash
git clone <your-repo-url> mysql-performance-monitor
cd mysql-performance-monitor
cp .env.production.example .env.production
nano .env.production
chmod +x scripts/*.sh
./scripts/install-production.sh
```

Before running the installer, set:

- `PUBLIC_APP_URL=https://mysqlmonitor.myebs.in`
- `PUBLIC_API_BASE_URL=https://mysqlmonitor.myebs.in`
- `CORS_ORIGIN=https://mysqlmonitor.myebs.in`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`

The installer generates strong values for `APP_DB_PASSWORD`, `APP_DB_ROOT_PASSWORD`, `JWT_SECRET`, and `CREDENTIAL_ENCRYPTION_KEY` if they still contain placeholder values.

## Ports

Production defaults bind only to loopback:

- Web: `127.0.0.1:8085`
- API: `127.0.0.1:4400`
- Collector health: `127.0.0.1:4410`

The app database is private to Docker and has no host port mapping.

## CloudPanel Reverse Proxy

Create a CloudPanel site for:

```text
mysqlmonitor.myebs.in
```

Use this Vhost configuration:

```nginx
server {
  listen 80;
  listen [::]:80;
  server_name mysqlmonitor.myebs.in;

  location /api/ {
    proxy_pass http://127.0.0.1:4400/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location = /health {
    proxy_pass http://127.0.0.1:4400/health;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location = /ready {
    proxy_pass http://127.0.0.1:4400/ready;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    proxy_pass http://127.0.0.1:8085;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Enable SSL in CloudPanel for `mysqlmonitor.myebs.in`. CloudPanel may wrap this Vhost in its own SSL server block; keep the same proxy targets.

## Health Checks

```bash
docker compose --env-file .env.production -f docker-compose.production.yml ps
curl -fsS http://127.0.0.1:4400/health
curl -fsS http://127.0.0.1:4400/ready
curl -fsS http://127.0.0.1:8085/health
curl -fsS http://127.0.0.1:8085/servers
```

The `/servers` request should return the React app because Nginx has an SPA fallback.

## Logs

```bash
docker compose --env-file .env.production -f docker-compose.production.yml logs -f api
docker compose --env-file .env.production -f docker-compose.production.yml logs -f collector
docker compose --env-file .env.production -f docker-compose.production.yml logs -f web
```

## Stop And Restart

```bash
docker compose --env-file .env.production -f docker-compose.production.yml stop
docker compose --env-file .env.production -f docker-compose.production.yml restart api collector web
```

## Backups

```bash
./scripts/backup-production.sh
```

Backups are written to `backups/` by default.

## Restore

```bash
./scripts/restore-production.sh backups/mysql-monitor-YYYYMMDDTHHMMSSZ.sql.gz
```

Restore stops API and collector, imports the database dump, runs migrations, and restarts the app services.
