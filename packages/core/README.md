<div align="center">
  <img src="https://raw.githubusercontent.com/stratix-dev/stratix/main/public/logo-no-bg.png" alt="Stratix Logo" width="200"/>

# @stratix/core

**Core primitives and abstractions for the Stratix framework**

[![npm version](https://img.shields.io/npm/v/@stratix/core.svg)](https://www.npmjs.com/package/@stratix/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

[Documentation](https://stratix-dev.github.io/stratix/) | [Getting Started](https://stratix-dev.github.io/stratix/docs/getting-started/quick-start) 

</div>

-

> Part of **[Stratix Framework](https://stratix-dev.github.io/stratix/)** - A TypeScript framework for building scalable applications with Domain-Driven Design, Hexagonal Architecture, and CQRS patterns.
>
> **New to Stratix?** Start with the [Getting Started Guide](https://stratix-dev.github.io/stratix/docs/getting-started/quick-start)

-

## About This Package

`@stratix/core` is the foundational package of the Stratix framework, providing zero-dependency primitives and abstractions for Domain-Driven Design, CQRS, and AI agents.

**This package includes:**
- Domain primitives (Entity, AggregateRoot, ValueObject)
- CQRS interfaces (Command, Query, Event buses)
- AI Agent base classes and interfaces
- Result pattern for error handling
- Pre-built value objects (Money, Email, URL, etc.)
- Plugin and module system interfaces

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

## Features

### Core Building Blocks

- **Entity** - Base class with identity and timestamps
- **AggregateRoot** - Entity with domain event support
- **ValueObject** - Immutable value objects base class
- **EntityId** - Type-safe identifiers with phantom types
- **Result** - Type-safe error handling without exceptions
- **DomainEvent** - Base interface for domain events
- **DomainError** - Base class for domain errors

### AI Agent Building Blocks

- **AIAgent** - Base class for AI agents as domain entities
- **AgentTool** - Base class for agent tools
- **LLMProvider** - Interface for LLM provider implementations
- **MemoryStore** - Interface for agent memory persistence

### Pre-built Value Objects

- **Money** - Monetary values with currency support
- **Currency** - ISO 4217 currency codes with metadata
- **Email** - Email address validation
- **PhoneNumber** - International phone numbers with country calling codes
- **URL** - URL validation and parsing
- **UUID** - UUID v4 generation and validation
- **DateRange** - Date ranges with validation
- **Percentage** - Percentage values (0-100)
- **Address** - Physical addresses with country support

### CQRS Interfaces

- **Command** - Command interface
- **Query** - Query interface
- **CommandBus** - Command bus interface
- **QueryBus** - Query bus interface
- **EventBus** - Event bus interface
- **InMemoryCommandBus** - Default in-memory implementation
- **InMemoryQueryBus** - Default in-memory implementation
- **InMemoryEventBus** - Default in-memory implementation

### DX Helpers (New!)

Productivity helpers that reduce boilerplate by 40-90%:

- **Results** - Combine, sequence, and parallelize Result operations
- **AsyncResults** - Work with async operations and Results seamlessly
- **Validators** - Reusable validators (email, URL, length, range, etc.)
- **EntityBuilder** - Fluent API for creating entities with less code
- **BaseCommandHandler** / **BaseQueryHandler** - Base classes with automatic validation
- **ValueObjectFactory** - Create Value Objects with validation helpers

## Quick Start

### Creating Entities

```typescript
import { Entity, EntityId } from '@stratix/core';

type UserId = EntityId<'User'>;

class User extends Entity<'User'> {
  constructor(
    id: UserId,
    private email: string,
    private name: string
  ) {
    super(id, new Date(), new Date());
  }

  changeName(newName: string): void {
    this.name = newName;
    this.touch();
  }
}

const userId = EntityId.create<'User'>();
const user = new User(userId, 'user@example.com', 'John');
```

### Result Pattern

```typescript
import { Result, Success, Failure } from '@stratix/core';

function divide(a: number, b: number): Result<number> {
  if (b === 0) {
    return Failure.create(new Error('Division by zero'));
  }
  return Success.create(a / b);
}

const result = divide(10, 2);
if (result.isSuccess) {
  console.log(result.value); // 5
} else {
  console.error(result.error.message);
}
```

### Value Objects

```typescript
import { Money, Email, PhoneNumber } from '@stratix/core';

// Money with currency
const price = Money.USD(99.99);
const discounted = price.multiply(0.8);
console.log(discounted.format()); // "$79.99"

// Email validation
const email = Email.create('user@example.com');
console.log(email.domain); // "example.com"

// Phone numbers with international codes
const phoneResult = PhoneNumber.create('+14155552671');
if (phoneResult.isSuccess) {
  console.log(phoneResult.value.format()); // "+1 (415) 555-2671"
}
```

### DX Helpers

**Result Helpers** - Combine and transform Results:

```typescript
import { Results } from '@stratix/core';

// Combine multiple Results
const nameResult = ProductName.create('Laptop');
const priceResult = Money.USD(999);

const combined = Results.combine(nameResult, priceResult)
  .map(([name, price]) => new Product(name, price));

// Sequence async operations
const results = await Results.sequence([
  () => saveUser(user1),
  () => saveUser(user2),
  () => saveUser(user3)
]);
```

**Validators** - Reusable validation:

```typescript
import { Validators, ValueObjectFactory } from '@stratix/core';

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
```

**Entity Builder** - Fluent entity creation:

```typescript
import { EntityBuilder } from '@stratix/core';

const product = EntityBuilder.create<'Product', ProductProps>()
  .withProps({ name: 'Laptop', price: 999 })
  .build(Product);
```

**Async Results** - Handle async operations:

```typescript
import { AsyncResults } from '@stratix/core';

async function getUser(id: string) {
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
```

### AI Agents

```typescript
import {
  AIAgent,
  AgentResult,
  AgentCapabilities,
  AgentVersionFactory,
  EntityId,
  type ModelConfig,
  type LLMProvider,
} from '@stratix/core';

class MyAgent extends AIAgent<string, string> {
  readonly name = 'My Agent';
  readonly description = 'Description of what this agent does';
  readonly version = AgentVersionFactory.create('1.0.0');
  readonly capabilities = [AgentCapabilities.TEXT_GENERATION];
  readonly model: ModelConfig = {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000,
  };

  constructor(private llmProvider: LLMProvider) {
    const id = EntityId.create<'AIAgent'>();
    const now = new Date();
    super(id, now, now);
  }

  protected async execute(input: string): Promise<AgentResult<string>> {
    // Implementation using llmProvider
    const output = await this.llmProvider.chat({ /* ... */ });
    return AgentResult.success(output.content, output.usage);
  }
}
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
