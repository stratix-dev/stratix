---
sidebar_position: 9
title: Secrets Management
description: Manage application secrets with caching and provider abstraction
---

# Secrets Management

Stratix provides `SecretsManager` in `@stratix/runtime` for managing application secrets with built-in caching and provider abstraction.

## Overview

`SecretsManager` is a production-ready secrets management solution that:

- ✅ **Caches secrets** - Reduces environment variable lookups with configurable TTL
- ✅ **Provider abstraction** - Designed to support multiple backends (currently environment variables)
- ✅ **Type-safe** - Full TypeScript support with strict typing
- ✅ **Zero dependencies** - Built into runtime, no additional packages needed
- ✅ **Performance optimized** - In-memory caching for high-throughput applications

## Installation

`SecretsManager` is included in `@stratix/runtime`:

```bash
npm install @stratix/runtime
```

## Basic Usage

### Creating a SecretsManager

```typescript
import { SecretsManager } from '@stratix/runtime';

const secrets = new SecretsManager({
  provider: 'environment',
  prefix: 'APP_',
  cache: true,
  cacheTTL: 300000 // 5 minutes in milliseconds
});
```

### Reading Secrets

```typescript
// Get a secret (returns undefined if not found)
const dbUrl = await secrets.get('DATABASE_URL');
// Reads from process.env.APP_DATABASE_URL

if (dbUrl) {
  console.log('Database URL:', dbUrl);
}

// Get a required secret (throws if not found)
try {
  const apiKey = await secrets.getRequired('API_KEY');
  console.log('API Key loaded');
} catch (error) {
  console.error('Missing required secret:', error.message);
}

// Check if a secret exists
const hasRedisUrl = await secrets.has('REDIS_URL');
if (hasRedisUrl) {
  console.log('Redis is configured');
}
```

## Configuration

### SecretsManagerConfig

```typescript
interface SecretsManagerConfig {
  provider: 'environment';  // Provider type (currently only 'environment')
  prefix: string;           // Prefix for environment variables
  cache: boolean;           // Enable/disable caching
  cacheTTL: number;         // Cache time-to-live in milliseconds
}
```

### Configuration Examples

#### Development (No Caching)

```typescript
const secrets = new SecretsManager({
  provider: 'environment',
  prefix: '',
  cache: false,
  cacheTTL: 0
});
```

#### Production (With Caching)

```typescript
const secrets = new SecretsManager({
  provider: 'environment',
  prefix: 'PROD_',
  cache: true,
  cacheTTL: 600000 // 10 minutes
});
```

#### Multi-Environment

```typescript
const env = process.env.NODE_ENV || 'development';

const secrets = new SecretsManager({
  provider: 'environment',
  prefix: env === 'production' ? 'PROD_' : 'DEV_',
  cache: env === 'production',
  cacheTTL: env === 'production' ? 300000 : 0
});
```

## Cache Management

### Clear Cache

```typescript
// Clear specific secret from cache
secrets.clearCache('DATABASE_URL');

// Clear entire cache
secrets.clearCache();
```

### Monitor Cache

```typescript
// Get current cache size
const cacheSize = secrets.getCacheSize();
console.log(`Cached secrets: ${cacheSize}`);
```

## Common Patterns

### Database Configuration

```typescript
import { SecretsManager } from '@stratix/runtime';

const secrets = new SecretsManager({
  provider: 'environment',
  prefix: 'DB_',
  cache: true,
  cacheTTL: 300000
});

const dbConfig = {
  host: await secrets.getRequired('HOST'),
  port: parseInt(await secrets.getRequired('PORT')),
  database: await secrets.getRequired('NAME'),
  user: await secrets.getRequired('USER'),
  password: await secrets.getRequired('PASSWORD')
};

// Reads from: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
```

### API Keys

```typescript
const secrets = new SecretsManager({
  provider: 'environment',
  prefix: 'API_',
  cache: true,
  cacheTTL: 600000 // 10 minutes
});

const openaiKey = await secrets.getRequired('OPENAI_KEY');
const stripeKey = await secrets.getRequired('STRIPE_KEY');
const twilioKey = await secrets.get('TWILIO_KEY'); // Optional
```

### Feature Flags

```typescript
const secrets = new SecretsManager({
  provider: 'environment',
  prefix: 'FEATURE_',
  cache: true,
  cacheTTL: 60000 // 1 minute for quick updates
});

const enableNewUI = (await secrets.get('NEW_UI')) === 'true';
const enableBetaFeatures = (await secrets.get('BETA')) === 'true';
```

### Singleton Pattern

```typescript
// src/infrastructure/secrets.ts
import { SecretsManager } from '@stratix/runtime';

let secretsInstance: SecretsManager | null = null;

export function getSecretsManager(): SecretsManager {
  if (!secretsInstance) {
    secretsInstance = new SecretsManager({
      provider: 'environment',
      prefix: process.env.SECRET_PREFIX || '',
      cache: process.env.NODE_ENV === 'production',
      cacheTTL: 300000
    });
  }
  return secretsInstance;
}
```

