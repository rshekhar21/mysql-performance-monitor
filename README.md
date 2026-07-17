# MySQL Performance Monitor

Production-oriented MySQL monitoring and performance dashboard.

The repository is being built in phases from `prompts/p1.md`. Phase 1 establishes the monorepo, API, collector, web shell, database schema, security primitives, Docker Compose, CI, and documentation.

## Services

- `apps/web`: React, TypeScript, Vite, Tailwind dashboard.
- `apps/api`: Express API for authentication, RBAC, monitored-server management, health checks, and future metric queries.
- `apps/collector`: independent worker process for scheduled collection.
- `packages/*`: shared types, validation, config, database pool, and metric math.

## Local Start

```bash
cp .env.example .env
npm install
docker compose up -d app-db test-mysql
npm run build:packages
npm run db:migrate
npm run db:seed
npm run dev
```

PowerShell may block `npm.ps1`; use `npm.cmd` if needed.

## Verification

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## Phase Status

See `PHASES.md`.
