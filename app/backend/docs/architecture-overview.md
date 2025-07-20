# Backend Architecture Overview

## Table of Contents
1. [Introduction](#introduction)
2. [Architecture Principles](#architecture-principles)
3. [Module Structure](#module-structure)
4. [Technology Stack](#technology-stack)
5. [Data Flow](#data-flow)
6. [Security Architecture](#security-architecture)

## Introduction

The backend is a Node.js/TypeScript application that provides API services for a SaaS platform that generates code documentation using LLMs. It integrates with GitHub to access repositories and uses AI services to create comprehensive documentation.

## Architecture Principles

- **Modular Design**: Clear separation of concerns with self-contained modules
- **Layered Architecture**: Controllers → Services → Data Access
- **Asynchronous Processing**: Queue-based job processing for long-running tasks
- **Security First**: Row-level security, encrypted tokens, audit logging
- **Scalability**: Stateless design with external queue and cache services

## Module Structure

```
src/
├── modules/          # Feature modules
│   ├── auth/        # Authentication & authorization
│   ├── billing/     # Subscription & payment processing
│   ├── documentation/ # Doc generation & management
│   └── repository/  # Repository access & management
├── services/        # Core business services
├── middleware/      # Express middleware
├── lib/            # External integrations
├── workers/        # Background job processors
└── shared/         # Shared utilities
```

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth + JWT
- **Queue**: RabbitMQ
- **Cache**: Redis
- **AI Services**: OpenAI API, Anthropic Claude
- **External APIs**: GitHub API, Stripe API

## Data Flow

### Documentation Generation Flow
1. User initiates documentation generation
2. Request validated and queued via RabbitMQ
3. Worker processes job asynchronously
4. GitHub API fetches repository files
5. Files analyzed and chunked intelligently
6. LLM generates documentation
7. Results stored in PostgreSQL
8. Progress updates sent via Redis

### Authentication Flow
1. User authenticates via email/password or GitHub OAuth
2. Supabase issues JWT tokens
3. Tokens validated on each request
4. User context attached to requests
5. Row-level security enforces data isolation

## Security Architecture

- **Authentication**: JWT-based with refresh tokens
- **Authorization**: Role-based access control (RBAC)
- **Data Isolation**: PostgreSQL RLS policies
- **Secrets Management**: Encrypted storage for sensitive data
- **Audit Trail**: Comprehensive logging of sensitive operations
- **Input Validation**: express-validator on all endpoints
- **Rate Limiting**: API and LLM request throttling