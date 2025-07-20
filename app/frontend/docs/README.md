# Frontend Architecture Documentation

This directory contains comprehensive documentation for the Lexicode frontend application architecture.

## Overview

The Lexicode frontend is a modern React application built with TypeScript, Vite, and Tailwind CSS. It provides a user interface for connecting GitHub repositories and generating AI-powered code documentation.

## Documentation Structure

- [Architecture Overview](./architecture-overview.md) - High-level architecture and design decisions
- [Component Architecture](./component-architecture.md) - Detailed component structure and relationships
- [API Layer](./api-layer.md) - API services and communication patterns
- [Routing & Pages](./routing-pages.md) - Application routes and page components
- [State Management](./state-management.md) - Zustand stores and state flow
- [Type System](./type-system.md) - TypeScript interfaces and type definitions

## Quick Links

- **Main Technologies**: React 18, TypeScript, Vite, Tailwind CSS, Zustand
- **UI Components**: Custom components with Lucide React icons
- **State Management**: Zustand with persistence
- **API Communication**: Axios with interceptors
- **Authentication**: JWT-based with refresh tokens
- **GitHub Integration**: GitHub App OAuth flow

## Getting Started

For developers new to the codebase:

1. Start with the [Architecture Overview](./architecture-overview.md) to understand the high-level structure
2. Review the [Component Architecture](./component-architecture.md) to understand UI composition
3. Study the [API Layer](./api-layer.md) to understand backend communication
4. Examine [State Management](./state-management.md) for data flow patterns