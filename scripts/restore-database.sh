#!/bin/bash
set -e

# Website Hunt Database Restore Script
echo "🔄 Database restore script for Website Hunt"

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "❌ Usage: $0 <backup_file.sql.gz>"
    echo "📁 Available backups:"
    ls -la docker/backups/websitehunt_backup_*.sql.gz 2>/dev/null || echo "   No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    source .env
fi

# Determine database connection details based on environment
if [ "$NODE_ENV" = "production" ]; then
    DB_CONTAINER="websitehunt-db"
    DB_NAME="websitehunt"
    DB_USER="websitehunt_user"
else
    DB_CONTAINER="websitehunt-db-dev"
    DB_NAME="websitehunt"
    DB_USER="websitehunt_user"
fi

# Confirmation prompt
read -p "⚠️  This will overwrite the current database. Are you sure? [y/N]: " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Restore cancelled"
    exit 1
fi

# Stop application to prevent connections
echo "⏸️  Stopping application..."
docker-compose stop app 2>/dev/null || docker-compose -f docker-compose.dev.yml stop app-dev 2>/dev/null || true

# Decompress and restore backup
echo "📦 Decompressing backup..."
if [ "${BACKUP_FILE##*.}" = "gz" ]; then
    gunzip -c "$BACKUP_FILE" | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME
else
    cat "$BACKUP_FILE" | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME
fi

echo "✅ Database restored successfully!"

# Restart application
echo "▶️  Restarting application..."
docker-compose start app 2>/dev/null || docker-compose -f docker-compose.dev.yml start app-dev 2>/dev/null || true

echo "🎉 Restore completed! Application is starting up..."