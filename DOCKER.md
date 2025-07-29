# Docker Setup for Website Hunt Platform

This document provides comprehensive instructions for running the Website Hunt platform using Docker containers.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available for containers
- 10GB free disk space

## Quick Start

### Development Environment

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd website-hunt
   chmod +x scripts/*.sh
   ```

2. **Start development environment:**
   ```bash
   ./scripts/docker-setup.sh
   ```

3. **Access the application:**
   - Application: http://localhost:5000
   - pgAdmin: http://localhost:8080
   - Database: postgresql://localhost:5433/websitehunt_dev

### Production Environment

1. **Setup environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your production settings
   ```

2. **Start production environment:**
   ```bash
   ./scripts/docker-production.sh
   ```

3. **Access the application:**
   - Application: http://localhost:5000
   - Database: postgresql://localhost:5432/websitehunt

## Container Architecture

### Core Services

- **app**: Website Hunt application (Node.js + Express + React)
- **database**: PostgreSQL 16 database
- **redis**: Redis cache for sessions

### Optional Services

- **nginx**: Reverse proxy with load balancing
- **prometheus**: Metrics collection
- **grafana**: Monitoring dashboards
- **pgadmin**: Database administration (dev only)

## Environment Configuration

### Required Environment Variables

```env
# Database
DB_PASSWORD=secure_password_change_in_production
DATABASE_URL=postgresql://websitehunt_user:password@database:5432/websitehunt

# Redis
REDIS_PASSWORD=redis_password_change_in_production
REDIS_URL=redis://:password@redis:6379

# Session
SESSION_SECRET=change_this_in_production_please

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Optional Configuration

```env
# Monitoring
GRAFANA_PASSWORD=admin_change_me

# SMTP (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_password
```

## Docker Compose Profiles

### Development Profile (default)
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Production Profile
```bash
docker-compose up -d
```

### With Nginx Reverse Proxy
```bash
docker-compose --profile with-nginx up -d
```

### With Monitoring Stack
```bash
docker-compose --profile monitoring up -d
```

## Database Management

### Backups

**Create backup:**
```bash
./scripts/backup-database.sh
```

**Restore backup:**
```bash
./scripts/restore-database.sh docker/backups/websitehunt_backup_20240101_120000.sql.gz
```

### Manual Database Operations

**Connect to database:**
```bash
# Development
docker exec -it websitehunt-db-dev psql -U websitehunt_dev -d websitehunt_dev

# Production
docker exec -it websitehunt-db psql -U websitehunt_user -d websitehunt
```

**Run migrations:**
```bash
docker-compose exec app npm run db:push
```

## Monitoring and Logging

### View Logs

**All services:**
```bash
docker-compose logs -f
```

**Specific service:**
```bash
docker-compose logs -f app
docker-compose logs -f database
docker-compose logs -f redis
```

### Monitoring Setup

**Start monitoring stack:**
```bash
./scripts/docker-monitoring.sh
```

**Access monitoring:**
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000

### Performance Metrics

The monitoring stack provides:
- Application response times
- Database connection pool metrics  
- Redis cache hit rates
- System resource usage
- Custom game metrics (active players, conquests, etc.)

## Security Configuration

### Production Security Checklist

- [ ] Change all default passwords in `.env`
- [ ] Configure SSL certificates for HTTPS
- [ ] Set up firewall rules
- [ ] Enable log rotation
- [ ] Configure backup encryption
- [ ] Set up monitoring alerts
- [ ] Update Docker images regularly

### SSL Configuration

1. **Generate SSL certificates:**
   ```bash
   mkdir -p docker/ssl
   # Add your SSL certificates:
   # docker/ssl/cert.pem
   # docker/ssl/key.pem
   ```

2. **Enable HTTPS in nginx configuration:**
   ```bash
   # Uncomment HTTPS server block in docker/nginx/conf.d/websitehunt.conf
   ```

## Troubleshooting

### Common Issues

**Port conflicts:**
```bash
# Check what's using ports
sudo netstat -tulpn | grep :5000
sudo netstat -tulpn | grep :5432

# Stop conflicting services or change ports in docker-compose.yml
```

**Database connection issues:**
```bash
# Check database logs
docker-compose logs database

# Verify database is ready
docker-compose exec database pg_isready -U websitehunt_user
```

**Application won't start:**
```bash
# Check application logs
docker-compose logs app

# Rebuild containers
docker-compose build --no-cache
docker-compose up -d
```

### Container Health Checks

**Check service status:**
```bash
docker-compose ps
```

**Manual health checks:**
```bash
# Database
docker-compose exec database pg_isready -U websitehunt_user

# Redis  
docker-compose exec redis redis-cli ping

# Application
curl -f http://localhost:5000/api/health
```

## Performance Optimization

### Resource Limits

The containers are configured with reasonable resource limits:

- **app**: 2GB RAM, 2 CPU cores
- **database**: 1GB RAM, 1 CPU core  
- **redis**: 512MB RAM, 0.5 CPU core

Adjust in `docker-compose.yml` based on your system:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### Volume Optimization

Use named volumes for better performance:
- `postgres_data`: Database storage
- `redis_data`: Cache storage  
- `nginx_logs`: Web server logs

## Maintenance

### Regular Maintenance Tasks

**Weekly:**
- Check disk usage: `docker system df`
- Review logs for errors
- Backup database
- Update dependency images

**Monthly:**
- Clean up unused images: `docker image prune -a`
- Update base images
- Review and rotate SSL certificates
- Update environment secrets

**Quarterly:**
- Full security audit
- Performance review
- Backup testing
- Disaster recovery testing

### Updates and Deployment

**Update application:**
```bash
git pull
docker-compose build app
docker-compose up -d app
```

**Update all services:**
```bash
docker-compose pull
docker-compose build
docker-compose up -d
```

## Support and Development

### Development Workflow

1. Make changes to source code
2. Rebuild development container: `docker-compose -f docker-compose.dev.yml build app-dev`
3. Restart development services: `docker-compose -f docker-compose.dev.yml restart app-dev`
4. Test changes at http://localhost:5000

### Contributing

When contributing Docker-related changes:
1. Test in both development and production configurations
2. Update this documentation
3. Verify all health checks pass
4. Test backup/restore procedures

For more information, see the main [README.md](README.md) and [DEPLOYMENT.md](DEPLOYMENT.md) files.