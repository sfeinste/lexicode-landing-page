# Frontend Architecture Overview

## Application Purpose

Lexicode is a SaaS application that connects to users' GitHub accounts, analyzes their repositories, and generates AI-powered code documentation. The frontend provides an intuitive interface for:

- User authentication and account management
- GitHub repository connection and management
- Documentation generation and viewing
- Subscription and billing management

## Technology Stack

### Core Technologies
- **React 18**: UI library for building component-based interfaces
- **TypeScript**: Type-safe JavaScript for better developer experience
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **Zustand**: Lightweight state management solution

### Additional Libraries
- **React Router v6**: Client-side routing
- **Axios**: HTTP client with interceptor support
- **Lucide React**: Modern icon library
- **React Markdown**: Markdown rendering
- **React Syntax Highlighter**: Code syntax highlighting

## Architecture Principles

### 1. **Component-Based Architecture**
- Small, focused components with single responsibilities
- Composition over inheritance
- Props-based communication
- TypeScript interfaces for all component props

### 2. **Service-Oriented API Layer**
- Centralized API configuration
- Domain-specific service modules
- Consistent error handling
- Automatic authentication token management

### 3. **Type-First Development**
- Comprehensive TypeScript types for all data structures
- Strong typing for API responses
- Type-safe state management
- Interface-driven development

### 4. **State Management Strategy**
- Zustand for global application state
- Local component state for UI-specific data
- Custom hooks for complex state logic
- Persistent storage for critical data

## Directory Structure

```
app/frontend/
├── src/
│   ├── api/              # API configuration
│   ├── components/       # Reusable UI components
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Route-based page components
│   ├── services/        # API service modules
│   ├── store/           # Zustand state stores
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── App.tsx          # Main app component with routing
│   └── main.tsx         # Application entry point
├── public/              # Static assets
└── docs/               # Architecture documentation
```

## Key Architectural Patterns

### 1. **Authentication Flow**
- JWT-based authentication with refresh tokens
- Automatic token renewal on API calls
- Persistent authentication state
- Protected route components

### 2. **GitHub Integration**
- OAuth-based GitHub App authentication
- Repository access management
- Webhook integration for updates
- Asynchronous documentation generation

### 3. **Documentation System**
- File-based documentation structure
- Real-time generation progress tracking
- Markdown rendering with syntax highlighting
- Hierarchical file tree navigation

### 4. **Error Handling**
- Centralized error handling in API layer
- User-friendly error messages
- Automatic retry for failed requests
- Loading states for all async operations

## Design Decisions

### Why Zustand?
- Minimal boilerplate compared to Redux
- Built-in TypeScript support
- Simple API that's easy to learn
- Efficient re-renders with built-in selectors
- Middleware support for persistence

### Why Vite?
- Lightning-fast development server
- Optimized production builds
- Native ESM support
- Built-in TypeScript support
- Excellent developer experience

### Why Tailwind CSS?
- Rapid UI development
- Consistent design system
- Small production bundle size
- Responsive design utilities
- Component-friendly utility classes

## Security Considerations

- Secure token storage using Zustand persist
- HTTPS-only API communication
- GitHub App permissions scoping
- Input validation on all forms
- XSS protection in markdown rendering

## Performance Optimizations

- Code splitting by route
- Lazy loading of heavy components
- Efficient re-renders with Zustand
- Optimized bundle size with Vite
- Skeleton UI for loading states

## Future Considerations

- Implement React Query for server state management
- Add comprehensive error boundaries
- Implement service worker for offline support
- Add E2E testing with Playwright
- Consider Server-Side Rendering (SSR) for SEO