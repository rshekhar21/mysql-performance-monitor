# Security

Phase 1 security foundation:

- password hashes are verified with bcrypt-compatible hashes
- API tokens use a server-side JWT secret
- role-based permissions are centralized
- monitored-server passwords are encrypted with AES-256-GCM before storage
- credentials are never returned by monitored-server API responses
- logs redact authorization headers, cookies, passwords, and tokens
- Helmet, strict CORS, request IDs, validation, and auth rate limiting are enabled
- audit log writes are used for sensitive monitored-server actions

Do not grant write privileges to monitored MySQL users for basic monitoring.

Running-query inspection is read-only. The application does not expose kill-query, restart, configuration-write, or destructive monitored-server actions.
