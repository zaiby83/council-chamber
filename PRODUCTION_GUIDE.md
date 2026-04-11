# Production Deployment Guide

## Overview

This guide covers deploying Council Chamber to production with all the new infrastructure improvements including logging, monitoring, security, and containerization.

## New Features

### Infrastructure
- ✅ Structured logging with Winston
- ✅ Error handling and tracking
- ✅ Security middleware (Helmet, rate limiting)
- ✅ Health check endpoints
- ✅ Metrics tracking
- ✅ Graceful shutdown
- ✅ Database layer for persistence
- ✅ Automated backups

### Deployment
- ✅ Docker and Docker Compose
- ✅ PM2 process management
- ✅ CI/CD with GitHub Actions
- ✅ Environment-based configuration

## Prerequisites

- Node.js 18+ (for non-Docker deployment)
- Docker and Docker Compose (for containerized deployment)
- PM2 (for process management)
- Git

## Deployment Options

### Option 1: Docker Compose (Recommended)

#### 1. Clone and Configure
```bash
git clone https://github.com/zaiby83/council-chamber.git
cd council-chamber

# Copy environment file
cp .env.example .env

# Edit .env with your values
nano .env
```

#### 2. Build and Run
```bash
docker-compose up -d
```

#### 3. Verify
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f

# Check health
curl http://localhost:3001/health
```

#### 4. Stop
```bash
docker-compose down
```

### Option 2: PM2 Process Manager

#### 1. Install Dependencies
```bash
# Server
cd server
npm install

# Install PM2 globally
npm install -g pm2

# Client
cd ../client
npm install
npm run build
```

#### 2. Configure Environment
```bash
cd ../server
cp .env.example .env
nano .env
```

#### 3. Start with PM2
```bash
npm run pm2:start

# View logs
npm run pm2:logs

# Monitor
pm2 monit

# Restart
npm run pm2:restart

# Stop
npm run pm2:stop
```

#### 4. Setup Auto-Start on Boot
```bash
pm2 startup
pm2 save
```

### Option 3: Manual Deployment

#### 1. Build Client
```bash
cd client
npm install
npm run build
```

#### 2. Copy Build to Server
```bash
cp -r build ../server/public
```

#### 3. Start Server
```bash
cd ../server
npm install
npm run prod
```

## Configuration

### Environment Variables

```bash
# Server
PORT=3001
NODE_ENV=production

# Shure SCM820
SHURE_IP=192.168.1.100
SHURE_PORT=2202

# Azure Speech
AZURE_SPEECH_KEY=your_key_here
AZURE_SPEECH_REGION=westus2

# Meeting Info
CITY_NAME=City of Fairfield
CHAMBER_NAME=Council Chamber

# Security
CORS_ORIGIN=https://yourdomain.com

# Logging
LOG_LEVEL=info
```

### PM2 Configuration

Edit `server/ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'council-chamber',
    script: './index-enhanced.js', // Use enhanced version
    instances: 1,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
    },
  }],
};
```

## Health Checks

### Endpoints

- `GET /health` - Simple health check
- `GET /health/detailed` - Detailed system info
- `GET /ready` - Readiness probe (Kubernetes)
- `GET /live` - Liveness probe (Kubernetes)

### Example
```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-04-10T12:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

## Monitoring

### Metrics Endpoint

```bash
curl http://localhost:3001/metrics
```

Response:
```json
{
  "timestamp": "2026-04-10T12:00:00.000Z",
  "uptime": 3600,
  "metrics": {
    "requests": {
      "total": 1234,
      "byEndpoint": {...},
      "byMethod": {...}
    },
    "websocket": {
      "connections": 5,
      "totalConnections": 100,
      "messages": {
        "sent": 5000,
        "received": 1000
      }
    },
    "transcription": {
      "sessions": 1,
      "totalSessions": 10,
      "entries": 500
    },
    "errors": {
      "total": 5,
      "byType": {...}
    }
  }
}
```

### Logging

Logs are written to:
- `server/logs/combined.log` - All logs
- `server/logs/error.log` - Error logs only
- Console (stdout/stderr)

