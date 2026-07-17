#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"

log() {
  printf '[install] %s\n' "$*"
}

fail() {
  printf '[install] ERROR: %s\n' "$*" >&2
  exit 1
}

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
  else
    fail "Docker Compose is not installed. Install Docker Compose v2 and run this again."
  fi
}

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 48 | tr '+/' '-_' | tr -d '='
  else
    tr -dc 'A-Za-z0-9_-' </dev/urandom | head -c 64
  fi
}

set_env_value() {
  local key="$1"
  local value="$2"

  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s#^${key}=.*#${key}=${value}#" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$value" >>"$ENV_FILE"
  fi
}

get_env_value() {
  local key="$1"
  grep -E "^${key}=" "$ENV_FILE" | tail -n 1 | cut -d= -f2-
}

port_is_free() {
  local host="$1"
  local port="$2"

  if command -v ss >/dev/null 2>&1; then
    ! ss -ltn "sport = :${port}" | grep -q ":${port}"
  else
    ! nc -z "$host" "$port" >/dev/null 2>&1
  fi
}

require_file() {
  [[ -f "$1" ]] || fail "Missing required file: $1"
}

require_file "$COMPOSE_FILE"

if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f ".env.production.example" ]]; then
    cp .env.production.example "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    log "Created $ENV_FILE from .env.production.example"
  else
    fail "Create $ENV_FILE first. Example: cp .env.production.example .env.production"
  fi
else
  log "$ENV_FILE already exists; it will not be overwritten"
fi

for key in APP_DB_PASSWORD APP_DB_ROOT_PASSWORD JWT_SECRET CREDENTIAL_ENCRYPTION_KEY; do
  current="$(get_env_value "$key" || true)"
  if [[ -z "$current" || "$current" == replace-* ]]; then
    set_env_value "$key" "$(generate_secret)"
    log "Generated $key"
  fi
done

APP_DB_USER="$(get_env_value APP_DB_USER)"
APP_DB_PASSWORD="$(get_env_value APP_DB_PASSWORD)"
APP_DB_NAME="$(get_env_value APP_DB_NAME)"
set_env_value "APP_DATABASE_URL" "mysql://${APP_DB_USER}:${APP_DB_PASSWORD}@app-db:3306/${APP_DB_NAME}"

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

[[ "${PUBLIC_API_BASE_URL:-}" != *localhost* ]] || fail "PUBLIC_API_BASE_URL must not point to localhost in production"
[[ "${CORS_ORIGIN:-}" != *localhost* ]] || fail "CORS_ORIGIN must not point to localhost in production"

for item in "${WEB_HOST:-127.0.0.1}:${WEB_HOST_PORT:-8085}" "${API_HOST:-127.0.0.1}:${API_HOST_PORT:-4400}" "${COLLECTOR_HOST:-127.0.0.1}:${COLLECTOR_HOST_PORT:-4410}"; do
  host="${item%:*}"
  port="${item##*:}"
  port_is_free "$host" "$port" || fail "Port $host:$port is already in use"
done

command -v docker >/dev/null 2>&1 || fail "Docker is not installed"
docker info >/dev/null 2>&1 || fail "Docker daemon is not running or current user cannot access Docker"

log "Building production images"
compose build api collector web

log "Starting private application database"
compose up -d --no-deps app-db

log "Waiting for app-db health"
for _ in {1..60}; do
  if compose exec -T app-db sh -c 'mysqladmin ping -h 127.0.0.1 -uroot -p"$MYSQL_ROOT_PASSWORD" --silent' >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

log "Running database migrations"
compose run --rm --no-deps api node packages/database/dist/migrate.js

if [[ -n "${SEED_ADMIN_EMAIL:-}" && -n "${SEED_ADMIN_PASSWORD:-}" && "${SEED_ADMIN_PASSWORD}" != replace-* ]]; then
  log "Running idempotent seed for roles and optional first admin"
  compose run --rm --no-deps api node packages/database/dist/seed.js
else
  log "Skipping admin seed; set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in $ENV_FILE to create one"
fi

log "Starting API, collector, and web"
compose up -d --no-deps api collector web

log "Health status"
compose ps

log "Installation complete. Configure CloudPanel to proxy / to 127.0.0.1:${WEB_HOST_PORT:-8085} and /api/, /health, /ready to 127.0.0.1:${API_HOST_PORT:-4400}."
