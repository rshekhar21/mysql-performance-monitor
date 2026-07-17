# Production Readiness Audit

Date: 2026-07-17

This audit records the `p3.md` production-readiness pass and the `p4.md` CloudPanel deployment work.

## Inventory

### Frontend Routes

| Route              | Status                       | Notes                                                                                 |
| ------------------ | ---------------------------- | ------------------------------------------------------------------------------------- |
| `/login`           | Implemented and tested       | Login form and auth redirect coverage exists.                                         |
| `/`                | Implemented and tested       | Overview uses real API data and historical snapshots.                                 |
| `/servers`         | Implemented and tested       | Add, test, create, edit, enable/disable, delete workflows covered by component tests. |
| `/connections`     | Implemented                  | Uses overview, metrics, and running-query APIs.                                       |
| `/queries`         | Implemented                  | Uses query digest snapshots.                                                          |
| `/running-queries` | Implemented                  | Uses live read-only process-list endpoint.                                            |
| `/innodb`          | Implemented                  | Uses latest InnoDB snapshot endpoint.                                                 |
| `/storage`         | Implemented                  | Uses database/table/storage history snapshots.                                        |
| `/replication`     | Implemented                  | Uses latest replication snapshot.                                                     |
| `/alerts`          | Implemented                  | Lists and acknowledges alert events.                                                  |
| `/alert-rules`     | Implemented                  | Create, enable/disable, and delete are wired to backend endpoints.                    |
| `/collector`       | Implemented                  | Lists collector runs.                                                                 |
| `/users`           | Implemented and smoke-tested | Read-only user and role list.                                                         |
| `/audit`           | Implemented and smoke-tested | Read-only audit log list.                                                             |
| `/settings`        | Implemented and smoke-tested | Read-only app settings list.                                                          |

No placeholder route usage remains in `apps/web/src`.

### Production Deployment

| Item                            | Status                      | Notes                                                                   |
| ------------------------------- | --------------------------- | ----------------------------------------------------------------------- |
| `docker-compose.production.yml` | Implemented                 | App DB is private; app ports bind to `127.0.0.1`; health checks added.  |
| `.env.production.example`       | Implemented                 | Safe defaults and production domain included.                           |
| `scripts/install-production.sh` | Implemented, syntax-checked | Generates secrets, checks ports, runs migrations/seed, starts services. |
| `scripts/deploy-production.sh`  | Implemented, syntax-checked | Backs up before migrations and avoids unnecessary app-db recreation.    |
| `scripts/backup-production.sh`  | Implemented, syntax-checked | Uses `mysqldump` from the private app-db container.                     |
| `scripts/restore-production.sh` | Implemented, syntax-checked | Stops app services, imports dump, migrates, restarts.                   |
| `apps/web/nginx.conf`           | Implemented                 | Includes `try_files $uri $uri/ /index.html;` SPA fallback.              |
| `docs/cloudpanel-deployment.md` | Implemented                 | Includes CloudPanel reverse-proxy and Vhost config.                     |
| `docs/production-upgrade.md`    | Implemented                 | Includes backup, upgrade, verification, rollback.                       |

## Verification Completed

| Command                                                                                                                         | Result           |
| ------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `bash -n scripts/install-production.sh scripts/deploy-production.sh scripts/backup-production.sh scripts/restore-production.sh` | Passed           |
| `npm.cmd run format:check`                                                                                                      | Passed           |
| `npm.cmd run lint`                                                                                                              | Passed           |
| `npm.cmd run typecheck`                                                                                                         | Passed           |
| `npm.cmd test`                                                                                                                  | Passed, 23 tests |
| `npm.cmd run build`                                                                                                             | Passed           |

## Verification Blocked In This Workspace

Docker is not installed in this Windows workspace.

The following commands could not be run here:

```powershell
docker --version
docker compose version
docker compose --env-file .env.production.example -f docker-compose.production.yml config
```

Observed error:

```text
docker : The term 'docker' is not recognized as the name of a cmdlet, function, script file, or operable program.
```

Because Docker is unavailable here, these `p3.md`/`p4.md` checks remain unverified locally:

- clean Docker Compose startup;
- production container health checks;
- migration/seed against production compose app-db;
- clean first install from checkout;
- upgrade without data loss;
- container restart recovery;
- direct `/servers` test through the running production web container;
- CloudPanel reverse-proxy runtime test.

These are documented in `docs/cloudpanel-deployment.md` and should be executed on the Ubuntu VPS or another machine with Docker Compose v2.

## Completion Matrix

| Area                                   | Status                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------- |
| Authentication workflow                | Implemented and tested                                                  |
| Protected routes                       | Implemented and tested                                                  |
| Add monitored server workflow          | Implemented and tested                                                  |
| Server edit/test/enable-disable/delete | Implemented; create/test/cache paths tested                             |
| Credentials not returned to frontend   | Implemented by API response types and repository mapping                |
| Collector process separation           | Implemented                                                             |
| Snapshot-backed dashboard pages        | Implemented                                                             |
| Placeholder pages                      | Removed                                                                 |
| Production API URL fallback prevention | Implemented                                                             |
| Private production app database        | Implemented in production compose                                       |
| CloudPanel reverse proxy docs          | Implemented                                                             |
| Production Docker runtime test         | Blocked by missing Docker in this workspace                             |
| Full browser E2E suite                 | Intentionally deferred; current coverage is component/API/unit-oriented |
| Editable user management               | Intentionally deferred; current page is read-only                       |
| Editable settings management           | Intentionally deferred; current page is read-only                       |
| External alert notifications           | Intentionally deferred as an extension point                            |
