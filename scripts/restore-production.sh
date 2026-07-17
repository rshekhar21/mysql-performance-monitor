#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"

log() {
  printf '[restore] %s\n' "$*"
}

fail() {
  printf '[restore] ERROR: %s\n' "$*" >&2
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

backup_file="${1:-}"
[[ -n "$backup_file" ]] || fail "Usage: scripts/restore-production.sh backups/mysql-monitor-YYYYMMDDTHHMMSSZ.sql.gz"
[[ -f "$backup_file" ]] || fail "Backup file not found: $backup_file"
[[ -f "$ENV_FILE" ]] || fail "Missing $ENV_FILE"

log "Stopping API and collector before restore"
compose stop api collector || true
compose up -d --no-deps app-db

log "Waiting for app-db"
for _ in {1..60}; do
  if compose exec -T app-db sh -c 'mysqladmin ping -h 127.0.0.1 -uroot -p"$MYSQL_ROOT_PASSWORD" --silent' >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

log "Restoring $backup_file"
case "$backup_file" in
  *.gz) gzip -dc "$backup_file" | compose exec -T app-db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' ;;
  *) cat "$backup_file" | compose exec -T app-db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' ;;
esac

log "Running migrations after restore"
compose run --rm --no-deps api node packages/database/dist/migrate.js

log "Restarting services"
compose up -d --no-deps api collector web
compose ps

log "Restore complete"
