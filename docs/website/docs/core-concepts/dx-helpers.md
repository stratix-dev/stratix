---
sidebar_position: 7
---

# DX Helpers

Stratix provides a comprehensive set of Developer Experience (DX) helpers that reduce boilerplate code by 40-90%. These utilities simplify common patterns in Domain-Driven Design, CQRS, and application setup.

## Overview

DX Helpers are organized into two packages:

- **@stratix/core** - Domain and messaging helpers
- **@stratix/runtime** - Application setup and testing helpers

All helpers are:
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Zero breaking changes** - Completely optional
- ✅ **Well-tested** - 204 tests across all helpers
- ✅ **Production-ready** - Battle-tested patterns

## Core Package Helpers

### Result Helpers

Simplify working with the Result pattern for error handling.

```typescript
import { Results } from '@stratix/core';

// Combine multiple Results
const nameResult = ProductName.create('Laptop');
const priceResult = Money.USD(999);

const productResult = Results.combine(nameResult, priceResult)
  .map(([name, price]) => new Product(name, price));

// Execute operations in sequence
const results = await Results.sequence([
  () => saveUser(user1),
  () => saveUser(user2),
  () => saveUser(user3)
]);

// Execute operations in parallel
const results = await Results.parallel([
  () => fetchUser(id1),
  () => fetchUser(id2),
  () => fetchUser(id3)
]);
```

**Available methods:**
- `Results.combine()` - Combine multiple Results into one
- `Results.all()` - Map array of values to Results
- `Results.sequence()` - Execute async operations sequentially
- `Results.parallel()` - Execute async operations in parallel
- `Results.retry()` - Retry operation with exponential backoff
- `Results.toOptional()` - Convert Result to optional value
- `Results.unwrapOrThrow()` - Throw exception if Failure

**Impact:** Reduces handler code by 40-50%

---

### Async Result Helpers

Handle async operations with Results seamlessly.

```typescript
import { AsyncResults } from '@stratix/core';

async function getUser(id: string): Promise<Result<User, DomainError>> {
  return AsyncResults.flatMap(
    AsyncResults.fromPromise(
      repository.findById(id),
      (error) => new DomainError('DB_ERROR', String(error))
    ),
    (user) => user
      ? Success.create(user)
      : Failure.create(new DomainError('NOT_FOUND', 'User not found'))
  );
}

// Chain multiple async operations
const result = await AsyncResults.flatMap(
  getUserId(),
  async (userId) => await AsyncResults.flatMap(
    loadUser(userId),
    formatUser
  )
);
```

**Available methods:**
- `AsyncResults.fromPromise()` - Convert Promise to Result (catches errors)
- `AsyncResults.map()` - Map over async Results
- `AsyncResults.flatMap()` - Chain async operations
- `AsyncResults.sequence()` - Execute async Results sequentially
- `AsyncResults.parallel()` - Execute async Results in parallel

**Impact:** Reduces async error handling code by 50%

---

### Validators

Reusable, composable validators for common patterns.

```typescript
import { Validators } from '@stratix/core';

// Individual validators
const emailResult = Validators.email('user@example.com');
const urlResult = Validators.url('https://example.com');
const rangeResult = Validators.range(50, { min: 0, max: 100 });

// Compose validators
const validateProductName = Validators.compose<string>(
  (v) => Validators.notEmpty(v, 'Product name'),
  (v) => Validators.length(v, { min: 3, max: 100 }),
  (v) => Validators.pattern(v, /^[a-zA-Z0-9\s]+$/, 'Only alphanumeric')
);
```

**Available validators:**
- `Validators.notEmpty()` - String is not empty
- `Validators.length()` - String length validation
- `Validators.range()` - Number range validation
- `Validators.pattern()` - Regex pattern matching
- `Validators.email()` - Email format validation
- `Validators.url()` - URL format validation
- `Validators.compose()` - Compose multiple validators

**Impact:** Reduces validation code by 70%

---

### Entity Builder

Fluent API for creating entities with less boilerplate.

