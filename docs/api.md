# API

The API is versioned under `/api/v1`.

Implemented in Phase 1:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/servers`
- `POST /api/v1/servers`
- `GET /api/v1/servers/:serverId`
- `PATCH /api/v1/servers/:serverId`
- `DELETE /api/v1/servers/:serverId`
- `POST /api/v1/servers/test-connection`
- `POST /api/v1/servers/:serverId/test-connection`
- `GET /api/v1/servers/:serverId/overview`
- `GET /api/v1/servers/:serverId/metrics`
- `GET /api/v1/servers/:serverId/databases`
- `GET /api/v1/servers/:serverId/tables`
- `GET /api/v1/servers/:serverId/storage-history`
- `GET /api/v1/servers/:serverId/collector-runs`
- `GET /api/v1/servers/:serverId/query-performance`
- `GET /api/v1/servers/:serverId/running-queries`
- `GET /api/v1/servers/:serverId/replication`
- `GET /api/v1/alerts`
- `POST /api/v1/alerts/:alertId/acknowledge`
- `GET /api/v1/alert-rules`
- `POST /api/v1/alert-rules`
- `GET /health`
- `GET /ready`
- `GET /openapi.json`

Standard success response:

```json
{
  "success": true,
  "data": {},
  "meta": {},
  "requestId": "..."
}
```

Standard error response:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "A safe user-facing message",
    "details": []
  },
  "requestId": "..."
}
```
