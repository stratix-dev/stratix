<div align="center">
  <img src="https://raw.githubusercontent.com/stratix-dev/stratix/main/public/logo-no-bg.png" alt="Stratix Logo" width="200"/>

# Stratix

**Build scalable, maintainable applications with Domain-Driven Design, hexagonal architecture, and CQRS.**

Production-ready from day one with type safety, dependency injection, AI agents as first-class citizens, and enterprise patterns.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Version](https://img.shields.io/badge/version-0.7.3-orange.svg)](https://github.com/stratix-dev/stratix)

[Documentation](https://stratix-dev.github.io/stratix/) | [Getting Started](https://stratix-dev.github.io/stratix)

</div>

> **Pre-release Notice**: Stratix is in active development. The API may change until version 1.0.0.

## Features

- **Plugin Architecture** - Extensible plugin system with lifecycle management and health checks
- **Context System** - Portable domain contexts that work in monoliths or microservices
- **Domain Modeling** - Entity, AggregateRoot, ValueObject, and Repository patterns built-in
- **Result Pattern** - Explicit error handling without exceptions
- **CQRS** - Command and Query Responsibility Segregation with dedicated buses
- **AI Agents** - AI agents as first-class domain entities with production patterns
- **Type Safety** - Full TypeScript strict mode with phantom types
- **Production Extensions** - HTTP, validation, authentication, error handling
- **Code Generation** - CLI for scaffolding projects, contexts, entities, commands, and queries

## Quick Start

```bash
# 1. Create project with HTTP
npm install -g @stratix/cli
stratix new my-app --with http

# 2. Generate context with HTTP routes
cd my-app
stratix generate context Product --props "name:string,price:number,stock:number" --with-http

# 3. Run
npm run dev
```

**What you get:**

- Complete TypeScript project with strict mode
- ESLint and Prettier configured
- Domain, Application, and Infrastructure layers
- CQRS commands and queries with handlers
- Repository pattern with in-memory implementation
- **HTTP routes (POST, GET, GET/:id)** - automatically generated
- Type-safe entity IDs and Result pattern
- Production-ready project structure

**All in 3 commands and ~2 minutes!**

## Available Packages

### Core Packages
- [**@stratix/core**](https://www.npmjs.com/package/@stratix/core) - Domain primitives, abstractions, and default implementations (zero dependencies)
- [**@stratix/runtime**](https://www.npmjs.com/package/@stratix/runtime) - Application builder, plugin registry, lifecycle management, and in-memory implementations

### Plugins 🔌
*Manage external resources with lifecycle (initialize → start → stop)*

#### Database Plugins
- [**@stratix/db-postgres**](https://www.npmjs.com/package/@stratix/db-postgres) - PostgreSQL integration with repository patterns
- [**@stratix/db-mongodb**](https://www.npmjs.com/package/@stratix/db-mongodb) - MongoDB integration with aggregations and pagination
- [**@stratix/db-redis**](https://www.npmjs.com/package/@stratix/db-redis) - Redis caching, rate limiting, and distributed locks

#### HTTP Plugins
- [**@stratix/http-fastify**](https://www.npmjs.com/package/@stratix/http-fastify) - Fastify HTTP server integration
- [**@stratix/http-client**](https://www.npmjs.com/package/@stratix/http-client) - Type-safe HTTP client with Axios, retries, and circuit breaker

#### Messaging & Observability
- [**@stratix/msg-rabbitmq**](https://www.npmjs.com/package/@stratix/msg-rabbitmq) - RabbitMQ message broker with RPC and priority queues
- [**@stratix/obs-opentelemetry**](https://www.npmjs.com/package/@stratix/obs-opentelemetry) - OpenTelemetry observability integration

#### Security Plugins
- [**@stratix/auth**](https://www.npmjs.com/package/@stratix/auth) - JWT authentication and RBAC authorization

### Providers 🔧
*Implement core interfaces (AI, DI, Validation)*

#### AI Providers
- [**@stratix/ai-openai**](https://www.npmjs.com/package/@stratix/ai-openai) - OpenAI LLM provider for AI agents
- [**@stratix/ai-anthropic**](https://www.npmjs.com/package/@stratix/ai-anthropic) - Anthropic Claude provider for AI agents

#### Dependency Injection Providers
- [**@stratix/di-awilix**](https://www.npmjs.com/package/@stratix/di-awilix) - Awilix dependency injection container

#### Validation Providers
- [**@stratix/validation-zod**](https://www.npmjs.com/package/@stratix/validation-zod) - Zod-based schema validation

### Libraries 📚
*Pure utility functions and classes (zero external dependencies)*

- [**@stratix/mappers**](https://www.npmjs.com/package/@stratix/mappers) - Entity-to-DTO mapping utilities

### Development Tools
- [**@stratix/cli**](https://www.npmjs.com/package/@stratix/cli) - Code generation and project scaffolding
- [**@stratix/testing**](https://www.npmjs.com/package/@stratix/testing) - Testing utilities and mocks

### VS Code Extension
- [**stratix-copilot**](https://marketplace.visualstudio.com/items?itemName=stratix.stratix-copilot-rag) - GitHub Copilot extension with Stratix framework knowledge

## Documentation

Complete documentation is available at [stratix-dev.github.io/stratix](https://stratix-dev.github.io/stratix/)

## Contributing

Contributions are welcome!

## License

MIT License - see [LICENSE](./LICENSE) file for details.
