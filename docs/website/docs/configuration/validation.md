---
sidebar_position: 5
---

# Configuration Validation

Ensure your configuration is valid and type-safe using schema validation.

## Why Validate Configuration?

Configuration errors are a leading cause of application failures:

- Typos in config keys
- Wrong data types
- Missing required values
- Invalid URLs or connection strings
- Out-of-range values

**Validating at startup** catches these errors before they cause runtime failures.

## Validation Interface

All configuration providers support the `ConfigSchema` interface:

```typescript
interface ConfigSchema<T = unknown> {
  validate(data: unknown): Promise<ValidationResult<T>>;
}

type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] };

interface ValidationError {
  path: string;
  message: string;
}
```

## Using Zod (Recommended)

[Zod](https://zod.dev) is a TypeScript-first schema validation library.

### Installation

```bash
npm install zod
```

### Basic Validation

```typescript
import { z } from 'zod';
import { EnvConfigProvider } from '@stratix/config-env';

const AppConfigSchema = z.object({
  port: z.number().int().min(1000).max(65535),
  host: z.string().default('localhost'),
  nodeEnv: z.enum(['development', 'staging', 'production']),
});

const config = new EnvConfigProvider({
  prefix: 'APP_',
  schema: {
    async validate(data) {
      const result = AppConfigSchema.safeParse(data);
      if (result.success) {
        return { success: true, data: result.data };
      }
      return {
        success: false,
        errors: result.error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      };
    },
  },
});
```

### Complex Validation

```typescript
const DatabaseConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive(),
  name: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(8),
  ssl: z.boolean().default(false),
  pool: z.object({
    min: z.number().int().nonnegative().default(2),
    max: z.number().int().positive().default(10),
  }).refine(
    (pool) => pool.min < pool.max,
    { message: 'Pool min must be less than max' }
  ),
});

const ServerConfigSchema = z.object({
  port: z.number().int().min(1000).max(65535),
  host: z.string().ip().or(z.string().regex(/^localhost$/)),
  cors: z.object({
    enabled: z.boolean(),
    origins: z.array(z.string().url()),
  }),
});

const AppConfigSchema = z.object({
  nodeEnv: z.enum(['development', 'staging', 'production']),
  server: ServerConfigSchema,
  database: DatabaseConfigSchema,
  features: z.record(z.boolean()),
});

type AppConfig = z.infer<typeof AppConfigSchema>;

const config = new FileConfigProvider({
  files: ['./config/production.json'],
  schema: {
    async validate(data) {
      const result = AppConfigSchema.safeParse(data);
      if (result.success) {
        return { success: true, data: result.data };
      }
      return {
        success: false,
        errors: result.error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      };
    },
  },
});

// Fully typed
const appConfig = await config.getAll<AppConfig>();
```

### Conditional Validation

```typescript
const ConfigSchema = z.object({
  nodeEnv: z.enum(['development', 'production']),
  database: z.object({
    url: z.string().url(),
    ssl: z.boolean(),
  }),
}).refine(
  (config) => {
    // Require SSL in production
    if (config.nodeEnv === 'production' && !config.database.ssl) {
      return false;
    }
    return true;
  },
  {
    message: 'SSL is required in production',
    path: ['database', 'ssl'],
  }
);
```

### Transformations

Zod can transform values during validation:

```typescript
const ConfigSchema = z.object({
  // Transform to lowercase
  nodeEnv: z.string().toLowerCase().pipe(
    z.enum(['development', 'staging', 'production'])
  ),

  // Parse URL string to URL object
  apiUrl: z.string().url().transform(url => new URL(url)),

  // Convert seconds to milliseconds
  timeout: z.number().transform(sec => sec * 1000),

  // Parse comma-separated string to array
  allowedOrigins: z.string().transform(str => str.split(',')),
});
```

## Using Other Validation Libraries

### Joi

```bash
npm install joi
```

```typescript
import Joi from 'joi';

const joiSchema = Joi.object({
  port: Joi.number().integer().min(1000).max(65535).required(),
  host: Joi.string().default('localhost'),
  nodeEnv: Joi.string().valid('development', 'staging', 'production').required(),
});

const config = new EnvConfigProvider({
  prefix: 'APP_',
  schema: {
    async validate(data) {
      const result = joiSchema.validate(data, { abortEarly: false });
      if (!result.error) {
        return { success: true, data: result.value };
      }
      return {
        success: false,
        errors: result.error.details.map(detail => ({
          path: detail.path.join('.'),
          message: detail.message,
        })),
      };
    },
  },
});
```

### Yup

```bash
npm install yup
```

```typescript
import * as yup from 'yup';

const yupSchema = yup.object({
  port: yup.number().integer().min(1000).max(65535).required(),
  host: yup.string().default('localhost'),
  nodeEnv: yup.string().oneOf(['development', 'staging', 'production']).required(),
});

const config = new EnvConfigProvider({
  prefix: 'APP_',
  schema: {
    async validate(data) {
      try {
        const validated = await yupSchema.validate(data, { abortEarly: false });
        return { success: true, data: validated };
      } catch (error) {
        if (error instanceof yup.ValidationError) {
          return {
            success: false,
            errors: error.inner.map(err => ({
              path: err.path || '',
              message: err.message,
            })),
          };
        }
        throw error;
      }
    },
  },
});
```

### Custom Validation

```typescript
interface CustomConfigSchema extends ConfigSchema {
  validate(data: unknown): Promise<ValidationResult<AppConfig>>;
}

const customSchema: CustomConfigSchema = {
  async validate(data) {
    const errors: ValidationError[] = [];
    const config = data as Record<string, unknown>;

    // Validate port
    if (typeof config.port !== 'number' || config.port < 1000 || config.port > 65535) {
      errors.push({
        path: 'port',
        message: 'Port must be a number between 1000 and 65535',
      });
    }

    // Validate host
    if (typeof config.host !== 'string' || config.host.length === 0) {
      errors.push({
        path: 'host',
        message: 'Host must be a non-empty string',
      });
    }

    // Validate nodeEnv
    const validEnvs = ['development', 'staging', 'production'];
    if (!validEnvs.includes(config.nodeEnv as string)) {
      errors.push({
        path: 'nodeEnv',
        message: `nodeEnv must be one of: ${validEnvs.join(', ')}`,
      });
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return { success: true, data: config as AppConfig };
  },
};
```

## Validation Timing

### At Provider Creation

Validation happens when you call `getAll()` for the first time:

```typescript
const config = new EnvConfigProvider({
  prefix: 'APP_',
  schema: AppConfigSchema,
});

// Validation happens here
try {
  const appConfig = await config.getAll();
  console.log('Configuration is valid');
} catch (error) {
  if (error instanceof ConfigValidationError) {
    console.error('Validation failed:');
    for (const err of error.errors) {
      console.error(`  ${err.path}: ${err.message}`);
    }
  }
  process.exit(1);
}
```

### Early Validation at Startup

```typescript
async function bootstrap() {
  const config = new EnvConfigProvider({
    prefix: 'APP_',
    schema: AppConfigSchema,
  });

  // Validate immediately
  try {
    await config.getAll();
    console.log('Configuration validated successfully');
  } catch (error) {
    console.error('Invalid configuration:', error);
    process.exit(1);
  }

  // Start application with valid config
  const app = await ApplicationBuilder.create()
    .useConfig(config)
    .build();

  await app.start();
}

bootstrap();
```

## Error Handling

### ConfigValidationError

When validation fails, providers throw `ConfigValidationError`:

```typescript
import { ConfigValidationError } from '@stratix/core';

try {
  await config.getAll();
} catch (error) {
  if (error instanceof ConfigValidationError) {
    console.error('Configuration validation failed:');
    console.error(`  Message: ${error.message}`);
    console.error('  Errors:');
    for (const err of error.errors) {
      console.error(`    - ${err.path}: ${err.message}`);
    }
  }
}
```

### Graceful Degradation

```typescript
async function loadConfigWithFallback() {
  try {
    const config = new EnvConfigProvider({
      prefix: 'APP_',
      schema: AppConfigSchema,
    });
    return await config.getAll();
  } catch (error) {
    console.warn('Failed to load config, using defaults:', error);
    return getDefaultConfig();
  }
}
```

## Validation Patterns

### Required vs Optional Fields

```typescript
const ConfigSchema = z.object({
  // Required fields
  apiKey: z.string().min(1),
  databaseUrl: z.string().url(),

  // Optional fields with defaults
  port: z.number().default(3000),
  host: z.string().default('localhost'),

  // Optional fields (may be undefined)
  enableMetrics: z.boolean().optional(),
  cacheTTL: z.number().optional(),
});
```

### Environment-Specific Validation

```typescript
const getConfigSchema = (nodeEnv: string) => {
  const baseSchema = z.object({
    port: z.number().int().positive(),
    host: z.string(),
  });

  if (nodeEnv === 'production') {
    return baseSchema.extend({
      database: z.object({
        url: z.string().url(),
        ssl: z.literal(true), // SSL required in production
        poolSize: z.number().min(20), // Larger pool in production
      }),
    });
  }

  return baseSchema.extend({
    database: z.object({
      url: z.string().url(),
      ssl: z.boolean().default(false),
      poolSize: z.number().default(5),
    }),
  });
};

const config = new EnvConfigProvider({
  prefix: 'APP_',
  schema: {
    async validate(data) {
      const nodeEnv = (data as any).nodeEnv || 'development';
      const schema = getConfigSchema(nodeEnv);
      const result = schema.safeParse(data);
      // ... return result
    },
  },
});
```

### Secrets Validation

```typescript
const SecretsSchema = z.object({
  apiKey: z.string().min(32).regex(/^[A-Za-z0-9]+$/),
  databasePassword: z.string().min(16),
  jwtSecret: z.string().min(32),
}).refine(
  (secrets) => {
    // Ensure secrets are not placeholder values
    return !Object.values(secrets).some(val =>
      val.includes('REPLACE_ME') || val.includes('TODO')
    );
  },
  { message: 'Secrets contain placeholder values' }
);
```

### Cross-Field Validation

```typescript
const ConfigSchema = z.object({
  enableCache: z.boolean(),
  cacheUrl: z.string().url().optional(),
  cacheTTL: z.number().optional(),
}).refine(
  (config) => {
    // If cache is enabled, cacheUrl is required
    if (config.enableCache && !config.cacheUrl) {
      return false;
    }
    return true;
  },
  {
    message: 'cacheUrl is required when enableCache is true',
    path: ['cacheUrl'],
  }
);
```

## Testing Validation

### Valid Configuration

```typescript
import { describe, it, expect } from 'vitest';

describe('Config Validation', () => {
  it('should accept valid configuration', async () => {
    const config = new EnvConfigProvider({
      env: {
        'APP_PORT': '3000',
        'APP_HOST': 'localhost',
        'APP_NODE_ENV': 'development',
      },
      prefix: 'APP_',
      loadDotenv: false,
      schema: {
        async validate(data) {
          const result = AppConfigSchema.safeParse(data);
          if (result.success) {
            return { success: true, data: result.data };
          }
          return {
            success: false,
            errors: result.error.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          };
        },
      },
    });

    const appConfig = await config.getAll();
    expect(appConfig.port).toBe(3000);
  });
});
```

### Invalid Configuration

```typescript
it('should reject invalid configuration', async () => {
  const config = new EnvConfigProvider({
    env: {
      'APP_PORT': 'not-a-number', // Invalid
      'APP_HOST': 'localhost',
    },
    prefix: 'APP_',
    loadDotenv: false,
    schema: AppConfigSchema,
  });

  await expect(config.getAll()).rejects.toThrow(ConfigValidationError);
});
```

### Validation Error Messages

```typescript
it('should provide detailed error messages', async () => {
  const config = new EnvConfigProvider({
    env: {
      'APP_PORT': '-1', // Out of range
    },
    prefix: 'APP_',
    loadDotenv: false,
    schema: AppConfigSchema,
  });

  try {
    await config.getAll();
    fail('Should have thrown');
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigValidationError);
    const validationError = error as ConfigValidationError;
    expect(validationError.errors).toHaveLength(1);
    expect(validationError.errors[0].path).toBe('port');
  }
});
```

## Best Practices

### 1. Validate at Startup

Always validate configuration before starting your application:

```typescript
async function main() {
  // Validate first
  try {
    await config.getAll();
  } catch (error) {
    console.error('Configuration error:', error);
    process.exit(1);
  }

  // Then start
  await app.start();
}
```

### 2. Use Type Inference

Let TypeScript infer types from your schema:

```typescript
const ConfigSchema = z.object({
  port: z.number(),
  host: z.string(),
});

type AppConfig = z.infer<typeof ConfigSchema>;

const config = await provider.getAll<AppConfig>();
// config is fully typed
```

### 3. Provide Helpful Error Messages

```typescript
const ConfigSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  port: z.number()
    .min(1000, 'Port must be >= 1000')
    .max(65535, 'Port must be <= 65535'),
});
```

### 4. Document Required Variables

Create a `.env.example` file:

```bash
# Required
APP_API_KEY=your-api-key-here
APP_DATABASE_URL=postgresql://localhost:5432/mydb

# Optional (with defaults)
APP_PORT=3000
APP_HOST=localhost
APP_NODE_ENV=development
```

### 5. Fail Fast

Don't continue if configuration is invalid:

```typescript
const config = await configProvider.getAll(); // Throws if invalid
// If we reach here, config is guaranteed valid
```

## Next Steps

- [EnvConfigProvider](./env-provider) - Environment variables
- [FileConfigProvider](./file-provider) - JSON/YAML files
- [CompositeConfigProvider](./composite-provider) - Multiple sources
- [Best Practices](./best-practices) - Production patterns
