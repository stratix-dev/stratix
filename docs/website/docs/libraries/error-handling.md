---
sidebar_position: 2
title: Error Handling
description: Structured error handling with @stratix/errors
---

# Error Handling

**Package:** `@stratix/errors`

The `@stratix/errors` library provides structured error classes for consistent error handling across your Stratix application.

## Installation

```bash
npm install @stratix/errors
```

Or using the CLI:

```bash
stratix add errors
```

## Available Error Classes

### HTTP Errors

#### BadRequestError (400)

```typescript
import { BadRequestError } from '@stratix/errors';

throw new BadRequestError('Invalid email format');
```

#### UnauthorizedError (401)

```typescript
import { UnauthorizedError } from '@stratix/errors';

throw new UnauthorizedError('Invalid credentials');
```

#### ForbiddenError (403)

```typescript
import { ForbiddenError } from '@stratix/errors';

throw new ForbiddenError('Insufficient permissions');
```

#### NotFoundError (404)

```typescript
import { NotFoundError } from '@stratix/errors';

throw new NotFoundError('User not found');
```

#### ConflictError (409)

```typescript
import { ConflictError } from '@stratix/errors';

throw new ConflictError('Email already exists');
```

#### UnprocessableEntityError (422)

```typescript
import { UnprocessableEntityError } from '@stratix/errors';

throw new UnprocessableEntityError('Validation failed', {
  errors: [{ field: 'email', message: 'Invalid format' }]
});
```

### System Errors

#### InternalServerError (500)

```typescript
import { InternalServerError } from '@stratix/errors';

throw new InternalServerError('Unexpected error occurred');
```

#### DatabaseError

```typescript
import { DatabaseError } from '@stratix/errors';

throw new DatabaseError('Connection failed', originalError);
```

#### ExternalServiceError

```typescript
import { ExternalServiceError } from '@stratix/errors';

throw new ExternalServiceError('Payment gateway timeout');
```

## Error Properties

All error classes extend `AppError` and include:

```typescript
class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly severity: ErrorSeverity;
  readonly context?: Record<string, unknown>;
  readonly cause?: Error;
}
```

### Example with Context

```typescript
import { NotFoundError } from '@stratix/errors';

throw new NotFoundError('User not found', {
  userId: '123',
  requestedAt: new Date()
});
```

## Error Codes

```typescript
import { ErrorCode } from '@stratix/errors';

enum ErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}
```

## Error Severity

```typescript
import { ErrorSeverity } from '@stratix/errors';

enum ErrorSeverity {
  LOW = 'LOW',       // User errors (400-level)
  MEDIUM = 'MEDIUM', // System errors (500-level)
  HIGH = 'HIGH',     // Critical errors
  CRITICAL = 'CRITICAL', // Requires immediate attention
}
```

## Usage Patterns

### In Command Handlers

```typescript
import { NotFoundError } from '@stratix/errors';
import { BaseCommandHandler } from '@stratix/core';

export class UpdateUserCommandHandler extends BaseCommandHandler<
  UpdateUserCommand,
  void
> {
  async execute(command: UpdateUserCommand): Promise<void> {
    const user = await this.repository.findById(command.userId);
    
    if (!user) {
      throw new NotFoundError('User not found', {
        userId: command.userId
      });
    }
    
    // Update user...
  }
}
```

### In Domain Entities

```typescript
import { BadRequestError } from '@stratix/errors';
import { AggregateRoot } from '@stratix/core';

export class User extends AggregateRoot<UserId> {
  changeEmail(newEmail: Email): void {
    if (this.email.equals(newEmail)) {
      throw new BadRequestError('Email is the same as current', {
        currentEmail: this.email.value,
        newEmail: newEmail.value
      });
    }
    
    this.email = newEmail;
    this.addDomainEvent(new UserEmailChanged(this.id, newEmail));
  }
}
```

### In HTTP Controllers

```typescript
import { NotFoundError, BadRequestError } from '@stratix/errors';

app.get('/users/:id', async (req, res) => {
  try {
    const user = await userService.findById(req.params.id);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    res.json(user);
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({
        error: error.message,
        code: error.code
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});
```

### Global Error Handler

```typescript
import { AppError } from '@stratix/errors';

app.use((error: Error, req, res, next) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      context: error.context
    });
  } else {
    console.error('Unexpected error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});
```

## Creating Custom Errors

Extend `AppError` for domain-specific errors:

```typescript
import { AppError, ErrorCode, ErrorSeverity } from '@stratix/errors';

export class PaymentFailedError extends AppError {
  constructor(
    message: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(
      message,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      402, // Payment Required
      ErrorSeverity.MEDIUM,
      context,
      cause
    );
    this.name = 'PaymentFailedError';
  }
}

// Usage
throw new PaymentFailedError('Card declined', {
  cardLast4: '1234',
  amount: 99.99
});
```

## Best Practices

### 1. Use Specific Error Types

```typescript
// ✅ Good: Specific error type
throw new NotFoundError('User not found');

// ❌ Bad: Generic error
throw new Error('User not found');
```

### 2. Include Context

```typescript
// ✅ Good: Includes context
throw new NotFoundError('User not found', {
  userId: '123',
  requestedBy: currentUserId
});

// ❌ Bad: No context
throw new NotFoundError('User not found');
```

### 3. Preserve Original Errors

```typescript
// ✅ Good: Preserves cause
try {
  await database.query(sql);
} catch (error) {
  throw new DatabaseError('Query failed', error);
}

// ❌ Bad: Loses original error
try {
  await database.query(sql);
} catch (error) {
  throw new DatabaseError('Query failed');
}
```

### 4. Handle Errors at Boundaries

```typescript
// ✅ Good: Handle at HTTP boundary
app.use((error, req, res, next) => {
  if (error instanceof AppError) {
    // Handle known errors
  } else {
    // Handle unknown errors
  }
});

// ❌ Bad: Let errors bubble up
app.get('/users', async (req, res) => {
  const users = await userService.getAll(); // May throw
  res.json(users);
});
```

## Next Steps

- **[Result Pattern](../core-concepts/result-pattern)** - Alternative to throwing errors
- **[CQRS](../core-concepts/cqrs)** - Error handling in commands and queries
- **[DX Helpers](../core-concepts/dx-helpers)** - Using errors with helpers
