---
sidebar_position: 4
title: Validation Providers
description: Schema validation providers for Stratix
---

# Validation Providers

Validation Providers implement the `Validator` interface from `@stratix/core`, enabling type-safe schema validation throughout your Stratix application.

## Zod Validator

**Package:** `@stratix/validation-zod`

Zod-based schema validation with convenient helper functions.

### Installation

```bash
npm install @stratix/validation-zod
```

Or using the CLI:

```bash
stratix add validation
```

### Features

- ✅ **Type-safe validation** with Zod schemas
- ✅ **Helper functions** for common patterns
- ✅ **Async validation** support
- ✅ **Result pattern** integration
- ✅ **Custom error messages**

### Quick Start

```typescript
import { validateOrThrow, z } from '@stratix/validation-zod';

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  age: z.number().int().positive()
});

// Throws ValidationErrorException if invalid
const user = validateOrThrow(userSchema, {
  email: 'user@example.com',
  name: 'John',
  age: 30
});
```

### Helper Functions

#### validateOrThrow

Validates and throws `ValidationErrorException` on failure:

```typescript
import { validateOrThrow, z } from '@stratix/validation-zod';

const schema = z.object({ email: z.string().email() });

try {
  const data = validateOrThrow(schema, input);
} catch (error) {
  if (error instanceof ValidationErrorException) {
    console.error(error.errors);
  }
}
```

#### validateWithResult

Returns a `Result` object instead of throwing:

```typescript
import { validateWithResult, z } from '@stratix/validation-zod';

const schema = z.object({ age: z.number().int() });
const result = validateWithResult(schema, { age: 25 });

if (result.isSuccess) {
  console.log('Valid:', result.value);
} else {
  console.error('Errors:', result.error);
}
```

#### Other Helpers

- `validateOrThrowAsync` - Async version of validateOrThrow
- `validateWithResultAsync` - Async version of validateWithResult
- `validate` - Returns boolean
- `validateAsync` - Async boolean validation

### Usage Patterns

#### In Value Objects

```typescript
import { ValueObject } from '@stratix/core';
import { validateOrThrow, z } from '@stratix/validation-zod';

export class Email extends ValueObject<string> {
  private static schema = z.string().email();

  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Email {
    const validated = validateOrThrow(this.schema, value);
    return new Email(validated);
  }
}
```

#### In Commands

```typescript
import { Command } from '@stratix/core';
import { validateOrThrow, z } from '@stratix/validation-zod';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8)
});

export class CreateUserCommand extends Command {
  constructor(
    public readonly email: string,
    public readonly name: string,
    public readonly password: string
  ) {
    super();
    validateOrThrow(createUserSchema, { email, name, password });
  }
}
```

#### In HTTP Routes

```typescript
import { validateOrThrow, z } from '@stratix/validation-zod';

const createUserBodySchema = z.object({
  email: z.string().email(),
  name: z.string().min(2)
});

app.post('/users', async (req, res) => {
  try {
    const body = validateOrThrow(createUserBodySchema, req.body);
    const user = await userService.create(body);
    res.status(201).json(user);
  } catch (error) {
    if (error instanceof ValidationErrorException) {
      res.status(400).json({ errors: error.errors });
    }
  }
});
```

## Validator Interface

All validation providers implement the `Validator` interface:

```typescript
interface Validator<TSchema> {
  validate<T>(schema: TSchema, data: unknown): T;
  validateAsync<T>(schema: TSchema, data: unknown): Promise<T>;
}
```

## Why Validation is a Provider

`@stratix/validation-zod` is classified as a **provider** (not a library) because:

1. **External Dependency**: Wraps the Zod library
2. **Interface Implementation**: Implements the `Validator` interface
3. **Swappable**: Could be replaced with other validators (Yup, Joi, etc.)
4. **Not Pure**: Depends on external validation logic

This is consistent with other providers like AI providers (wrap OpenAI/Anthropic) and DI providers (wrap Awilix).

## Creating Custom Validation Providers

To create your own validation provider:

```typescript
import type { Validator } from '@stratix/core';
import Joi from 'joi';

export class JoiValidator implements Validator<Joi.Schema> {
  validate<T>(schema: Joi.Schema, data: unknown): T {
    const result = schema.validate(data);
    
    if (result.error) {
      throw new ValidationError(result.error.message);
    }
    
    return result.value as T;
  }

  async validateAsync<T>(schema: Joi.Schema, data: unknown): Promise<T> {
    const result = await schema.validateAsync(data);
    return result as T;
  }
}
```

## Best Practices

### 1. Define Schemas Once

```typescript
// schemas/user.schemas.ts
export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2)
});

export const updateUserSchema = createUserSchema.partial();
```

### 2. Use Type Inference

```typescript
const userSchema = z.object({
  email: z.string().email(),
  name: z.string()
});

type User = z.infer<typeof userSchema>;
```

### 3. Validate at Boundaries

```typescript
// ✅ Good: Validate at HTTP boundary
app.post('/users', (req, res) => {
  const body = validateOrThrow(schema, req.body);
});

// ❌ Bad: Trust input
app.post('/users', (req, res) => {
  const user = await userService.create(req.body);
});
```

## Next Steps

- **[Error Handling](../libraries/error-handling)** - Handle validation errors
- **[Value Objects](../core-concepts/domain-modeling)** - Use validation in VOs
- **[CQRS](../core-concepts/cqrs)** - Validate commands and queries
