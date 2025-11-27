---
sidebar_position: 4
title: Project Structure
description: Understanding Stratix project organization and directory structure
---

# Project Structure

Stratix organizes code using **Contexts** - self-contained domain units with three mandatory layers: **domain**, **application**, and **infrastructure**. This structure works seamlessly in both monolithic and microservices architectures.

## Single Context Structure

For small applications or single-domain projects:

```
my-app/
├── src/
│   ├── domain/                    # Domain Layer (Business Logic)
│   ├── application/               # Application Layer (Use Cases)
│   ├── infrastructure/            # Infrastructure Layer (Technical Details)
│   └── index.ts                   # Application entry point
│
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

---

## Multi-Context Structure

For larger applications with multiple domains:

```
my-app/
├── src/
│   ├── contexts/
│   │   ├── products/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   └── ProductsContext.ts
│   │   │
│   │   ├── orders/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   └── OrdersContext.ts
│   │   │
│   │   └── customers/
│   │       ├── domain/
│   │       ├── application/
│   │       ├── infrastructure/
│   │       └── CustomersContext.ts
│   │
│   ├── shared/
│   └── index.ts
│
├── tests/
├── package.json
└── tsconfig.json
```

### When to Use Multi-Context Structure

Use multi-context structure when:
- Building applications with multiple distinct domains
- Need clear boundaries between different business capabilities
- Team-based development (one team per context)
- Planning to potentially extract contexts to separate services later
- Building microservices architecture

---

## The Three Layers

Every context MUST have these three layers:

### Domain Layer (`domain/`)

The **core business logic** layer. Contains:

- **Entities** - Objects with identity (User, Product, Order)
- **Value Objects** - Immutable objects (Email, Money, Address)
- **Repositories** - Interfaces for data access
- **Domain Services** - Business logic that doesn't belong to entities
- **Domain Events** - Events that represent business occurrences

**Rules:**
- No dependencies on other layers
- No framework-specific code
- Pure business logic
- Framework-agnostic

**Example:**
```typescript
// src/domain/entities/Product.ts
import { AggregateRoot, EntityId } from '@stratix/core';

export class Product extends AggregateRoot<'Product'> {
  constructor(
    id: EntityId<'Product'>,
    private name: string,
    private price: number,
    createdAt: Date,
    updatedAt: Date
  ) {
    super(id, createdAt, updatedAt);
  }

  updatePrice(newPrice: number): void {
    if (newPrice < 0) {
      throw new Error('Price cannot be negative');
    }
    this.price = newPrice;
    this.touch();
  }
}
```

---

### Application Layer (`application/`)

The **use case** layer. Contains:

- **Commands** - Write operations (CreateProduct, UpdateOrder)
- **Queries** - Read operations (GetProductById, ListOrders)
- **Handlers** - Command and query handlers
- **Application Services** - Orchestration logic

**Rules:**
- Depends on Domain layer
- No dependencies on Infrastructure layer
- Orchestrates domain objects
- Implements use cases

**Example:**
```typescript
// src/application/commands/CreateProduct.ts
import { Command } from '@stratix/core';

export class CreateProductCommand implements Command {
  constructor(
    public readonly name: string,
    public readonly price: number
  ) {}
}

// src/application/handlers/CreateProductHandler.ts
import { CommandHandler, Result } from '@stratix/core';

export class CreateProductHandler implements CommandHandler<CreateProductCommand, Product> {
  constructor(private productRepository: IProductRepository) {}

  async handle(command: CreateProductCommand): Promise<Result<Product>> {
    const product = new Product(
      EntityId.create<'Product'>(),
      command.name,
      command.price,
      new Date(),
      new Date()
    );

    await this.productRepository.save(product);
    return Success.create(product);
  }
}
```

---

### Infrastructure Layer (`infrastructure/`)

The **technical implementation** layer. Contains:

- **Repository Implementations** - Database access
- **HTTP Controllers** - REST API endpoints
- **Database Configurations** - Connection setup
- **External Integrations** - Third-party services
- **Plugins** - Custom plugins

**Rules:**
- Depends on Domain and Application layers
- Framework-specific code allowed
- External service integrations
- Technical implementations

**Example:**
```typescript
// src/infrastructure/repositories/PostgresProductRepository.ts
import { IProductRepository } from '../../domain/repositories/IProductRepository';

