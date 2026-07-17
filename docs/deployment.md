# Deployment

The API, collector, and web app are independently deployable services. They may run on the same VPS or Docker Compose host initially, but must remain separate processes.

For the supported Ubuntu VPS + CloudPanel deployment path, use:

- `docs/cloudpanel-deployment.md`
- `docs/production-upgrade.md`
- `docker-compose.production.yml`
- `.env.production.example`
- `scripts/install-production.sh`
- `scripts/deploy-production.sh`
- `scripts/backup-production.sh`
- `scripts/restore-production.sh`

Production requirements:

- provide real `APP_DATABASE_URL`
- provide strong `CREDENTIAL_ENCRYPTION_KEY`
- provide strong `JWT_SECRET`
- restrict `CORS_ORIGIN`
- run migrations before application startup
- configure log shipping and backup policy
- configure retention settings before high-volume collection

Production safety defaults:

- the application database runs in Docker but is not published to the VPS host;
- API, collector health, and web ports bind to `127.0.0.1`;
- CloudPanel proxies public HTTPS traffic to loopback ports;
- React is served by Nginx with an SPA fallback for direct routes like `/servers`;
- production builds require `VITE_API_BASE_URL`/`PUBLIC_API_BASE_URL` and do not fall back to localhost.
