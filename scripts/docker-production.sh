#!/bin/bash
set -e

# Website Hunt Production Docker Setup Script
echo "🐳 Setting up Website Hunt Platform for Production..."

# Check if Docker and Docker Compose are installed
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Please install Docker first."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed. Please install Docker Compose first."; exit 1; }

# Create necessary directories
echo "📁 Creating required directories..."
mkdir -p logs
mkdir -p docker/ssl
mkdir -p docker/backups

# Check for environment file
if [ ! -f .env ]; then
    echo "❌ Production .env file is required! Please create it from .env.example"
    exit 1
fi

# Validate critical environment variables
echo "🔍 Validating environment configuration..."
source .env

if [ -z "$DB_PASSWORD" ] || [ "$DB_PASSWORD" = "secure_password_change_in_production" ]; then
    echo "❌ Please set a secure DB_PASSWORD in .env file"
    exit 1
fi

if [ -z "$SESSION_SECRET" ] || [ "$SESSION_SECRET" = "change_this_in_production_please" ]; then
    echo "❌ Please set a secure SESSION_SECRET in .env file"
    exit 1
fi

# Build and start production environment
echo "🏗️  Building production environment..."
docker-compose build --no-cache

echo "🚀 Starting production services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Run database migrations
echo "🔄 Running database migrations..."
docker-compose exec app npm run db:push

echo ""
echo "✅ Website Hunt Platform is running in production mode!"
echo ""
echo "📋 Available services:"
echo "   🎮 Application:     http://localhost:5000"
echo "   🗄️  Database:       postgresql://localhost:5432/websitehunt"
echo "   📊 Redis:          redis://localhost:6379"
echo ""
echo "📝 Useful commands:"
echo "   View logs:         docker-compose logs -f"
echo "   Stop services:     docker-compose down"
echo "   Restart app:       docker-compose restart app"
echo "   Database backup:   ./scripts/backup-database.sh"
echo ""
echo "🔒 Security reminders:"
echo "   - Change default passwords in .env"
echo "   - Configure SSL certificates for HTTPS"
echo "   - Set up firewall rules"
echo "   - Configure log rotation"
echo "   - Set up monitoring alerts"