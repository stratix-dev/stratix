<div align="center">
  <img src="https://raw.githubusercontent.com/stratix-dev/stratix/main/public/logo-no-bg.png" alt="Stratix Logo" width="200"/>

# @stratix/runtime

**Application runtime and plugin lifecycle management for Stratix**

[![npm version](https://img.shields.io/npm/v/@stratix/runtime.svg)](https://www.npmjs.com/package/@stratix/runtime)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

[Documentation](https://stratix-dev.github.io/stratix/) | [Getting Started](https://stratix-dev.github.io/stratix/docs/getting-started/quick-start) 

</div>

-

> Part of **[Stratix Framework](https://stratix-dev.github.io/stratix/)** - A TypeScript framework for building scalable applications with Domain-Driven Design, Hexagonal Architecture, and CQRS patterns.
>
> **New to Stratix?** Start with the [Getting Started Guide](https://stratix-dev.github.io/stratix/docs/getting-started/quick-start)

-

## About This Package

`@stratix/runtime` provides the application runtime and plugin lifecycle management system for Stratix applications. It includes the ApplicationBuilder, plugin registry, and lifecycle management utilities.

**This package includes:**
- ApplicationBuilder for fluent app configuration
- Plugin lifecycle management (initialize, start, stop)
- Dependency graph for automatic plugin ordering
- Health check system
- Application lifecycle hooks

## About Stratix

Stratix is an AI-first TypeScript framework combining Domain-Driven Design, Hexagonal Architecture, and CQRS. It provides production-ready patterns for building scalable, maintainable applications with AI agents as first-class citizens.

**Key Resources:**
- [Documentation](https://stratix-dev.github.io/stratix/)
- [Quick Start](https://stratix-dev.github.io/stratix/docs/getting-started/quick-start)
- [Report Issues](https://github.com/stratix-dev/stratix/issues)

## Installation

**Prerequisites:**
- Node.js 18.0.0 or higher
- `@stratix/core` installed

**Recommended:** Create a new Stratix project
```bash
npm install -g @stratix/cli
stratix new my-app
```

**Manual installation:**
```bash
npm install @stratix/core @stratix/runtime
```

## Quick Start

```typescript
import { ApplicationBuilder } from '@stratix/runtime';
import { ConsoleLogger } from '@stratix/core';
import { PostgresPlugin } from '@stratix/db-postgres';
import { FastifyHTTPPlugin } from '@stratix/http-fastify';

const app = await ApplicationBuilder.create()
  .useLogger(new ConsoleLogger())
  .usePlugin(new PostgresPlugin({ /* config */ }))
  .usePlugin(new FastifyHTTPPlugin({ port: 3000 }))
  .build();

await app.start();
console.log('Application started!');

// Graceful shutdown
process.on('SIGINT', async () => {
  await app.stop();
  process.exit(0);
});
```

## Related Packages

**Essential:**
- [`@stratix/core`](https://www.npmjs.com/package/@stratix/core) - Core primitives and abstractions
- [`@stratix/cli`](https://www.npmjs.com/package/@stratix/cli) - Code generation and scaffolding

**Plugins:**
- [`@stratix/db-postgres`](https://www.npmjs.com/package/@stratix/db-postgres) - PostgreSQL integration
- [`@stratix/http-fastify`](https://www.npmjs.com/package/@stratix/http-fastify) - Fastify HTTP server
- [`@stratix/di-awilix`](https://www.npmjs.com/package/@stratix/di-awilix) - Dependency injection

[View all plugins](https://stratix-dev.github.io/stratix/docs/plugins/official-plugins)

## Documentation

- [Getting Started](https://stratix-dev.github.io/stratix/docs/getting-started/quick-start)
- [Core Concepts](https://stratix-dev.github.io/stratix/docs/core-concepts/architecture-overview)
- [Plugin Architecture](https://stratix-dev.github.io/stratix/docs/plugins/plugin-architecture)
- [Complete Documentation](https://stratix-dev.github.io/stratix/)

## Support

- [GitHub Issues](https://github.com/stratix-dev/stratix/issues) - Report bugs and request features
- [Documentation](https://stratix-dev.github.io/stratix/) - Comprehensive guides and tutorials

## License

MIT - See [LICENSE](https://github.com/stratix-dev/stratix/blob/main/LICENSE) for details.

-

<div align="center">

**[Stratix Framework](https://stratix-dev.github.io/stratix/)** - Build better software with proven patterns

</div>
