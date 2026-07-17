# Deployment

The API, collector, and web app are independently deployable services. They may run on the same VPS or Docker Compose host initially, but must remain separate processes.

Production requirements:

- provide real `APP_DATABASE_URL`
- provide strong `CREDENTIAL_ENCRYPTION_KEY`
- provide strong `JWT_SECRET`
- restrict `CORS_ORIGIN`
- run migrations before application startup
- configure log shipping and backup policy
- configure retention settings before high-volume collection
