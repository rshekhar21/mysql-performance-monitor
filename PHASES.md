# MySQL Performance Monitor Build Phases

This file is the working reference for the staged implementation requested in `prompts/p1.md`.

## Phase 1: Foundation

Status: completed

- Monorepo workspace and TypeScript configuration.
- Linting, formatting, testing, and build scripts.
- Shared packages for types, validation, config, database, and metric helpers.
- Monitoring application database migrations.
- API foundation with auth/RBAC primitives, monitored-server CRUD shape, standard responses, logging, errors, validation, and health endpoints.
- Collector process entrypoint and lifecycle foundation.
- Web app shell with routing, layout, API client, placeholder pages, and auth/server UI foundations.
- Docker Compose, Dockerfiles, environment examples, CI, and initial documentation.

## Phase 2: Core Collection

Status: completed

- Server capability detection.
- Global status, InnoDB, database-size, and table-size collection.
- Counter delta and restart-safe rate calculations.
- Snapshot persistence, collector-run tracking, retention cleanup, and collection tests.

## Phase 3: Operational Dashboard

Status: completed

- Real dashboard shell using historical snapshots.
- Overview cards, line charts, storage views, largest database/table lists, and collector health page.
- Server-side aggregation and frontend state/query organization.

## Phase 4: Query And Alerting

Status: completed

- Query digest collection and running-query inspection.
- Alert-rule evaluation, deduplication, acknowledgement, and replication monitoring where supported.

## Reference Rules

- API and collector are separate executable Node.js processes.
- Routine collection never depends on browser, dashboard refresh, or API requests.
- Monitored-server credentials are encrypted at rest and never sent to the frontend.
- Counter metrics become rates only through snapshot deltas over elapsed time.
- SQL lives in repositories/database modules, not route handlers or React components.
