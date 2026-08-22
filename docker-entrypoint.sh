#!/bin/sh
# Website Hunt container entrypoint.
#
# node:*-alpine ships busybox sh, not bash, so this stays POSIX.
set -e

echo "🚀 Starting Website Hunt Platform..."

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL is not set. Refusing to start."
  exit 1
fi

# Derive the host and port from DATABASE_URL rather than assuming the
# docker-compose service name. Hardcoding "database" meant any external Postgres
# (a managed instance, a different compose service name) left the container
# waiting forever on a host that does not exist.
#   strip the scheme -> strip credentials up to the last "@" -> drop /path and ?query
DB_HOSTPORT=$(printf '%s' "$DATABASE_URL" \
  | sed -e 's|^[a-zA-Z][a-zA-Z0-9+.-]*://||' -e 's|.*@||' -e 's|[/?].*$||')
DB_HOST=${DB_HOSTPORT%%:*}
DB_PORT=${DB_HOSTPORT##*:}
# No colon in the authority means no explicit port.
[ "$DB_PORT" = "$DB_HOST" ] && DB_PORT=5432
[ -n "$DB_HOST" ] || DB_HOST=database

echo "⏳ Waiting for database at ${DB_HOST}:${DB_PORT}..."
attempt=0
max_attempts=${DB_WAIT_ATTEMPTS:-60}
until nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$max_attempts" ]; then
    # Fail loudly instead of hanging forever, so an orchestrator can restart us
    # and the logs say why.
    echo "❌ Database not reachable at ${DB_HOST}:${DB_PORT} after ${max_attempts} attempts."
    exit 1
  fi
  echo "Database is unavailable - sleeping ($attempt/$max_attempts)"
  sleep 2
done
echo "✅ Database is ready!"

echo "🔄 Applying database schema..."
npm run db:push

# Seeding is what creates the first admin account, so a brand-new deployment
# needs SEED_DATABASE=true and ADMIN_PASSWORD set at least once - otherwise the
# admin panel is unreachable. Safe to leave on: the seed is idempotent.
if [ "${SEED_DATABASE:-false}" = "true" ]; then
    echo "🌱 Seeding database..."
    npm run db:seed
fi

echo "🎮 Website Hunt is ready on port ${PORT:-5000}"

exec "$@"
