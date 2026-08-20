#!/usr/bin/env bash
# Bootstrap the LOCAL dev database + object storage for Lextract.
# Idempotent-ish: re-running re-applies migrations (most use IF NOT EXISTS).
# Requires the local docker stack infra (postgres, minio) to be up.
set -euo pipefail

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.local.yml)
MIG_DIR="$(cd "$(dirname "$0")/.." && pwd)/neon/migrations"

echo ">> Stub auth.user_id() for plain Postgres (Neon provides this natively)"
"${COMPOSE[@]}" exec -T postgres psql -U lextract -d lextract -v ON_ERROR_STOP=1 <<'SQL'
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS text AS $$ SELECT NULL::text $$ LANGUAGE sql STABLE;
SQL

echo ">> Apply migrations in order"
for f in $(ls "$MIG_DIR"/*.sql | sort); do
  echo "   applying $(basename "$f")"
  "${COMPOSE[@]}" exec -T postgres psql -U lextract -d lextract -v ON_ERROR_STOP=1 < "$f"
done

echo ">> Create MinIO bucket lextract-documents"
"${COMPOSE[@]}" exec -T minio sh -c '
  mc alias set local http://localhost:9000 minioadmin minioadmin >/dev/null 2>&1 || true
  mc mb -p local/lextract-documents >/dev/null 2>&1 || true
  mc ls local
'

echo ">> Done. Tables:"
"${COMPOSE[@]}" exec -T postgres psql -U lextract -d lextract -c "\dt"