```typescript
import { EntityBuilder } from '@stratix/core';

// Before (verbose)
const productId = EntityId.create<'Product'>();
const createdAt = new Date();
const updatedAt = new Date();
const props: ProductProps = { name: 'Laptop', price: 999 };
const product = new Product(productId, props, createdAt, updatedAt);

// After (clean)
const product = EntityBuilder.create<'Product', ProductProps>()
  .withProps({ name: 'Laptop', price: 999 })
  .build(Product);

// With custom ID and timestamps
const product = EntityBuilder.create<'Product', ProductProps>()
  .withId(customId)
  .withProps({ name: 'Laptop', price: 999 })
  .withTimestamps(createdAt, updatedAt)
  .build(Product);
```

**Impact:** Reduces entity creation boilerplate by 60%

---

### Base Command/Query Handlers

Base classes with automatic validation for handlers.

```typescript
import { BaseCommandHandler, BaseQueryHandler } from '@stratix/core';

class CreateProductHandler extends BaseCommandHandler<CreateProductCommand, Product> {
  protected validate(command: CreateProductCommand): Result<void, DomainError> {
    if (!command.name) {
      return Failure.create(new DomainError('INVALID_NAME', 'Name is required'));
    }
    return Success.create(undefined);
  }

  protected async execute(command: CreateProductCommand): Promise<Result<Product, DomainError>> {
    const product = Product.create(command.name, command.price);
    await this.repository.save(product);
    return Success.create(product);
  }
}

// Usage - validation happens automatically
const result = await handler.handle(command);
```

**Impact:** Reduces handler code by 50%

---

### Value Object Factory

Create Value Objects with validation helpers.

```typescript
import { ValueObjectFactory, Validators } from '@stratix/core';

class Email extends ValueObject {
  constructor(readonly value: string) {
    super();
  }

  static create(value: string): Result<Email, DomainError> {
    return ValueObjectFactory.createString(value, Email, [
      (v) => Validators.notEmpty(v, 'Email'),
      (v) => Validators.email(v)
    ]);
  }

  protected getEqualityComponents() {
    return [this.value];
  }
}

// For numbers
class Price extends ValueObject {
  constructor(readonly value: number) {
    super();
  }

  static create(value: number): Result<Price, DomainError> {
    return ValueObjectFactory.createNumber(value, Price, [
      (v) => Validators.range(v, { min: 0, max: 1000000 })
    ]);
  }

  protected getEqualityComponents() {
    return [this.value];
  }
}

// Custom validation
class HexColor extends ValueObject {
  constructor(readonly hex: string) {
    super();
  }

  static create(hex: string): Result<HexColor, DomainError> {
    return ValueObjectFactory.create(hex, HexColor, (value) => {
      if (!/^#[0-9A-F]{6}$/i.test(value)) {
        return Failure.create(new DomainError('INVALID_COLOR', 'Must be valid hex'));
      }
      return Success.create(value.toUpperCase());
    });
  }

  protected getEqualityComponents() {
    return [this.hex];
  }
}
```

**Available methods:**
- `ValueObjectFactory.createString()` - Create string-based Value Objects
- `ValueObjectFactory.createNumber()` - Create number-based Value Objects
- `ValueObjectFactory.create()` - Create with custom validation

**Impact:** Reduces Value Object boilerplate by 60%

---

## Runtime Package Helpers

### Application Builder Helpers

Quick setup with sensible defaults for development and testing.

```typescript
import { ApplicationBuilderHelpers } from '@stratix/runtime';
import { AwilixContainer } from '@stratix/di-awilix';

// Before (verbose)
const container = new AwilixContainer();
container.register('commandBus', () => new InMemoryCommandBus(), { lifetime: 'SINGLETON' });
container.register('queryBus', () => new InMemoryQueryBus(), { lifetime: 'SINGLETON' });
container.register('eventBus', () => new InMemoryEventBus(), { lifetime: 'SINGLETON' });
const logger = new ConsoleLogger();
container.register('logger', () => logger, { lifetime: 'SINGLETON' });

const app = await ApplicationBuilder.create()
  .useContainer(container)
  .useLogger(logger)
  .build();

// After (clean)
const app = await ApplicationBuilderHelpers.createWithDefaults(container)
  .usePlugin(new MyPlugin())
  .build();

// For testing
const app = await ApplicationBuilderHelpers.createForTesting(container)
  .build();
```

