# Stratix Framework API Documentation

Welcome to the Stratix Framework API documentation! This comprehensive guide covers all public APIs across the framework's core packages.

## 📚 Documentation Structure

The documentation is organized into **12 logical categories** for easy navigation:

### 🏗️ Core Architecture
- **Domain Primitives**: Base building blocks (ValueObject, Entity, AggregateRoot, AIAgent, EntityId)
- **Result Pattern**: Type-safe error handling (Result, Success, Failure)
- **Patterns**: Common design patterns (Specification, Mapper)

### 💬 Application Building Blocks
- **Messaging (CQRS)**: Command, Query, Event patterns with buses and handlers
- **Value Objects**: Common domain values (Email, Money, Currency, UUID, PhoneNumber, Percentage, Address)
- **Validation**: Reusable validators for domain logic

### 🤖 AI & Intelligence
- **AI Agents**: Agent lifecycle, context, memory, orchestration, tools, and LLM providers

### 🛠️ Infrastructure & Runtime
- **Infrastructure**: Logging, repositories, unit of work, health checks, rate limiting, secrets
- **Runtime & Application**: Application lifecycle, contexts, plugins, builders
- **Dependency Injection**: Awilix-based DI container
- **Configuration**: Configuration providers and schema validation

### 🧪 Testing
- **Testing**: AgentTester, TestApplication, MockLLMProvider, and test utilities

## 🚀 Quick Links

### Getting Started
- [Main Index](index.html) - Overview and entry point
- [Class Hierarchy](hierarchy.html) - Inheritance relationships

### Most Used Classes
- [Result](classes/core_src.Result.html) - Type-safe error handling
- [ValueObject](classes/core_src.ValueObject.html) - Base for value objects
- [Entity](classes/core_src.Entity.html) - Base for entities
- [AIAgent](classes/core_src.AIAgent.html) - AI agent abstraction

### Key Interfaces
- [Repository](interfaces/core_src.Repository.html) - Data persistence
- [Logger](interfaces/core_src.Logger.html) - Logging abstraction
- [CommandBus](interfaces/core_src.CommandBus.html) - Command dispatching
- [QueryBus](interfaces/core_src.QueryBus.html) - Query execution
- [EventBus](interfaces/core_src.EventBus.html) - Event publishing

### Implementation Examples
- [InMemoryCommandBus](classes/runtime_src.InMemoryCommandBus.html) - In-memory command bus
- [InMemoryQueryBus](classes/runtime_src.InMemoryQueryBus.html) - In-memory query bus
- [InMemoryEventBus](classes/runtime_src.InMemoryEventBus.html) - In-memory event bus
- [ConsoleLogger](classes/runtime_src.ConsoleLogger.html) - Console logger
- [InMemoryRepository](classes/runtime_src.InMemoryRepository.html) - In-memory repository

## 📖 Usage Examples

### Domain-Driven Design
```typescript
import { Entity, ValueObject, Result, AggregateRoot } from '@stratix/core';

// Create a value object
class Email extends ValueObject {
  static create(value: string): Result<Email, DomainError> {
    // Validation logic
  }
}

// Create an entity
class User extends Entity<string> {
  constructor(
    id: string,
    public email: Email,
    public name: string
  ) {
    super(id);
  }
}

// Create an aggregate root
class Order extends AggregateRoot<string> {
  addItem(item: OrderItem): Result<void, DomainError> {
    // Business logic with domain events
    this.addDomainEvent(new OrderItemAddedEvent(this.id, item));
    return Success.create(undefined);
  }
}
```

### CQRS Pattern
```typescript
import { Command, CommandHandler, CommandBus } from '@stratix/core';
import { InMemoryCommandBus } from '@stratix/runtime';

// Define a command
class CreateUserCommand extends Command {
  constructor(
    public readonly email: string,
    public readonly name: string
  ) {
    super();
  }
}

// Register handler
const commandBus = new InMemoryCommandBus();
commandBus.register(CreateUserCommand, async (cmd) => {
  const user = await userRepository.create(cmd.email, cmd.name);
  return user.id;
});

// Dispatch command
const userId = await commandBus.dispatch(
  new CreateUserCommand('john@example.com', 'John Doe')
);
```

### AI Agents
```typescript
import { AIAgent, AgentContext, AgentResult } from '@stratix/core';
import { AgentTester } from '@stratix/testing';

// Define an agent
class CustomerSupportAgent extends AIAgent<string, string> {
  async execute(input: string): Promise<AgentResult<string>> {
    const response = await this.llmProvider.chat({
      messages: [{ role: 'user', content: input }]
    });
    return AgentResult.success(response.content);
  }
}

// Test the agent
const tester = new AgentTester(new CustomerSupportAgent(...));
const result = await tester.test('How do I reset my password?');
expect(result.isSuccess).toBe(true);
```

## 🔍 Search Tips

1. **Use the search bar** (top right) to find classes, interfaces, and functions
2. **Browse by category** in the sidebar for organized navigation
3. **Check the hierarchy** page to understand inheritance relationships
4. **Read the examples** in each class/interface documentation

## 📝 Contributing

When adding new public APIs to Stratix:

1. Add comprehensive JSDoc comments with `@param`, `@returns`, `@example`
2. Include a `@category` tag (see [DOCUMENTATION.md](../DOCUMENTATION.md))
3. Provide at least one code example
4. Run `pnpm docs` to regenerate documentation
5. Review the generated HTML for clarity

See the [DOCUMENTATION.md](../DOCUMENTATION.md) guide for detailed standards.

## 🔗 Links

- [Main Repository](https://github.com/stratix-ai/stratix)
- [Documentation Guidelines](../DOCUMENTATION.md)
- [Changelog](../CHANGELOG.md)
- [Contributing Guide](../README.md#contributing)

---

**Last Generated**: December 18, 2025  
**TypeDoc Version**: 0.25.0  
**Framework Version**: 0.4.3
