#!/bin/bash
set -e

# Website Hunt Monitoring Setup Script
echo "📊 Setting up monitoring for Website Hunt Platform..."

# Check if Docker and Docker Compose are installed
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Please install Docker first."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed. Please install Docker Compose first."; exit 1; }

# Start monitoring stack
echo "🚀 Starting monitoring services..."
docker-compose --profile monitoring up -d

echo ""
echo "✅ Monitoring stack is starting up!"
echo ""
echo "📋 Monitoring services:"
echo "   📊 Prometheus:     http://localhost:9090"
echo "   📈 Grafana:        http://localhost:3000"
echo ""
echo "🔑 Default credentials:"
echo "   Grafana:          admin / admin_change_me (from .env)"
echo ""
echo "📝 Useful commands:"
echo "   View logs:         docker-compose --profile monitoring logs -f"
echo "   Stop monitoring:   docker-compose --profile monitoring down"
echo ""
echo "📊 Available metrics:"
echo "   - Application performance"
echo "   - Database connections"
echo "   - Redis cache hits"
echo "   - System resources"
echo "   - API response times"
echo ""
echo "⏳ Services are starting up... Grafana will be available in ~30 seconds."