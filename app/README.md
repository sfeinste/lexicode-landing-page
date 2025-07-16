# Lexicode SaaS Application

AI-powered documentation generation platform built with React and Express.

## Architecture

This is a **monolithic application** with clear module boundaries that align with our architecture documentation. The structure is designed to be easily split into microservices in the future if needed.

### Backend Structure
```
backend/
├── src/
│   ├── modules/           # Feature modules (auth, repository, documentation, billing)
│   │   ├── auth/         # Authentication & user management
│   │   ├── repository/   # GitHub repository integration
│   │   ├── documentation/# AI-powered documentation generation
│   │   ├── billing/      # Subscription & payment management
│   │   └── analytics/    # Usage tracking & analytics
│   ├── shared/           # Shared utilities and services
│   ├── middleware/       # Express middleware
│   ├── config/          # Configuration management
│   └── routes/          # Route definitions
```

### Frontend Structure
```
frontend/
├── src/
│   ├── components/       # Reusable UI components
│   ├── pages/           # Page components
│   ├── hooks/           # Custom React hooks
│   ├── store/           # Zustand state management
│   ├── api/             # API client functions
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### Local Development

1. **Clone and setup environment:**
   ```bash
   cd app
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   # Edit the .env files with your configuration
   ```

2. **Start services with Docker (recommended):**
   ```bash
   docker-compose up -d postgres redis
   ```

3. **Start backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

4. **Start frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Using Docker Compose

Start all services:
```bash
docker-compose up -d
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## API Documentation

The backend provides a RESTful API with the following main endpoints:

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/logout` - User logout

### Repositories
- `GET /api/v1/repositories` - List user repositories
- `POST /api/v1/repositories/sync` - Sync GitHub repositories
- `GET /api/v1/repositories/:id` - Get repository details

### Documentation
- `POST /api/v1/documentation/generate` - Generate documentation
- `GET /api/v1/documentation/projects` - List documentation projects
- `GET /api/v1/documentation/projects/:id` - Get project details

### Billing
- `GET /api/v1/billing/subscriptions` - List subscriptions
- `POST /api/v1/billing/subscriptions` - Create subscription
- `GET /api/v1/billing/usage` - Get usage metrics

## Development Scripts

### Backend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run lint         # Run linting
npm run type-check   # Run TypeScript checks
```

### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
npm run lint         # Run linting
npm run type-check   # Run TypeScript checks
```

## Features Status

### ✅ Completed
- Basic application structure
- Module boundaries aligned with architecture
- Authentication module skeleton
- Repository management module skeleton
- Documentation generation module skeleton
- Billing module skeleton
- React frontend with routing
- User interface components
- Basic state management

### 🚧 In Progress
- Database schema implementation
- Shared types and interfaces
- API client integration

### 📋 TODO
- User authentication logic
- GitHub OAuth integration
- Repository synchronization
- AI-powered documentation generation
- Stripe billing integration
- Real-time progress tracking
- Testing suite
- Production deployment configuration

## Contributing

1. Follow the existing code structure and patterns
2. Each module should be self-contained with its own controllers, services, and routes
3. Use TypeScript for type safety
4. Follow the established naming conventions
5. Write tests for new features
6. Update documentation as needed

## Module Boundaries

The application is structured with clear module boundaries:

- **Authentication**: User management, JWT tokens, GitHub OAuth
- **Repository**: GitHub integration, repository synchronization
- **Documentation**: AI-powered documentation generation and management
- **Billing**: Subscription management, usage tracking, Stripe integration
- **Analytics**: Usage metrics, reporting, insights

Each module is designed to be loosely coupled and could be extracted into separate microservices in the future if needed.

## Architecture Alignment

This implementation follows the architecture documented in the `/arch` directory:

- **Monolithic structure** with clear module boundaries
- **Express.js backend** with TypeScript
- **React frontend** with modern tooling
- **PostgreSQL database** with Redis caching
- **JWT authentication** with GitHub OAuth
- **Modular design** ready for future microservices migration

The code structure serves as a foundation for implementing the business logic outlined in the architecture documentation and user stories.