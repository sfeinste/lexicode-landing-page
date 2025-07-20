# Backend Documentation

This directory contains technical documentation for the Lexicode backend system.

## Available Documentation

- [Architecture Overview](./architecture-overview.md) - High-level system architecture
- [API Reference](./api-reference.md) - Complete API documentation
- [Auth Module](./auth-module.md) - Authentication & authorization details
- [Database Architecture](./database-architecture.md) - Database schema and design
- [Deployment Guide](./deployment-guide.md) - Deployment instructions
- [Documentation Module](./documentation-module.md) - Documentation generation system
- [Services Architecture](./services-architecture.md) - Core services documentation
- [Documentation Generation Flow](./documentation-generation-flow.md) - Request flow and queueing patterns

## Generating Diagrams

To generate PNG versions of Mermaid diagrams in the documentation:

```bash
# Generate diagrams for documentation-generation-flow.md
npm run docs:generate-diagrams

# Generate diagrams for all markdown files containing mermaid blocks
npm run docs:generate-all-diagrams
```

## Generated Diagram Files

After running the diagram generation scripts, you'll find:
- `documentation-generation-flow-1.png` - Architecture flow diagram
- `documentation-generation-flow-2.png` - Sequence diagram

These PNG files can be used in external documentation, presentations, or anywhere Mermaid rendering isn't available.