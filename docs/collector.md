# Collector

The collector is a separate Node.js process with its own entrypoint:

```text
apps/collector/src/worker.ts
```

Phase 1 provides the lifecycle, health server, scheduler shell, database connection, and graceful shutdown.

Phase 2 adds:

- capability detection
- global status collection
- InnoDB collection
- database and table size collection
- counter delta calculations
- collector-run persistence
- per-server database-backed locks using `GET_LOCK`
- bounded collection concurrency
- server-specific monitored MySQL pools

Phase 4 adds:

- query digest collection
- alert evaluation
- replication snapshot persistence
- read-only running-query API support through the API service
