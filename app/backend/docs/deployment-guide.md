# Deployment Guide

## Prerequisites

- Node.js 18+ 
- PostgreSQL (via Supabase)
- RabbitMQ
- Redis
- GitHub App configured
- OpenAI API key

## Environment Variables

Create a `.env` file with the following variables:

```bash
# Server Configuration
NODE_ENV=production
PORT=3001

# Database (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Authentication
JWT_SECRET=your-jwt-secret

# GitHub OAuth (Legacy)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# GitHub App
GITHUB_APP_ID=your-app-id
GITHUB_APP_CLIENT_ID=your-app-client-id
GITHUB_APP_CLIENT_SECRET=your-app-client-secret
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your-webhook-secret

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Anthropic (Optional)
ANTHROPIC_API_KEY=your-anthropic-api-key

# Queue (RabbitMQ)
RABBITMQ_URL=amqp://user:password@localhost:5672

# Cache (Redis)
REDIS_URL=redis://localhost:6379

# Frontend URL
FRONTEND_URL=https://app.lexicode.app

# Stripe (When implemented)
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key
```

## Database Setup

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create new project
   - Note the project URL and keys

2. **Run Migrations**
   ```bash
   # Apply migrations in order
   psql $DATABASE_URL < migrations/001_github_integration.sql
   psql $DATABASE_URL < migrations/002_documentation_tables.sql
   psql $DATABASE_URL < migrations/003_documentation_files_table.sql
   ```

3. **Verify RLS Policies**
   - Ensure all tables have RLS enabled
   - Check policies are correctly configured

## GitHub App Setup

1. **Create GitHub App**
   - Go to GitHub Settings > Developer settings > GitHub Apps
   - Create new GitHub App with:
     - Webhook URL: `https://api.yourdomain.com/api/v1/auth/github-app/webhook`
     - Webhook secret: Generate secure random string
     - Permissions:
       - Repository contents: Read
       - Repository metadata: Read
       - Pull requests: Read (optional)
     - Events:
       - Installation
       - Push
       - Pull request

2. **Generate Private Key**
   - Download private key from GitHub App settings
   - Convert to single-line format for env variable

3. **Configure OAuth**
   - Enable "Request user authorization (OAuth) during installation"
   - Set callback URL: `https://app.yourdomain.com/auth/github/callback`

## Service Dependencies

### RabbitMQ Setup
```bash
# Using Docker
docker run -d \
  --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=password \
  rabbitmq:3-management
```

### Redis Setup
```bash
# Using Docker
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:alpine
```

## Build and Deploy

### Local Build
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Start production server
npm run start
```

### Docker Deployment
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy built files
COPY dist ./dist
COPY migrations ./migrations

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "dist/server.js"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - redis
      - rabbitmq

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: password

  worker:
    build: .
    command: ["node", "dist/workers/documentationWorker.js"]
    env_file:
      - .env
    depends_on:
      - redis
      - rabbitmq
```

## Production Checklist

### Security
- [ ] All environment variables set
- [ ] HTTPS enabled with valid certificate
- [ ] CORS configured for frontend domain only
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection protection (using parameterized queries)
- [ ] XSS protection headers set

### Performance
- [ ] Database indexes created
- [ ] Redis caching configured
- [ ] Connection pooling enabled
- [ ] Gzip compression enabled
- [ ] Static assets served via CDN

### Monitoring
- [ ] Error logging to file/service
- [ ] APM tool configured (e.g., New Relic, DataDog)
- [ ] Health check endpoint active
- [ ] Uptime monitoring configured
- [ ] Database query performance monitoring

### Backup
- [ ] Database automated backups
- [ ] Backup restoration tested
- [ ] Disaster recovery plan documented

## Scaling Considerations

### Horizontal Scaling
- API servers are stateless, can scale horizontally
- Use load balancer (nginx, HAProxy, AWS ALB)
- Session data stored in Redis
- Queue workers can be scaled independently

### Database Scaling
- Use Supabase connection pooling
- Consider read replicas for heavy read loads
- Implement query result caching

### Queue Scaling
- RabbitMQ supports clustering
- Separate queues for different priority jobs
- Monitor queue depth and consumer lag

## Troubleshooting

### Common Issues

1. **GitHub App Installation Fails**
   - Verify webhook URL is accessible
   - Check webhook secret matches
   - Ensure private key is correctly formatted

2. **Documentation Generation Timeout**
   - Increase worker timeout settings
   - Check OpenAI API rate limits
   - Monitor queue consumer health

3. **Database Connection Issues**
   - Verify Supabase URL and keys
   - Check connection pool settings
   - Monitor connection count

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run start

# Test specific services
npm run test:services
npm run test:integration
```

### Health Checks
```bash
# API health
curl https://api.yourdomain.com/health

# Queue health
curl http://localhost:15672/api/overview

# Redis health
redis-cli ping
```