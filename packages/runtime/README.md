<div align="center">
  <img src="https://raw.githubusercontent.com/stratix-dev/stratix/main/public/logo-no-bg.png" alt="Stratix Logo" width="200"/>

# @stratix/runtime

**Application runtime and plugin lifecycle management for Stratix**

[![npm version](https://img.shields.io/npm/v/@stratix/runtime.svg)](https://www.npmjs.com/package/@stratix/runtime)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

[Documentation](https://stratix-dev.github.io/stratix/) | [Getting Started](https://stratix-dev.github.io/stratix/docs/getting-started/quick-start) 

</div>


> Part of **[Stratix Framework](https://stratix-dev.github.io/stratix/)** - A TypeScript framework for building scalable applications with Domain-Driven Design, Hexagonal Architecture, and CQRS patterns.
>
> **New to Stratix?** Start with the [Getting Started Guide](https://stratix-dev.github.io/stratix/docs/getting-started/quick-start)


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

## Features

### Core Runtime

- **ApplicationBuilder** - Fluent API for application configuration
- **Plugin System** - Lifecycle management (initialize, start, stop)
- **Dependency Graph** - Automatic plugin ordering
- **Health Checks** - Built-in health monitoring
- **Context System** - Organize code by domain contexts

### DX Helpers (New!)

Productivity helpers that reduce boilerplate by 60-90%:

- **ApplicationBuilderHelpers** - Quick setup with sensible defaults
- **InMemoryRepository** - Base class for in-memory repositories
- **TestHelpers** - Utilities for testing (entity creation, event capture, etc.)
- **ContextHelpers** - Create contexts with minimal boilerplate
- **ContainerHelpers** - Simplify DI container operations

## Quick Start

```typescript
import { ApplicationBuilder, ConsoleLogger } from '@stratix/runtime';
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

### DX Helpers

**ApplicationBuilder Helpers** - Quick setup:

```typescript
import { ApplicationBuilderHelpers } from '@stratix/runtime';
import { AwilixContainer } from '@stratix/di-awilix';

// Before (verbose)
const container = new AwilixContainer();
container.register('commandBus', () => new InMemoryCommandBus(), { lifetime: 'SINGLETON' });
container.register('queryBus', () => new InMemoryQueryBus(), { lifetime: 'SINGLETON' });
// ... more setup

// After (clean)
const app = await ApplicationBuilderHelpers.createWithDefaults(container)
  .usePlugin(new MyPlugin())
  .build();
```

**Test Helpers** - Simplify testing:

```typescript
import { TestHelpers } from '@stratix/runtime';

describe('Product Service', () => {
  it('should publish event when creating product', async () => {
    const { bus, events } = TestHelpers.createEventBusCapture();
    const service = new ProductService(repository, bus);
    
    await service.createProduct({ name: 'Test', price: 100 });
    
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(ProductCreatedEvent);
  });
});
```

**Context Helpers** - Create contexts inline:

```typescript
import { ContextHelpers } from '@stratix/runtime';

const productsContext = ContextHelpers.createSimpleContext('Products', {
  commands: [
    { name: 'CreateProduct', commandType: CreateProductCommand, handler }
  ],
  queries: [
    { name: 'GetProduct', queryType: GetProductQuery, handler }
  ],
  repositories: [
    { token: 'productRepository', instance: new ProductRepository() }
  ]
});
```

**Container Helpers** - Bulk registration:

```typescript
import { ContainerHelpers } from '@stratix/runtime';

// Register multiple commands at once
ContainerHelpers.registerCommands(container, commandBus, [
  { commandType: CreateProductCommand, handler: new CreateProductHandler(repo) },
  { commandType: UpdateProductCommand, handler: new UpdateProductHandler(repo) }
]);

// Register multiple repositories
ContainerHelpers.registerRepositories(container, {
  productRepository: new InMemoryProductRepository(),
  userRepository: new InMemoryUserRepository()
});
```

**InMemory Repository** - Testing made easy:

```typescript
import { InMemoryRepository } from '@stratix/runtime';

class ProductRepository extends InMemoryRepository<Product> {
  async findByCategory(category: string): Promise<Product[]> {
    return this.findMany(p => p.category === category);
  }
}
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

<div align="center">

**[Stratix Framework](https://stratix-dev.github.io/stratix/)** - Build better software with proven patterns

</div>
