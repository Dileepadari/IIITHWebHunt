#!/bin/bash
set -e

# Website Hunt Database Backup Script
echo "💾 Creating database backup..."

# Load environment variables
if [ -f .env ]; then
    source .env
fi

# Create backup directory
BACKUP_DIR="docker/backups"
mkdir -p $BACKUP_DIR

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="websitehunt_backup_$TIMESTAMP.sql"

# Determine database connection details based on environment
if [ "$NODE_ENV" = "production" ]; then
    DB_CONTAINER="websitehunt-db"
    DB_NAME="websitehunt"
    DB_USER="websitehunt_user"
else
    DB_CONTAINER="websitehunt-db-dev"
    DB_NAME="websitehunt_dev"
    DB_USER="websitehunt_dev"
fi

# Create backup
echo "📦 Backing up database: $DB_NAME"
docker exec $DB_CONTAINER pg_dump -U $DB_USER -d $DB_NAME > "$BACKUP_DIR/$BACKUP_FILE"

# Compress backup
echo "🗜️  Compressing backup..."
gzip "$BACKUP_DIR/$BACKUP_FILE"
BACKUP_FILE="$BACKUP_FILE.gz"

echo "✅ Database backup created: $BACKUP_DIR/$BACKUP_FILE"

# Clean up old backups (keep last 10)
echo "🧹 Cleaning up old backups..."
cd $BACKUP_DIR
ls -t websitehunt_backup_*.sql.gz | tail -n +11 | xargs -r rm --

echo "💡 Backup completed successfully!"
echo "📁 Backup location: $BACKUP_DIR/$BACKUP_FILE"
echo "📊 Backup size: $(du -h $BACKUP_DIR/$BACKUP_FILE | cut -f1)"