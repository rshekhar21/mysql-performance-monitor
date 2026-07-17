# Development

Use Node.js 22 or newer.

```bash
npm install
docker compose up -d app-db test-mysql
npm run build:packages
npm run db:migrate
npm run db:seed
npm run dev
```

The seed command creates roles. If `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are set, it also creates an initial `super_admin` user for local development.

Services:

- API: `http://localhost:4000`
- Collector health: `http://localhost:4100`
- Web: `http://localhost:5173`
- App DB: `localhost:3306`
- Test monitored MySQL: `localhost:3307`