View logs:
```bash
# PM2
pm2 logs council-chamber

# Docker
docker-compose logs -f

# Direct
tail -f server/logs/combined.log
```

## Security

### Rate Limiting

- API endpoints: 100 requests per 15 minutes per IP
- Token endpoint: 10 requests per minute per IP

### Headers

Helmet.js adds security headers:
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security (HTTPS)

### Input Validation

All user input is validated and sanitized:
- Channel numbers (1-8)
- Member names (max 100 chars)
- IP addresses
- Port numbers

### CORS

Configure allowed origins in `.env`:
```bash
CORS_ORIGIN=https://yourdomain.com
```

## Backup and Restore

### Manual Backup
```bash
cd server
npm run backup
```

Backups are stored in `server/data/backups/`

### Automated Backups

Add to crontab:
```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/council-chamber/server && npm run backup
```

### Restore
```bash
# Copy backup files to data directory
cp -r data/backups/2026-04-10T02-00-00/* data/
```

## Troubleshooting

### Server Won't Start

1. Check logs:
```bash
tail -f server/logs/error.log
```

2. Verify environment:
```bash
node -v  # Should be 18+
npm -v
```

3. Check ports:
```bash
lsof -i :3001
```

### High Memory Usage

1. Check metrics:
```bash
curl http://localhost:3001/health/detailed
```

2. Restart with PM2:
```bash
pm2 restart council-chamber
```

3. Adjust memory limit in `ecosystem.config.js`

### WebSocket Connection Issues

1. Check firewall:
```bash
sudo ufw status
sudo ufw allow 3001
```

2. Verify WebSocket upgrade:
```bash
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:3001
```

3. Check reverse proxy config (Nginx):
```nginx
location / {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

### Database Errors

1. Check permissions:
```bash
ls -la server/data
chmod 755 server/data
```

2. Verify disk space:
```bash
df -h
```

3. Check logs for specific errors

## Performance Tuning

### Node.js

```bash
# Increase memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

### PM2 Clustering

For high traffic, enable clustering:
```javascript
// ecosystem.config.js
{
  instances: 'max', // Use all CPU cores
  exec_mode: 'cluster',
}
```

### Nginx Caching

```nginx
location /api {
    proxy_cache api_cache;
    proxy_cache_valid 200 1m;
    proxy_pass http://localhost:3001;
}
```

## Monitoring Tools

### Recommended

- **PM2 Plus** - Process monitoring
- **Sentry** - Error tracking
- **Datadog** - APM and metrics
- **Prometheus + Grafana** - Metrics visualization

### Integration Example (Sentry)

```javascript
// server/index-enhanced.js
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

## Scaling

### Horizontal Scaling

1. Use load balancer (Nginx, HAProxy)
2. Enable PM2 clustering
3. Use Redis for session storage
4. Implement sticky sessions for WebSocket

### Vertical Scaling

1. Increase server resources
2. Optimize Node.js memory
3. Use faster storage (SSD)

## Maintenance

### Regular Tasks

- **Daily**: Check logs for errors
- **Weekly**: Review metrics
- **Monthly**: Update dependencies
- **Quarterly**: Security audit

### Updates

```bash
# Update dependencies
cd server && npm update
cd ../client && npm update

# Rebuild
cd ../client && npm run build

# Restart
pm2 restart council-chamber
```

### Security Updates

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Manual review
npm audit fix --force
```

## Support

For issues:
1. Check logs
2. Review metrics
3. Consult documentation
4. Open GitHub issue

## Checklist

- [ ] Environment variables configured
- [ ] SSL/TLS certificates installed
- [ ] Firewall rules configured
- [ ] Backup system tested
- [ ] Monitoring setup
- [ ] Health checks working
- [ ] Load testing completed
- [ ] Documentation reviewed
- [ ] Team trained
- [ ] Rollback plan ready

## Next Steps

1. Set up monitoring
2. Configure automated backups
3. Implement SSL/TLS
4. Set up CI/CD
5. Load test
6. Security audit
7. Documentation
8. Training

---

**Production Ready**: Yes
**Last Updated**: 2026-04-10
**Version**: 1.0.0
