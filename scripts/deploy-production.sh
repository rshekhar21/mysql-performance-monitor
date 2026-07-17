#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"

log() {
  printf '[deploy] %s\n' "$*"
}

fail() {
  printf '[deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
  else
    fail "Docker Compose is not installed"
  fi
}

[[ -f "$ENV_FILE" ]] || fail "Missing $ENV_FILE. Run scripts/install-production.sh first."
[[ -f "$COMPOSE_FILE" ]] || fail "Missing $COMPOSE_FILE"

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

[[ "${PUBLIC_API_BASE_URL:-}" != *localhost* ]] || fail "PUBLIC_API_BASE_URL must not point to localhost in production"

log "Backing up application database before deployment"
"$ROOT_DIR/scripts/backup-production.sh"

log "Building changed production images"
compose build api collector web

log "Ensuring private app-db is running"
compose up -d --no-deps app-db

log "Waiting for app-db"
for _ in {1..60}; do
  if compose exec -T app-db sh -c 'mysqladmin ping -h 127.0.0.1 -uroot -p"$MYSQL_ROOT_PASSWORD" --silent' >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

log "Running migrations"
compose run --rm --no-deps api node packages/database/dist/migrate.js

if [[ -n "${SEED_ADMIN_EMAIL:-}" && -n "${SEED_ADMIN_PASSWORD:-}" && "${SEED_ADMIN_PASSWORD}" != replace-* ]]; then
  log "Running idempotent seed"
  compose run --rm --no-deps api node packages/database/dist/seed.js
fi

log "Recreating changed application services"
compose up -d --no-deps api collector web

log "Deployment complete"
compose ps
