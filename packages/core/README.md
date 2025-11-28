<div align="center">
  <img src="https://raw.githubusercontent.com/stratix-dev/stratix/main/public/logo-no-bg.png" alt="Stratix Logo" width="200"/>

# @stratix/core

**Core primitives and abstractions for the Stratix framework**

[![npm version](https://img.shields.io/npm/v/@stratix/core.svg)](https://www.npmjs.com/package/@stratix/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

[Documentation](https://stratix-dev.github.io/stratix/) | [Getting Started](https://stratix-dev.github.io/stratix/docs/getting-started/quick-start) 

</div>

> Part of **[Stratix Framework](https://stratix-dev.github.io/stratix/)** - A TypeScript framework for building scalable applications with Domain-Driven Design, Hexagonal Architecture, and CQRS patterns.
>
> **New to Stratix?** Start with the [Getting Started Guide](https://stratix-dev.github.io/stratix/docs/getting-started/quick-start)

## About This Package

`@stratix/core` is the foundational package of the Stratix framework, providing zero-dependency primitives and abstractions for Domain-Driven Design, CQRS, and AI agents.

**This package includes:**
- Domain primitives (Entity, AggregateRoot, ValueObject)
- CQRS interfaces (Command, Query, Event buses)
- AI Agent base classes and interfaces
- Result pattern for error handling
- Pre-built value objects (Money, Email, URL, etc.)
- Plugin and context system interfaces
- DX Helpers for productivity

## About Stratix

Stratix is an AI-first TypeScript framework combining Domain-Driven Design, Hexagonal Architecture, and CQRS. It provides production-ready patterns for building scalable, maintainable applications with AI agents as first-class citizens.

**Key Resources:**
- [Documentation](https://stratix-dev.github.io/stratix/)
- [Quick Start](https://stratix-dev.github.io/stratix/docs/getting-started/quick-start)
- [Report Issues](https://github.com/stratix-dev/stratix/issues)

## Installation

**Prerequisites:**
- Node.js 18.0.0 or higher
- TypeScript 5.0.0 or higher

**Recommended:** Create a new Stratix project
```bash
npm install -g @stratix/cli
stratix new my-app
```

**Manual installation:**
```bash
npm install @stratix/core
# or
pnpm add @stratix/core
# or
yarn add @stratix/core
```

## Related Packages

**Essential:**
- [`@stratix/runtime`](https://www.npmjs.com/package/@stratix/runtime) - Application runtime and plugin system
- [`@stratix/cli`](https://www.npmjs.com/package/@stratix/cli) - Code generation and scaffolding

**AI Providers:**
- [`@stratix/ai-openai`](https://www.npmjs.com/package/@stratix/ai-openai) - OpenAI LLM provider
- [`@stratix/ai-anthropic`](https://www.npmjs.com/package/@stratix/ai-anthropic) - Anthropic Claude provider

**Plugins:**
- [`@stratix/db-postgres`](https://www.npmjs.com/package/@stratix/db-postgres) - PostgreSQL integration
- [`@stratix/http-fastify`](https://www.npmjs.com/package/@stratix/http-fastify) - Fastify HTTP server
- [`@stratix/validation-zod`](https://www.npmjs.com/package/@stratix/validation-zod) - Schema validation

[View all plugins](https://stratix-dev.github.io/stratix/docs/plugins/official-plugins)

## Documentation

- [Getting Started](https://stratix-dev.github.io/stratix/docs/getting-started/quick-start) - Quick start guide
- [Core Concepts](https://stratix-dev.github.io/stratix/docs/core-concepts/architecture-overview) - Architecture and patterns
- [Domain Modeling](https://stratix-dev.github.io/stratix/docs/core-concepts/domain-modeling) - Entities, Value Objects, Aggregates
- [Result Pattern](https://stratix-dev.github.io/stratix/docs/core-concepts/result-pattern) - Type-safe error handling
- [CQRS](https://stratix-dev.github.io/stratix/docs/core-concepts/cqrs) - Commands, Queries, Events
- [DX Helpers](https://stratix-dev.github.io/stratix/docs/core-concepts/dx-helpers) - Productivity helpers
- [Complete Documentation](https://stratix-dev.github.io/stratix/)

## Support

- [GitHub Issues](https://github.com/stratix-dev/stratix/issues) - Report bugs and request features
- [Documentation](https://stratix-dev.github.io/stratix/) - Comprehensive guides and tutorials

## License

MIT - See [LICENSE](https://github.com/stratix-dev/stratix/blob/main/LICENSE) for details.

<div align="center">

**[Stratix Framework](https://stratix-dev.github.io/stratix/)** - Build better software with proven patterns

</div>
