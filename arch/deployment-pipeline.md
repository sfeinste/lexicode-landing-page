# Deployment and CI/CD Pipeline Architecture

## Overview

The Lexicode SaaS platform uses a modern CI/CD pipeline with GitHub Actions for automated testing, building, and deployment. The pipeline supports multiple environments and follows GitOps principles with Infrastructure as Code (IaC) using Terraform.

## Pipeline Architecture

```mermaid
graph TB
    %% Source Control
    subgraph "Source Control"
        DEV[Developer]
        GITHUB[GitHub Repository]
        BRANCHES[Branches:<br/>main, develop, feature/*]
    end
    
    %% CI/CD Pipeline
    subgraph "GitHub Actions"
        TRIGGER[Workflow Triggers]
        VALIDATE[Code Validation]
        BUILD[Build & Test]
        SECURITY[Security Scanning]
        DOCKER[Docker Build]
        DEPLOY[Deploy to Environments]
    end
    
    %% Artifact Storage
    subgraph "Artifact Storage"
        ECR[AWS ECR<br/>Container Registry]
        TERRAFORM_STATE[Terraform State<br/>S3 + DynamoDB]
    end
    
    %% Environments
    subgraph "Development"
        DEV_ECS[ECS Service]
        DEV_RDS[RDS Database]
        DEV_MONITORING[CloudWatch]
    end
    
    subgraph "Staging"
        STAGING_ECS[ECS Service]
        STAGING_RDS[RDS Database]
        STAGING_MONITORING[CloudWatch]
    end
    
    subgraph "Production"
        PROD_ECS[ECS Service]
        PROD_RDS[RDS Database]
        PROD_MONITORING[CloudWatch]
    end
    
    %% Monitoring and Alerting
    subgraph "Monitoring"
        DATADOG[DataDog]
        SENTRY[Sentry]
        SLACK[Slack Notifications]
    end
    
    %% Flow
    DEV --> GITHUB
    GITHUB --> BRANCHES
    BRANCHES --> TRIGGER
    TRIGGER --> VALIDATE
    VALIDATE --> BUILD
    BUILD --> SECURITY
    SECURITY --> DOCKER
    DOCKER --> ECR
    DOCKER --> DEPLOY
    
    DEPLOY --> DEV_ECS
    DEPLOY --> STAGING_ECS
    DEPLOY --> PROD_ECS
    
    TERRAFORM_STATE --> DEV_RDS
    TERRAFORM_STATE --> STAGING_RDS
    TERRAFORM_STATE --> PROD_RDS
    
    DEV_MONITORING --> DATADOG
    STAGING_MONITORING --> DATADOG
    PROD_MONITORING --> DATADOG
    
    PROD_ECS --> SENTRY
    DATADOG --> SLACK
    SENTRY --> SLACK
    
    %% Styling
    classDef source fill:#e1f5fe
    classDef pipeline fill:#f3e5f5
    classDef storage fill:#e8f5e8
    classDef environment fill:#fff3e0
    classDef monitoring fill:#fce4ec
    
    class DEV,GITHUB,BRANCHES source
    class TRIGGER,VALIDATE,BUILD,SECURITY,DOCKER,DEPLOY pipeline
    class ECR,TERRAFORM_STATE storage
    class DEV_ECS,DEV_RDS,STAGING_ECS,STAGING_RDS,PROD_ECS,PROD_RDS environment
    class DEV_MONITORING,STAGING_MONITORING,PROD_MONITORING,DATADOG,SENTRY,SLACK monitoring
```

## CI/CD Workflow Configuration

### Main Workflow (`.github/workflows/main.yml`)

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: lexicode-api
  ECS_SERVICE: lexicode-api-service
  ECS_CLUSTER: lexicode-cluster

