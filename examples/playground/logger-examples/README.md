# @Logger Decorator Examples

This directory contains comprehensive examples of using the `@Logger` property decorator in Stratix applications.

## Overview

The `@Logger` decorator is a property decorator that automatically injects a Logger instance from the DI container. It provides:

- Automatic logger injection
- Contextual logging (adds class context to all logs)
- Lazy initialization
- Type safety with TypeScript
- Multiple logger instances per class
- Customizable context names

## Examples

### 01. Command Handler (`01-command-handler.ts`)

**What it demonstrates:**
- Basic usage of `@Logger()` in a CQRS command handler
- Logging at different levels (info, warn, error)
- Structured logging with context objects
- Error handling with proper logging

**Key patterns:**
```typescript
export class CreateUserHandler {
  @Logger()
  private readonly logger!: ILogger;

  async execute(command: CreateUserCommand) {
    this.logger.info('Creating user', { email: command.email });
    // ...
  }
}
```

**Use this when:**
- You're implementing command handlers
- You need to track command execution flow
- You want to log validation errors and business logic failures

### 02. Domain Service (`02-domain-service.ts`)

**What it demonstrates:**
- Custom logger context with `@Logger({ context: 'CustomName' })`
- Multiple log levels for different stages of processing
- Rich, structured logging with detailed context
- Performance tracking with logging

**Key patterns:**
```typescript
export class OrderProcessingService {
  @Logger({ context: 'OrderProcessing' })
  private readonly logger!: ILogger;

  async processOrder(orderId: string) {
    this.logger.debug('Starting order processing', { orderId });
    // Detailed flow tracking...
    this.logger.info('Order processed successfully', {
      orderId,
      processingTime
    });
  }
}
```

**Use this when:**
- You're implementing complex domain services
- You need custom context names different from the class name
- You want to track detailed processing flows
- You're monitoring performance

### 03. Event Handlers (`03-event-handler.ts`)

**What it demonstrates:**
- Using `@Logger` in event handlers
- Logging side effects and event processing
- Error handling that doesn't affect other event handlers
- Multiple event handlers with different logger contexts

**Key patterns:**
```typescript
export class SendWelcomeEmailHandler {
  @Logger({ context: 'EmailNotifications' })
  private readonly logger!: ILogger;

  async handle(event: UserCreatedEvent) {
    this.logger.info('Processing UserCreated event', {
      userId: event.userId,
      occurredAt: event.occurredAt
    });
    // ...
  }
}
```

**Use this when:**
- You're implementing event handlers
- You need to track event processing and side effects
- You want to log failures without throwing exceptions
- You're debugging event-driven flows

### 04. Multiple Loggers (`04-multiple-loggers.ts`)

**What it demonstrates:**
- Using multiple `@Logger` decorators in a single class
- Different loggers for different concerns (security, performance, general)
- Specialized logging for audit trails
- Performance monitoring with dedicated logger

**Key patterns:**
```typescript
export class PaymentProcessingService {
  @Logger({ context: 'PaymentService' })
  private readonly logger!: ILogger;

  @Logger({ context: 'PaymentSecurity' })
  private readonly securityLogger!: ILogger;

  @Logger({ context: 'PaymentPerformance' })
  private readonly perfLogger!: ILogger;

  async processPayment(...) {
    this.logger.info('Processing payment', { ... });
    this.securityLogger.info('Payment operation initiated', { ... });
    this.perfLogger.debug('Fraud detection completed', { duration });
  }
}
```

**Use this when:**
- You have multiple concerns in a single class (security, performance, business logic)
- You need separate log streams for different purposes
- You're building audit trails
- You're monitoring performance separately from business logic

### 05. Complete Application (`05-complete-app.ts`)

**What it demonstrates:**
- Full application using `@Logger` throughout all layers
- Integration with Stratix application bootstrap
- Logger usage in repositories, services, and handlers
- Complete flow from command to events with logging

**Key patterns:**
```typescript
@StratixApp({
  name: 'UserManagementApp',
  version: '1.0.0'
})
class App {
  @Logger({ context: 'Application' })
  private readonly logger!: ILogger;

  async onApplicationReady() {
    this.logger.info('Application started', { ... });
  }
}
```

**Use this when:**
- You're building a complete Stratix application
- You want to see how logging fits into the full architecture
- You need a reference for proper logging throughout all layers

