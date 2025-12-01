---
sidebar_position: 1
title: Libraries Overview
description: Utility libraries for Stratix applications
---

# Libraries Overview

Libraries are **pure utility packages** that provide reusable functions, classes, and interfaces without managing external resources or having a lifecycle.

## Libraries vs Plugins vs Providers

| Aspect        | Libraries                         | Plugins                                    | Providers                          |
| ------------- | --------------------------------- | ------------------------------------------ | ---------------------------------- |
| **Purpose**   | Provide utility functions/classes | Extend application with external resources | Implement core interfaces          |
| **Lifecycle** | No                                | Yes (initialize -> start -> stop)          | No                                 |
| **State**     | Stateless                         | Stateful                                   | Can be stateful                    |
| **Usage**     | Direct import                     | Via runtime plugin system                  | Direct instantiation               |
| **Examples**  | Utility functions, helpers        | PostgresPlugin, FastifyHTTPPlugin          | AnthropicProvider, AwilixContainer |

## When to Use Libraries

Use libraries when you need:

- **Utility functions** without side effects
- **Reusable classes** like error types or validators
- **Type definitions** and interfaces
- **Helper functions** for common tasks
- **No external resources** or lifecycle management

## Available Libraries

Currently, there are no standalone library packages in Stratix. Utility functions and classes are provided directly by `@stratix/core` and `@stratix/runtime`.

For error handling, use:
- **`DomainError`** from `@stratix/core` - For business rule violations
- **`RuntimeError`** from `@stratix/runtime` - For runtime errors

---

## Best Practices

### 1. Keep Libraries Pure

Libraries should be stateless and side-effect free:

```typescript
// ✅ Good: Pure utility function
export function formatDate(date: Date): string {
  return date.toISOString();
}

// ❌ Bad: Stateful library
let cache = {};
export function getCached(key: string) {
  return cache[key];
}
```

### 2. Use TypeScript for Type Safety

Libraries should provide strong typing:

```typescript
// ✅ Good: Strongly typed
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ❌ Bad: Weak typing
export function validate(input: any): any {
  // ...
}
```

### 3. Export Focused APIs

Keep library exports focused and well-organized:

```typescript
// index.ts
export { NotFoundError, BadRequestError } from './errors.js';
export { ErrorCode, ErrorSeverity } from './types.js';
export type { AppError } from './base.js';
```

## Creating Custom Libraries

To create your own library:

1. **Create package structure:**

```
packages/libraries/my-library/
├── src/
│   ├── index.ts
│   └── utils.ts
├── package.json
└── tsconfig.json
```

2. **Define utilities:**

```typescript
// src/utils.ts
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-');
}
```

3. **Export from index:**

```typescript
// src/index.ts
export { capitalize, slugify } from './utils.js';
```

4. **Configure package.json:**

```json
{
  "name": "@stratix/my-library",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
}
```

## Next Steps

- **[Validation](../providers/validation-providers)** - Learn about schema validation