export class PostgresProductRepository implements IProductRepository {
  constructor(private db: Database) {}

  async save(product: Product): Promise<void> {
    await this.db.query(
      'INSERT INTO products (id, name, price) VALUES ($1, $2, $3)',
      [product.id, product.name, product.price]
    );
  }

  async findById(id: EntityId<'Product'>): Promise<Product | null> {
    const result = await this.db.query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );
    return result.rows[0] ? this.toDomain(result.rows[0]) : null;
  }
}
```

---

## File Naming Conventions

Stratix follows these naming conventions:

### TypeScript Files

- **Entities**: `PascalCase.ts` - `Product.ts`, `Order.ts`
- **Value Objects**: `PascalCase.ts` - `Email.ts`, `Money.ts`
- **Commands**: `PascalCaseCommand.ts` - `CreateProductCommand.ts`
- **Queries**: `PascalCaseQuery.ts` - `GetProductByIdQuery.ts`
- **Handlers**: `PascalCaseHandler.ts` - `CreateProductHandler.ts`
- **Repositories**: `IPascalCaseRepository.ts` (interface), `ConcretePascalCaseRepository.ts` (implementation)
- **Plugins**: `PascalCasePlugin.ts` - `DatabasePlugin.ts`

### Test Files

- **Unit Tests**: `*.test.ts` or `*.spec.ts`
- **Integration Tests**: `*.integration.test.ts`
- **E2E Tests**: `*.e2e.test.ts`

---

## Import Paths

### Absolute Imports (Recommended)

Configure `tsconfig.json` for absolute imports:

```json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@domain/*": ["domain/*"],
      "@application/*": ["application/*"],
      "@infrastructure/*": ["infrastructure/*"]
    }
  }
}
```

Usage:
```typescript
import { Product } from '@domain/entities/Product';
import { CreateProductCommand } from '@application/commands/CreateProduct';
```

### Relative Imports

```typescript
import { Product } from '../../domain/entities/Product';
import { IProductRepository } from '../../domain/repositories/IProductRepository';
```

---

## Configuration Files

### `package.json`

Project metadata and dependencies:

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "test": "vitest",
    "lint": "eslint src",
    "format": "prettier --write src"
  }
}
```

### `tsconfig.json`

TypeScript configuration:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### `.eslintrc.json`

ESLint configuration for code quality:

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "root": true
}
```

### `.prettierrc`

Prettier configuration for code formatting:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

---

## Best Practices

### 1. Keep Layers Separate

```typescript
// Bad: Domain depends on infrastructure
import { Database } from '@infrastructure/database';

export class Product {
  save() {
    Database.query('INSERT...'); // Domain shouldn't know about database
  }
}

// Good: Use repository interface
export class Product {
  // Domain logic only
}

// Infrastructure implements the interface
export class PostgresProductRepository implements IProductRepository {
  async save(product: Product): Promise<void> {
    await this.db.query('INSERT...');
  }
}
```

### 2. Use Dependency Injection

```typescript
// Bad: Hard-coded dependencies
export class CreateProductHandler {
  private repository = new PostgresProductRepository();
}

// Good: Inject dependencies
export class CreateProductHandler {
  constructor(private repository: IProductRepository) {}
}
```

### 3. Organize by Feature

```typescript
// Bad: Organized by type
src/
  controllers/
    ProductController.ts
    OrderController.ts
  services/
    ProductService.ts
    OrderService.ts

// Good: Organized by context
src/
  contexts/
    products/
      domain/
      application/
      infrastructure/
    orders/
      domain/
      application/
      infrastructure/
```

---

## Next Steps

- **[Core Concepts](../core-concepts/architecture-overview)** - Learn about hexagonal architecture
- **[CLI Reference](../cli/cli-overview)** - Generate code with the CLI
- **[Contexts](../core-concepts/contexts)** - Understand context architecture
