#!/bin/bash
set -e

# Website Hunt Docker Entrypoint Script
echo "🚀 Starting Website Hunt Platform..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
until nc -z database 5432; do
  echo "Database is unavailable - sleeping"
  sleep 2
done
echo "✅ Database is ready!"

# Wait for Redis to be ready
echo "⏳ Waiting for Redis connection..."
until nc -z redis 6379; do
  echo "Redis is unavailable - sleeping"
  sleep 2
done
echo "✅ Redis is ready!"

# Run database migrations
echo "🔄 Running database migrations..."
npm run db:push

# Seed initial data if needed
if [ "$SEED_DATABASE" = "true" ]; then
    echo "🌱 Seeding database with initial data..."
    npm run db:seed
fi

echo "🎮 Website Hunt Platform is ready!"
echo "🌐 Access the application at: http://localhost:5000"
echo "🔧 Admin panel available for administrators"

# Start the application
exec "$@"