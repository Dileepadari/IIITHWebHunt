#!/bin/bash
set -e

# Website Hunt Docker Setup Script
echo "🐳 Setting up Website Hunt Platform with Docker..."

# Check if Docker and Docker Compose are installed
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Please install Docker first."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed. Please install Docker Compose first."; exit 1; }

# Create necessary directories
echo "📁 Creating required directories..."
mkdir -p logs
mkdir -p docker/ssl
mkdir -p docker/backups

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before starting!"
fi

# Make scripts executable
chmod +x docker-entrypoint.sh
chmod +x scripts/*.sh

# Build and start development environment
echo "🏗️  Building development environment..."
docker-compose -f docker-compose.dev.yml build

echo "🚀 Starting development services..."
docker-compose -f docker-compose.dev.yml up -d

echo ""
echo "✅ Website Hunt Platform is starting up!"
echo ""
echo "📋 Available services:"
echo "   🎮 Application:     http://localhost:5000"
echo "   🗄️  Database:       postgresql://localhost:5433/websitehunt_dev"
echo "   🔧 pgAdmin:        http://localhost:8080"
echo "   📊 Redis:          redis://localhost:6380"
echo ""
echo "🔑 Default credentials:"
echo "   Admin Login:       devadmin / devpass"
echo "   Test User:         testuser / testpass"
echo "   pgAdmin:          admin@websitehunt.dev / admin_password"
echo ""
echo "📝 Useful commands:"
echo "   View logs:         docker-compose -f docker-compose.dev.yml logs -f"
echo "   Stop services:     docker-compose -f docker-compose.dev.yml down"
echo "   Restart app:       docker-compose -f docker-compose.dev.yml restart app-dev"
echo ""
echo "⏳ Services are starting up... This may take a few minutes on first run."
echo "💡 Check logs with: docker-compose -f docker-compose.dev.yml logs -f"