```typescript
// Usage in other files
import { getSecretsManager } from './infrastructure/secrets';

const secrets = getSecretsManager();
const apiKey = await secrets.getRequired('API_KEY');
```

## Environment Variables

### Setting Up .env Files

```bash
# .env.development
APP_DATABASE_URL=postgresql://localhost:5432/myapp_dev
APP_API_KEY=dev_key_12345
APP_REDIS_URL=redis://localhost:6379

# .env.production
APP_DATABASE_URL=postgresql://prod-db:5432/myapp
APP_API_KEY=prod_key_67890
APP_REDIS_URL=redis://prod-redis:6379
```

### Loading Environment Variables

```typescript
// Load .env file (using dotenv)
import 'dotenv/config';

import { SecretsManager } from '@stratix/runtime';

const secrets = new SecretsManager({
  provider: 'environment',
  prefix: 'APP_',
  cache: true,
  cacheTTL: 300000
});
```

## Best Practices

### 1. Use Prefixes for Organization

```typescript
// Separate concerns with prefixes
const dbSecrets = new SecretsManager({
  provider: 'environment',
  prefix: 'DB_',
  cache: true,
  cacheTTL: 300000
});

const apiSecrets = new SecretsManager({
  provider: 'environment',
  prefix: 'API_',
  cache: true,
  cacheTTL: 600000
});
```

### 2. Enable Caching in Production

```typescript
const secrets = new SecretsManager({
  provider: 'environment',
  prefix: 'APP_',
  cache: process.env.NODE_ENV === 'production',
  cacheTTL: 300000
});
```

### 3. Use getRequired for Critical Secrets

```typescript
// Fail fast if critical secrets are missing
const dbUrl = await secrets.getRequired('DATABASE_URL');
const apiKey = await secrets.getRequired('API_KEY');

// Use get() for optional secrets
const analyticsKey = await secrets.get('ANALYTICS_KEY');
```

### 4. Clear Cache on Configuration Changes

```typescript
// After updating environment variables
secrets.clearCache();

// Or clear specific secrets
secrets.clearCache('DATABASE_URL');
```

### 5. Validate Secret Format

```typescript
const dbPort = await secrets.getRequired('DB_PORT');
const port = parseInt(dbPort);

if (isNaN(port) || port < 1 || port > 65535) {
  throw new Error('Invalid DB_PORT value');
}
```

## Performance Considerations

### Cache TTL Guidelines

- **High-frequency reads**: 5-10 minutes (300000-600000ms)
- **Moderate reads**: 1-5 minutes (60000-300000ms)
- **Dynamic configs**: 30-60 seconds (30000-60000ms)
- **Development**: Disable caching (cache: false)

### Memory Usage

Each cached secret stores:
- Secret key (string)
- Secret value (string)
- Expiration timestamp (number)

For 100 secrets averaging 50 bytes each: ~5KB memory usage.

## Migration from @stratix/secrets Plugin

If you were using the old `@stratix/secrets` plugin:

### Before (Plugin)

```typescript
import { ApplicationBuilder } from '@stratix/runtime';
import { SecretsPlugin } from '@stratix/secrets';

const app = await ApplicationBuilder.create()
  .usePlugin(new SecretsPlugin())
  .withConfig({
    'secrets': {
      provider: 'environment',
      prefix: 'APP_',
      cache: true
    }
  })
  .build();

const secrets = app.resolve<SecretsManager>('secrets:manager');
```

### After (Runtime)

```typescript
import { SecretsManager } from '@stratix/runtime';

const secrets = new SecretsManager({
  provider: 'environment',
  prefix: 'APP_',
  cache: true,
  cacheTTL: 300000
});
```

## API Reference

### Methods

#### `get(key: string): Promise<string | undefined>`

Retrieves a secret value. Returns `undefined` if not found.

```typescript
const value = await secrets.get('API_KEY');
```

#### `getRequired(key: string): Promise<string>`

Retrieves a required secret value. Throws an error if not found.

```typescript
const value = await secrets.getRequired('DATABASE_URL');
```

#### `has(key: string): Promise<boolean>`

Checks if a secret exists.

```typescript
const exists = await secrets.has('OPTIONAL_KEY');
```

#### `clearCache(key?: string): void`

Clears the cache. If `key` is provided, clears only that secret.

```typescript
secrets.clearCache('API_KEY');  // Clear specific
secrets.clearCache();           // Clear all
```

#### `getCacheSize(): number`

Returns the number of cached secrets.

```typescript
const size = secrets.getCacheSize();
```

## Next Steps

- **[Configuration Management](./configuration)** - Manage application configuration
- **[Environment Setup](../getting-started/installation)** - Set up your development environment
- **[Runtime Overview](./runtime-overview)** - Learn about the runtime system