## How It Works

### 1. Decorator Application

The `@Logger` decorator is applied to class properties:

```typescript
export class MyService {
  @Logger()
  private readonly logger!: ILogger;

  // or with custom context
  @Logger({ context: 'CustomContext' })
  private readonly customLogger!: ILogger;
}
```

### 2. Lazy Initialization

The logger is initialized lazily on first access:
- When you access `this.logger`, it checks if it's already initialized
- If not, it resolves the logger from the DI container
- It wraps the logger with contextual information (class name or custom context)
- It caches the logger for subsequent accesses

### 3. Contextual Logging

All logs automatically include the context:

```typescript
// In CreateUserHandler class
this.logger.info('Creating user', { email: 'test@example.com' });

// Actual log output:
// [INFO] Creating user { email: 'test@example.com', context: 'CreateUserHandler' }
```

### 4. DI Integration

The decorator resolves the base logger from the DI container:
- Looks for a service registered as `'logger'`
- Falls back to console logging if no logger is registered
- Works with any logger implementation that implements the `Logger` interface

## Best Practices

### 1. Use Descriptive Context Names

```typescript
// Good - describes the domain concern
@Logger({ context: 'OrderFulfillment' })

// Bad - too generic
@Logger({ context: 'Service' })
```

### 2. Log at Appropriate Levels

```typescript
// DEBUG: Detailed flow information
this.logger.debug('Checking inventory levels', { items });

// INFO: Important business events
this.logger.info('Order processed successfully', { orderId });

// WARN: Recoverable issues
this.logger.warn('Low stock detected', { sku });

// ERROR: Errors that need attention
this.logger.error('Payment failed', { error });

// FATAL: Critical errors requiring immediate action
this.logger.fatal('Database connection lost', { error });
```

### 3. Include Rich Context

```typescript
// Good - provides useful debugging information
this.logger.info('User created', {
  userId: user.id,
  email: user.email,
  timestamp: new Date(),
  source: 'api'
});

// Bad - not enough context
this.logger.info('User created');
```

### 4. Don't Log Sensitive Information

```typescript
// Bad - logs password
this.logger.info('User login', {
  email: user.email,
  password: user.password // Never do this!
});

// Good - omits sensitive data
this.logger.info('User login', {
  email: user.email,
  loginMethod: 'password'
});
```

### 5. Use Multiple Loggers for Separation of Concerns

```typescript
export class PaymentService {
  @Logger({ context: 'Payments' })
  private readonly logger!: ILogger;

  // Separate logger for security/audit
  @Logger({ context: 'PaymentAudit' })
  private readonly auditLogger!: ILogger;
}
```

## Running the Examples

Since these are TypeScript files, you'll need to compile them first or use ts-node:

```bash
# Using ts-node
npx ts-node examples/playground/logger-examples/05-complete-app.ts

# Or compile and run
npx tsc examples/playground/logger-examples/05-complete-app.ts
node examples/playground/logger-examples/05-complete-app.js
```

Note: Some examples are meant to be read and referenced, not executed directly.

## Integration with Stratix

The `@Logger` decorator integrates seamlessly with Stratix:

1. The framework automatically registers a default logger (`StratixLogger`)
2. You can replace it with a custom logger implementation
3. The decorator works with any DI container that implements the `Container` interface
4. It follows Stratix's Result pattern and error handling conventions

## Custom Logger Implementation

You can provide your own logger implementation:

```typescript
import { Logger, LogLevel } from '@stratix/core';

class CustomLogger implements Logger {
  debug(message: string, context?: Record<string, unknown>): void {
    // Your implementation
  }

  info(message: string, context?: Record<string, unknown>): void {
    // Your implementation
  }

  // ... other methods
}

// Register in your app
app.container.registerClass('logger', CustomLogger);
```

## TypeScript Configuration

Make sure your `tsconfig.json` has:

```json
{
  "compilerOptions": {
    "experimentalDecorators": false,  // Native decorators
    "emitDecoratorMetadata": true,
    "target": "ES2022"
  }
}
```

## Further Reading

- `packages/framework/src/docorators/Logger.ts` - Decorator implementation
- `packages/core/src/infrastructure/Logger.ts` - Logger interface
- `packages/framework/src/runtime/StratixLogger.ts` - Default implementation