jobs:
  validate:
    name: Code Validation
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run type checking
        run: npm run type-check

      - name: Run formatting check
        run: npm run format:check

  test:
    name: Test Suite
    runs-on: ubuntu-latest
    needs: validate
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: lexicode_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        run: npm run migrate:test
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/lexicode_test

      - name: Run unit tests
        run: npm run test:unit
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/lexicode_test
          REDIS_URL: redis://localhost:6379

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/lexicode_test
          REDIS_URL: redis://localhost:6379

      - name: Generate test coverage
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella

  security:
    name: Security Scanning
    runs-on: ubuntu-latest
    needs: validate
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run security audit
        run: npm audit --audit-level=high

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      - name: Run CodeQL Analysis
        uses: github/codeql-action/analyze@v2
        with:
          languages: javascript

  build:
    name: Build and Push Docker Image
    runs-on: ubuntu-latest
    needs: [test, security]
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'
    
    outputs:
      image: ${{ steps.image.outputs.image }}
      tag: ${{ steps.image.outputs.tag }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image to Amazon ECR
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          # Build a docker container and push it to ECR
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Set image output
        id: image
        run: |
          echo "image=${{ steps.build-image.outputs.image }}" >> $GITHUB_OUTPUT
          echo "tag=${{ github.sha }}" >> $GITHUB_OUTPUT

  deploy-dev:
    name: Deploy to Development
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment: development
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster ${{ env.ECS_CLUSTER }}-dev \
            --service ${{ env.ECS_SERVICE }}-dev \
            --force-new-deployment \
            --task-definition ${{ env.ECS_SERVICE }}-dev

      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster ${{ env.ECS_CLUSTER }}-dev \
            --services ${{ env.ECS_SERVICE }}-dev

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: staging
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster ${{ env.ECS_CLUSTER }}-staging \
            --service ${{ env.ECS_SERVICE }}-staging \
            --force-new-deployment \
            --task-definition ${{ env.ECS_SERVICE }}-staging

      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster ${{ env.ECS_CLUSTER }}-staging \
            --services ${{ env.ECS_SERVICE }}-staging

      - name: Run smoke tests
        run: |
          npm run test:smoke -- --base-url=https://api-staging.lexicode.com

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Deploy to ECS (Blue-Green)
        run: |
          # Update task definition with new image
          aws ecs update-service \
            --cluster ${{ env.ECS_CLUSTER }}-prod \
            --service ${{ env.ECS_SERVICE }}-prod \
            --force-new-deployment \
            --task-definition ${{ env.ECS_SERVICE }}-prod

      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster ${{ env.ECS_CLUSTER }}-prod \
            --services ${{ env.ECS_SERVICE }}-prod

      - name: Run post-deployment tests
        run: |
          npm run test:smoke -- --base-url=https://api.lexicode.com

      - name: Create GitHub release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: v${{ github.run_number }}
          release_name: Release v${{ github.run_number }}
          body: |
            Automated release from commit ${{ github.sha }}
            
            Changes:
            ${{ github.event.head_commit.message }}
          draft: false
          prerelease: false

  notify:
    name: Notify Deployment Status
    runs-on: ubuntu-latest
    needs: [deploy-production]
    if: always()
    
    steps:
      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

## Infrastructure as Code (Terraform)

### Terraform Workflow (`.github/workflows/terraform.yml`)

```yaml
name: Terraform Infrastructure

on:
  push:
    branches: [main]
    paths: ['terraform/**']
  pull_request:
    branches: [main]
    paths: ['terraform/**']

env:
  TF_VERSION: 1.5.0
  AWS_REGION: us-east-1

jobs:
  terraform:
    name: Terraform Plan and Apply
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: ${{ env.TF_VERSION }}

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Terraform Init
        run: terraform init
        working-directory: terraform

      - name: Terraform Format Check
        run: terraform fmt -check
        working-directory: terraform

      - name: Terraform Validate
        run: terraform validate
        working-directory: terraform

      - name: Terraform Plan
        run: terraform plan -out=tfplan
        working-directory: terraform
        env:
          TF_VAR_environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        run: terraform apply tfplan
        working-directory: terraform
```

## Docker Configuration

### Multi-stage Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./

# Install security updates
RUN apk --no-cache -U upgrade

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
```

### Docker Compose for Local Development

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgres://postgres:postgres@postgres:5432/lexicode_dev
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./src:/app/src
      - ./logs:/app/logs

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=lexicode_dev
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - api

volumes:
  postgres_data:
  redis_data:
```

## Environment Management

### Environment Configuration

```yaml
# .github/environments/development.yml
name: development
protection_rules:
  - required_reviewers: 0
  - restrict_pushes: false
deployment_branch_policy:
  protected_branches: false
  custom_branch_policies: true
environment_variables:
  NODE_ENV: development
  LOG_LEVEL: debug
secrets:
  DATABASE_URL: ${{ secrets.DEV_DATABASE_URL }}
  REDIS_URL: ${{ secrets.DEV_REDIS_URL }}
```

```yaml
# .github/environments/staging.yml
name: staging
protection_rules:
  - required_reviewers: 1
  - restrict_pushes: true
deployment_branch_policy:
  protected_branches: true
  custom_branch_policies: false
environment_variables:
  NODE_ENV: staging
  LOG_LEVEL: info
secrets:
  DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
  REDIS_URL: ${{ secrets.STAGING_REDIS_URL }}
```

```yaml
# .github/environments/production.yml
name: production
protection_rules:
  - required_reviewers: 2
  - restrict_pushes: true
  - wait_timer: 300
deployment_branch_policy:
  protected_branches: true
  custom_branch_policies: false
environment_variables:
  NODE_ENV: production
  LOG_LEVEL: error
secrets:
  DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
  REDIS_URL: ${{ secrets.PROD_REDIS_URL }}
```

## Database Migration Strategy

### Migration Workflow

```yaml
# .github/workflows/migrate.yml
name: Database Migration

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to migrate'
        required: true
        type: choice
        options:
          - development
          - staging
          - production
      migration_type:
        description: 'Migration type'
        required: true
        type: choice
        options:
          - up
          - down
          - rollback

jobs:
  migrate:
    name: Run Database Migration
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: |
          case "${{ github.event.inputs.migration_type }}" in
            "up")
              npm run migrate:up
              ;;
            "down")
              npm run migrate:down
              ;;
            "rollback")
              npm run migrate:rollback
              ;;
          esac
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Verify migration
        run: npm run migrate:status
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Blue-Green Deployment Strategy

### ECS Blue-Green Deployment

```bash
#!/bin/bash
# scripts/deploy-blue-green.sh

set -e

CLUSTER_NAME=$1
SERVICE_NAME=$2
IMAGE_URI=$3

echo "Starting blue-green deployment for $SERVICE_NAME"

# Get current task definition
TASK_DEFINITION=$(aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --query 'services[0].taskDefinition' \
  --output text)

# Create new task definition with new image
NEW_TASK_DEFINITION=$(aws ecs describe-task-definition \
  --task-definition $TASK_DEFINITION \
  --query 'taskDefinition' \
  --output json | \
  jq --arg IMAGE_URI "$IMAGE_URI" \
  '.containerDefinitions[0].image = $IMAGE_URI' | \
  jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .placementConstraints, .compatibilities, .registeredAt, .registeredBy)')

# Register new task definition
NEW_TASK_DEF_ARN=$(echo $NEW_TASK_DEFINITION | \
  aws ecs register-task-definition \
  --cli-input-json file:///dev/stdin \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "New task definition: $NEW_TASK_DEF_ARN"

# Update service with new task definition
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --task-definition $NEW_TASK_DEF_ARN

echo "Waiting for deployment to complete..."

# Wait for deployment to complete
aws ecs wait services-stable \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME

echo "Deployment completed successfully"

# Run health checks
echo "Running health checks..."
sleep 30

# Check service health
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  https://api.lexicode.com/health)

if [ "$HEALTH_STATUS" -eq 200 ]; then
  echo "Health check passed"
else
  echo "Health check failed, rolling back..."
  # Rollback logic here
  exit 1
fi
```

## Monitoring and Alerting

### Deployment Monitoring

```yaml
# .github/workflows/monitor-deployment.yml
name: Post-Deployment Monitoring

on:
  deployment_status:

jobs:
  monitor:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    
    steps:
      - name: Wait for warmup
        run: sleep 60

      - name: Check application health
        run: |
          for i in {1..10}; do
            if curl -f ${{ github.event.deployment.payload.web_url }}/health; then
              echo "Health check passed"
              exit 0
            fi
            echo "Health check failed, retrying..."
            sleep 30
          done
          echo "Health check failed after 10 attempts"
          exit 1

      - name: Create DataDog event
        uses: masci/datadog@v1
        with:
          api-key: ${{ secrets.DATADOG_API_KEY }}
          events: |
            - title: "Deployment completed"
              text: "Successfully deployed to ${{ github.event.deployment.environment }}"
              alert_type: "success"
              source_type_name: "github"
              tags:
                - environment:${{ github.event.deployment.environment }}
                - service:lexicode-api
```

## Rollback Strategy

### Automated Rollback

```bash
#!/bin/bash
# scripts/rollback.sh

set -e

CLUSTER_NAME=$1
SERVICE_NAME=$2
TARGET_REVISION=${3:-"previous"}

echo "Rolling back $SERVICE_NAME to $TARGET_REVISION"

# Get current service configuration
CURRENT_SERVICE=$(aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --query 'services[0]')

# Get task definition family
TASK_DEFINITION_FAMILY=$(echo $CURRENT_SERVICE | \
  jq -r '.taskDefinition' | \
  cut -d: -f6 | \
  cut -d/ -f2)

# Get target revision
if [ "$TARGET_REVISION" == "previous" ]; then
  CURRENT_REVISION=$(aws ecs describe-task-definition \
    --task-definition $TASK_DEFINITION_FAMILY \
    --query 'taskDefinition.revision')
  TARGET_REVISION=$((CURRENT_REVISION - 1))
fi

TARGET_TASK_DEFINITION="${TASK_DEFINITION_FAMILY}:${TARGET_REVISION}"

echo "Rolling back to task definition: $TARGET_TASK_DEFINITION"

# Update service
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --task-definition $TARGET_TASK_DEFINITION

# Wait for rollback to complete
aws ecs wait services-stable \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME

echo "Rollback completed successfully"
```

## Performance and Optimization

### Build Optimization

```json
{
  "scripts": {
    "build": "npm run build:clean && npm run build:compile",
    "build:clean": "rm -rf dist",
    "build:compile": "tsc --build --verbose",
    "build:docker": "docker build --build-arg NODE_ENV=production -t lexicode-api .",
    "build:analyze": "npm run build && bundlesize"
  },
  "bundlesize": [
    {
      "path": "./dist/**/*.js",
      "maxSize": "500kb",
      "compression": "gzip"
    }
  ]
}
```

### Cache Strategy

```yaml
# Cache strategy in GitHub Actions
- name: Cache Node.js modules
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-

- name: Cache Docker layers
  uses: actions/cache@v3
  with:
    path: /tmp/.buildx-cache
    key: ${{ runner.os }}-buildx-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-buildx-
```

This comprehensive deployment and CI/CD pipeline architecture ensures reliable, automated deployments with proper testing, security scanning, and monitoring at every stage.