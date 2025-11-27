---
sidebar_position: 3
title: DI Providers
description: Dependency injection container providers
---

# Dependency Injection Providers

DI Providers implement the `Container` interface from `@stratix/core`, providing dependency injection capabilities for your Stratix application.

## Awilix Container

**Package:** `@stratix/di-awilix`

The recommended dependency injection container for Stratix, based on the popular [Awilix](https://github.com/jeffijoe/awilix) library.

### Installation

```bash
npm install @stratix/di-awilix
```

Or using the CLI:

```bash
stratix add awilix
```

### Features

- ✅ **Singleton, Scoped, and Transient lifetimes**
- ✅ **Factory functions** for flexible service creation
- ✅ **Scoped containers** for request-level dependencies
- ✅ **Auto-wiring** for class dependencies
- ✅ **Disposal support** for cleanup
- ✅ **Type-safe** with TypeScript

### Basic Usage

```typescript
import { AwilixContainer } from '@stratix/di-awilix';
import { ServiceLifetime } from '@stratix/core';

// Create container
const container = new AwilixContainer();

// Register a singleton
container.register('logger', () => new Logger(), {
  lifetime: ServiceLifetime.SINGLETON
});

// Register with dependencies
container.register('userService', (context) => {
  const logger = context.resolve<Logger>('logger');
  const repository = context.resolve<UserRepository>('userRepository');
  return new UserService(logger, repository);
}, {
  lifetime: ServiceLifetime.SINGLETON
});

// Resolve services
const userService = container.resolve<UserService>('userService');
```

### Service Lifetimes

#### Singleton

Created once and reused for all resolutions:

```typescript
container.register('database', () => new Database(), {
  lifetime: ServiceLifetime.SINGLETON
});

// Or using the shorthand
container.singleton('database', new Database());
```

#### Scoped

Created once per scope (e.g., per HTTP request):

```typescript
container.register('requestContext', () => new RequestContext(), {
  lifetime: ServiceLifetime.SCOPED
});

// Or using the shorthand
container.scoped('requestContext', () => new RequestContext());

// Create a scope
const scope = container.createScope();
const ctx1 = scope.resolve<RequestContext>('requestContext');
const ctx2 = scope.resolve<RequestContext>('requestContext');
// ctx1 === ctx2 (same instance within scope)

await scope.dispose(); // Cleanup
```

#### Transient

Created every time it's resolved:

```typescript
container.register('requestId', () => crypto.randomUUID(), {
  lifetime: ServiceLifetime.TRANSIENT
});

// Or using the shorthand
container.transient('requestId', () => crypto.randomUUID());
```

### Class Registration

Register classes with auto-wiring:

```typescript
class UserService {
  constructor(
    private logger: Logger,
    private repository: UserRepository
  ) {}
}

// Register class
container.registerClass(UserService, {
  token: 'userService',
  lifetime: ServiceLifetime.SINGLETON,
  injectionMode: 'PROXY' // or 'CLASSIC'
});
```

### Advanced Features

#### Conditional Registration

```typescript
if (!container.has('logger')) {
  container.singleton('logger', new ConsoleLogger());
}
```

#### Try Resolve

```typescript
const logger = container.tryResolve<Logger>('logger');
if (logger) {
  logger.info('Logger available');
}
```

#### Bulk Registration

```typescript
container.registerAll({
  logger: new ConsoleLogger(),
  config: new AppConfig(),
  cache: new RedisCache()
});
```

#### Disposal

```typescript
class DatabaseConnection {
  async dispose() {
    await this.close();
  }
}

container.singleton('db', new DatabaseConnection());

// Later, cleanup all disposable services
await container.dispose();
```

### Using with Stratix Runtime

The runtime automatically provides a container:

```typescript
import { StratixApp } from '@stratix/runtime';
import { AwilixContainer } from '@stratix/di-awilix';

const app = new StratixApp({
  container: new AwilixContainer(),
  plugins: [
    // ... plugins
  ]
});

// Access container
const container = app.getContainer();
```

### Integration with Plugins

Plugins can register services during initialization:

```typescript
import type { Plugin, PluginContext } from '@stratix/core';

export class DatabasePlugin implements Plugin {
  readonly metadata = {
    name: 'database',
    version: '1.0.0'
  };

  async initialize(context: PluginContext): Promise<void> {
    const config = context.getConfig<DatabaseConfig>();
    const database = new Database(config);

    // Register in container
    context.container.register('database', () => database, {
      lifetime: ServiceLifetime.SINGLETON
    });
  }
}
```

## Container Interface

All DI providers implement the `Container` interface:

```typescript
interface Container {
  register<T>(
    token: Token<T>,
    factory: Factory<T>,
    options?: RegisterOptions
  ): void;

  resolve<T>(token: Token<T>): T;
  has<T>(token: Token<T>): boolean;
  createScope(): Container;
  dispose(): Promise<void>;
}
```

## Creating a Custom DI Provider

To create your own DI container provider:

```typescript
import type { Container, Token, Factory, RegisterOptions } from '@stratix/core';

export class CustomContainer implements Container {
  private services = new Map<string, any>();

  register<T>(
    token: Token<T>,
    factory: Factory<T>,
    options?: RegisterOptions
  ): void {
    const key = this.getKey(token);
    this.services.set(key, { factory, options });
  }

  resolve<T>(token: Token<T>): T {
    const key = this.getKey(token);
    const service = this.services.get(key);
    
    if (!service) {
      throw new Error(`Service not registered: ${key}`);
    }

    return service.factory(this);
  }

  has<T>(token: Token<T>): boolean {
    return this.services.has(this.getKey(token));
  }

  createScope(): Container {
    // Create scoped container
    return new CustomContainer();
  }

  async dispose(): Promise<void> {
    // Cleanup
  }

  private getKey<T>(token: Token<T>): string {
    if (typeof token === 'string') return token;
    if (typeof token === 'symbol') return token.toString();
    return token.name;
  }
}
```

## Best Practices

### 1. Use Interfaces as Tokens

```typescript
// Define interface
interface IUserRepository {
  findById(id: string): Promise<User | null>;
}

// Register with string token
container.register<IUserRepository>(
  'userRepository',
  () => new PostgresUserRepository()
);

// Resolve with type
const repo = container.resolve<IUserRepository>('userRepository');
```

### 2. Avoid Circular Dependencies

```typescript
// ❌ Bad: Circular dependency
class ServiceA {
  constructor(private serviceB: ServiceB) {}
}

class ServiceB {
  constructor(private serviceA: ServiceA) {}
}

// ✅ Good: Use factory or refactor
container.register('serviceA', (ctx) => {
  const serviceB = ctx.resolve<ServiceB>('serviceB');
  return new ServiceA(serviceB);
});
```

### 3. Use Scopes for Request-Level State

```typescript
// In HTTP plugin
app.use((req, res, next) => {
  const scope = container.createScope();
  scope.register('request', () => req, {
    lifetime: ServiceLifetime.SCOPED
  });
  
  req.scope = scope;
  
  res.on('finish', async () => {
    await scope.dispose();
  });
  
  next();
});
```

## Next Steps

- **[Dependency Injection Concepts](../core-concepts/dependency-injection)** - Learn DI principles
- **[Creating Plugins](../plugins/creating-plugins)** - Use DI in plugins
- **[CQRS](../core-concepts/cqrs)** - Inject handlers and buses