**Available methods:**
- `ApplicationBuilderHelpers.createWithDefaults()` - Setup for development
- `ApplicationBuilderHelpers.createForTesting()` - Setup for tests

**Impact:** Reduces application setup code by 80%

---

### InMemory Repository

Base class for in-memory repositories with standard CRUD operations.

```typescript
import { InMemoryRepository } from '@stratix/runtime';

class ProductRepository extends InMemoryRepository<Product> {
  async findByCategory(category: string): Promise<Product[]> {
    return this.findMany(p => p.category === category);
  }

  async findExpensive(): Promise<Product[]> {
    return this.findMany(p => p.price > 1000);
  }

  async countByCategory(category: string): Promise<number> {
    return this.count(p => p.category === category);
  }
}

// Usage
const repo = new ProductRepository();
await repo.save(product);
const found = await repo.findById(product.id.value);
const all = await repo.findAll();
const electronics = await repo.findByCategory('Electronics');
```

**Available methods:**
- `findById()` - Find by ID
- `findAll()` - Get all entities
- `save()` - Save entity
- `delete()` - Delete by ID
- `exists()` - Check if exists
- `findOne()` - Find with predicate
- `findMany()` - Filter with predicate
- `count()` - Count with optional predicate
- `saveMany()` - Save multiple
- `deleteMany()` - Delete multiple
- `clear()` - Clear all (useful for tests)

**Impact:** Reduces testing repository code by 90%

---

### Test Helpers

Utilities to simplify testing patterns.

```typescript
import { TestHelpers } from '@stratix/runtime';

describe('Product Service', () => {
  it('should create entity easily', () => {
    const product = TestHelpers.createEntity(
      Product,
      { name: 'Test', price: 100 }
    );
    expect(product).toBeDefined();
  });

  it('should capture published events', async () => {
    const { bus, events } = TestHelpers.createEventBusCapture();
    const service = new ProductService(repository, bus);
    
    await service.createProduct({ name: 'Test', price: 100 });
    
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(ProductCreatedEvent);
  });

  it('should wait for async events', async () => {
    const { bus } = TestHelpers.createEventBusCapture();
    const service = new ProductService(repository, bus);
    
    const eventPromise = TestHelpers.waitForEvent(bus, ProductCreatedEvent);
    await service.createProduct({ name: 'Test', price: 100 });
    
    const event = await eventPromise;
    expect(event).toBeInstanceOf(ProductCreatedEvent);
  });

  it('should spy on events without notifying handlers', async () => {
    const { bus, events } = TestHelpers.createEventBusSpy();
    // Events are captured but handlers are NOT called
  });
});
```

**Available methods:**
- `TestHelpers.createEntity()` - Create entities for tests
- `TestHelpers.createCommandBus()` - In-memory command bus
- `TestHelpers.createQueryBus()` - In-memory query bus
- `TestHelpers.createEventBusCapture()` - Capture published events
- `TestHelpers.waitForEvent()` - Wait for specific event
- `TestHelpers.createEventBusSpy()` - Spy without notifying handlers

**Impact:** Reduces test setup code by 60%

---

### Module Helpers

Create modules with minimal boilerplate.

```typescript
import { ModuleHelpers } from '@stratix/runtime';

// Before (verbose - full class)
class ProductsModule extends BaseContextModule {
  readonly metadata = {
    name: 'products-context',
    description: 'Products bounded context',
    version: '1.0.0',
    requiredPlugins: [],
    requiredModules: []
  };
  readonly contextName = 'Products';
  
  getCommands() {
    return [
      { name: 'CreateProduct', commandType: CreateProductCommand, handler }
    ];
  }
  
  getQueries() {
    return [
      { name: 'GetProduct', queryType: GetProductQuery, handler }
    ];
  }
  
  // ... more boilerplate
}

// After (inline)
const productsModule = ModuleHelpers.createSimpleModule('Products', {
  description: 'Products bounded context',
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

// Repository-only module
const repoModule = ModuleHelpers.createRepositoryModule('Data', {
  productRepository: new ProductRepository(),
  userRepository: new UserRepository()
});

// Read-only module (queries only)
const readModule = ModuleHelpers.createReadOnlyModule('Reporting', {
  queries: [
    { name: 'GetSalesReport', queryType: GetSalesReportQuery, handler }
  ]
});
```

