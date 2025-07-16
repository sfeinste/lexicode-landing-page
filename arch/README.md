# Lexicode SaaS Architecture

## Overview

Lexicode is a cloud-native SaaS platform that automatically generates and maintains documentation for GitHub repositories using AI. The architecture is designed for scalability, reliability, and simplicity, leveraging AWS services and modern containerization technologies.

## Architecture Principles

- **Simplicity First**: Prefer simple, proven solutions over complex architectures
- **Cloud Native**: Leverage AWS managed services to reduce operational overhead
- **Scalability**: Design for horizontal scaling with minimal configuration
- **Security**: Implement security at every layer with zero-trust principles
- **Observability**: Comprehensive logging, monitoring, and alerting

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Query + Zustand
- **Authentication**: JWT with refresh tokens
- **Deployment**: AWS CloudFront + S3

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL 15 (AWS RDS)
- **Cache**: Redis (AWS ElastiCache)
- **Message Queue**: AWS SQS
- **File Storage**: AWS S3
- **Container**: Docker with ECS Fargate

### Infrastructure
- **Cloud Provider**: AWS
- **Infrastructure as Code**: Terraform
- **Container Orchestration**: ECS Fargate
- **Load Balancing**: Application Load Balancer
- **Service Discovery**: AWS Service Discovery
- **Monitoring**: CloudWatch + DataDog
- **Logging**: CloudWatch Logs + Structured JSON

### External Services
- **Authentication**: GitHub OAuth
- **Payments**: Stripe
- **AI/LLM**: OpenAI GPT-4 / Anthropic Claude
- **Email**: AWS SES
- **Error Tracking**: Sentry

## High-Level Architecture

The system follows a microservices architecture with the following core services:

1. **API Gateway Service** - Entry point for all API requests
2. **Authentication Service** - User management and GitHub OAuth
3. **Repository Service** - GitHub integration and repository management
4. **Documentation Service** - AI-powered documentation generation
5. **Billing Service** - Subscription and payment management
6. **Analytics Service** - Usage tracking and reporting
7. **Notification Service** - Email and webhook notifications

## Core Documentation Generation Engine

The heart of the platform is the AI-powered documentation generation system that:

- **Analyzes Code Context**: Builds comprehensive understanding of repository structure and dependencies
- **Multi-Provider LLM Integration**: Leverages OpenAI GPT-4, Anthropic Claude, and Azure OpenAI with intelligent failover
- **Intelligent Chunking**: Optimizes code context for LLM consumption within token limits
- **Quality Assurance**: Validates generated documentation for completeness and accuracy
- **Cost Optimization**: Balances quality, speed, and cost across different LLM providers
- **Real-time Progress**: Provides live updates during generation process
- **Error Recovery**: Robust fallback strategies for reliable documentation generation

See [documentation-generation.md](./documentation-generation.md) for detailed architecture.

## Data Flow

1. **User Authentication** → GitHub OAuth → JWT tokens
2. **Repository Connection** → GitHub API → Repository metadata stored
3. **Documentation Generation** → SQS queue → AI processing → S3 storage
4. **Real-time Updates** → WebSocket connections → Live dashboard updates
5. **Billing Events** → Stripe webhooks → Usage tracking → Invoice generation

## Security Architecture

- **Network Security**: VPC with private subnets, security groups, NACLs
- **Application Security**: JWT authentication, RBAC, input validation
- **Data Security**: Encryption at rest and in transit (TLS 1.3)
- **Secrets Management**: AWS Secrets Manager
- **API Security**: Rate limiting, CORS, CSRF protection
- **Compliance**: SOC 2 Type II, GDPR compliance

## Scalability Strategy

- **Horizontal Scaling**: ECS Auto Scaling based on CPU/memory metrics
- **Database Scaling**: RDS read replicas, connection pooling
- **Cache Strategy**: Redis for session data, API responses
- **CDN**: CloudFront for static assets and API caching
- **Queue Processing**: SQS with dead letter queues for reliability

## Monitoring & Observability

- **Application Metrics**: Custom CloudWatch metrics
- **Infrastructure Metrics**: ECS, RDS, ElastiCache metrics
- **Logging**: Structured JSON logs with correlation IDs
- **Alerting**: CloudWatch alarms + PagerDuty integration
- **Tracing**: AWS X-Ray for distributed tracing
- **Error Tracking**: Sentry for application errors

## Cost Optimization

- **Compute**: ECS Fargate with right-sizing
- **Storage**: S3 with lifecycle policies
- **Database**: RDS with scheduled scaling
- **Networking**: CloudFront caching to reduce data transfer
- **Monitoring**: Cost allocation tags for resource tracking

## Deployment Strategy

- **Blue-Green Deployment**: Zero-downtime deployments
- **Infrastructure**: Terraform with remote state
- **CI/CD**: GitHub Actions with AWS deployment
- **Environment Management**: Dev, Staging, Production
- **Database Migrations**: Automated with rollback capability

## Next Steps

1. Review and approve architecture design
2. Set up AWS account and initial Terraform configuration
3. Implement core services starting with authentication
4. Set up CI/CD pipeline and monitoring
5. Begin development of MVP features