**Available methods:**
- `ModuleHelpers.createSimpleModule()` - Create module with inline config
- `ModuleHelpers.createRepositoryModule()` - Repository-only module
- `ModuleHelpers.createReadOnlyModule()` - Query-only module

**Impact:** Reduces module boilerplate by 75%

---

### Container Helpers

Simplify DI container operations.

```typescript
import { ContainerHelpers } from '@stratix/runtime';

// Register defaults (buses, logger)
ContainerHelpers.registerDefaults(container, {
  useInMemoryBuses: true,
  logger: new ConsoleLogger()
});

// Register multiple commands at once
ContainerHelpers.registerCommands(container, commandBus, [
  { commandType: CreateProductCommand, handler: new CreateProductHandler(repo) },
  { commandType: UpdateProductCommand, handler: new UpdateProductHandler(repo) },
  { commandType: DeleteProductCommand, handler: new DeleteProductHandler(repo) }
]);

// Register multiple queries
ContainerHelpers.registerQueries(container, queryBus, [
  { queryType: GetProductQuery, handler: new GetProductHandler(repo) },
  { queryType: ListProductsQuery, handler: new ListProductsHandler(repo) }
]);

// Register repositories
ContainerHelpers.registerRepositories(container, {
  productRepository: new InMemoryProductRepository(),
  userRepository: new InMemoryUserRepository(),
  orderRepository: new InMemoryOrderRepository()
});

// Register single repository
ContainerHelpers.registerRepository(
  container,
  'productRepository',
  new ProductRepository(),
  { singleton: true }
);
```

**Available methods:**
- `ContainerHelpers.registerDefaults()` - Register default services
- `ContainerHelpers.registerCommands()` - Bulk command registration
- `ContainerHelpers.registerQueries()` - Bulk query registration
- `ContainerHelpers.registerRepository()` - Register single repository
- `ContainerHelpers.registerRepositories()` - Bulk repository registration

**Impact:** Reduces container setup code by 70%

---

## Best Practices

### When to Use DX Helpers

✅ **Use helpers when:**
- Setting up new projects or modules
- Writing tests
- Creating common patterns (Value Objects, handlers)
- You want to reduce boilerplate

❌ **Don't use helpers when:**
- You need very custom behavior
- The helper doesn't fit your use case
- You prefer explicit code over convenience

### Combining Helpers

Helpers work great together:

```typescript
// Create Value Object with factory + validators
class Email extends ValueObject {
  constructor(readonly value: string) { super(); }
  
  static create(value: string) {
    return ValueObjectFactory.createString(value, Email, [
      (v) => Validators.notEmpty(v, 'Email'),
      (v) => Validators.email(v)
    ]);
  }
  
  protected getEqualityComponents() { return [this.value]; }
}

// Use in handler with base class
class CreateUserHandler extends BaseCommandHandler<CreateUserCommand, User> {
  protected validate(command: CreateUserCommand) {
    return Results.combine(
      Email.create(command.email),
      Validators.notEmpty(command.name, 'Name')
    ).map(() => undefined);
  }
  
  protected async execute(command: CreateUserCommand) {
    const user = EntityBuilder.create<'User', UserProps>()
      .withProps({ email: command.email, name: command.name })
      .build(User);
      
    await this.repository.save(user);
    return Success.create(user);
  }
}

// Test with helpers
describe('CreateUserHandler', () => {
  it('should create user', async () => {
    const repo = new InMemoryUserRepository();
    const { bus, events } = TestHelpers.createEventBusCapture();
    const handler = new CreateUserHandler(repo, bus);
    
    const result = await handler.handle(
      new CreateUserCommand('test@example.com', 'John')
    );
    
    expect(result.isSuccess).toBe(true);
    expect(events).toHaveLength(1);
  });
});
```

## Performance

DX Helpers have **zero runtime overhead**:
- Helpers are thin wrappers around existing patterns
- No additional abstractions or indirection
- Same performance as hand-written code

## Next Steps

- Explore [Core Concepts](./architecture-overview.md)
- Learn about [CQRS](./cqrs.md)
- Check out [Testing Guide](../getting-started/testing.md)
- Browse [API Reference](https://stratix-dev.github.io/stratix/api/)

