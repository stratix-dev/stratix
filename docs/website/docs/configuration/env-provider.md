---
sidebar_position: 2
---

# EnvConfigProvider

Environment variable-based configuration with automatic type transformation and .env file support.

## Installation

```bash
npm install @stratix/config-env
```

## Basic Usage

```typescript
import { EnvConfigProvider } from '@stratix/config-env';

const config = new EnvConfigProvider({
  prefix: 'APP_',
  autoTransform: true,
});

// Get values
const port = await config.getRequired<number>('port');
const host = await config.get<string>('host', 'localhost');
```

## Configuration Options

```typescript
interface EnvConfigProviderOptions {
  // Prefix for all environment variables
  prefix?: string;

  // Load .env file (default: true)
  loadDotenv?: boolean;

  // Path to .env file (default: '.env')
  dotenvPath?: string;

  // Enable auto-transformation (default: true)
  autoTransform?: boolean;

  // Custom environment object (for testing)
  env?: Record<string, string | undefined>;

  // Validation schema
  schema?: ConfigSchema;

  // Enable caching (default: true)
  cache?: boolean;

  // Cache TTL in milliseconds
  cacheTTL?: number;

  // Custom transformers for specific keys
  transformers?: Record<string, (value: string) => unknown>;
}
```

## Environment Variables

### Naming Convention

With prefix `APP_`:

```bash
APP_PORT=3000
APP_HOST=localhost
APP_DEBUG=true
```

Access without prefix:

```typescript
const port = await config.get('port'); // Gets APP_PORT
```

### Nested Objects

Use double underscores (`__`) to create nested objects:

```bash
APP_DATABASE__URL=postgresql://localhost:5432/mydb
APP_DATABASE__POOL__MIN=5
APP_DATABASE__POOL__MAX=20
```

Results in:

```typescript
{
  database: {
    url: 'postgresql://localhost:5432/mydb',
    pool: {
      min: 5,
      max: 20
    }
  }
}
```

Access nested values:

```typescript
const dbUrl = await config.get('database.url');
const poolSize = await config.get('database.pool.max');

// Or get entire namespace
const dbConfig = await config.getNamespace('database');
```

## Type Transformation

### Automatic Transformation

When `autoTransform: true` (default), values are automatically converted:

```bash
APP_PORT=3000                    # → number: 3000
APP_DEBUG=true                   # → boolean: true
APP_TAGS=frontend,backend,api    # → array: ['frontend', 'backend', 'api']
APP_CONFIG={"key":"value"}       # → object: { key: 'value' }
```

```typescript
const port = await config.get<number>('port'); // 3000 (number)
const debug = await config.get<boolean>('debug'); // true (boolean)
const tags = await config.get<string[]>('tags'); // ['frontend', 'backend', 'api']
```

### Supported Transformations

| Input | Output Type | Example |
|-------|-------------|---------|
| `"123"` | number | `123` |
| `"123.45"` | number | `123.45` |
| `"true"`, `"false"` | boolean | `true`, `false` |
| `"1"`, `"0"` | boolean | `true`, `false` |
| `"yes"`, `"no"` | boolean | `true`, `false` |
| `"a,b,c"` | string[] | `['a', 'b', 'c']` |
| `"[1,2,3]"` | number[] | `[1, 2, 3]` |
| `'{"key":"value"}'` | object | `{ key: 'value' }` |

### Custom Transformers

Override auto-transformation for specific keys:

```typescript
const config = new EnvConfigProvider({
  prefix: 'APP_',
  transformers: {
    // Convert seconds to milliseconds
    'timeout': (value) => parseInt(value, 10) * 1000,

    // Parse complex format
    'retries': (value) => Math.max(1, parseInt(value, 10)),

    // Custom logic
    'logLevel': (value) => value.toLowerCase(),
  },
});
```

```bash
APP_TIMEOUT=5        # → 5000 (5 * 1000)
APP_RETRIES=0        # → 1 (Math.max(1, 0))
APP_LOG_LEVEL=DEBUG  # → 'debug'
```

## .env File Support

### Loading .env Files

By default, EnvConfigProvider loads `.env` files:

```typescript
const config = new EnvConfigProvider({
  loadDotenv: true,        // default
  dotenvPath: '.env',      // default
});
```

### .env File Format

```bash
# .env
APP_PORT=3000
APP_HOST=localhost
APP_NODE_ENV=development

APP_DATABASE__URL=postgresql://localhost/dev
APP_DATABASE__POOL__SIZE=10

APP_FEATURES__CACHE=true
APP_FEATURES__METRICS=false
```

### Environment-Specific Files

Use different .env files per environment:

```typescript
const nodeEnv = process.env.NODE_ENV || 'development';

const config = new EnvConfigProvider({
  dotenvPath: `.env.${nodeEnv}`,
  prefix: 'APP_',
});
```

Files:
- `.env.development`
- `.env.staging`
- `.env.production`

## Validation

### With Zod

```typescript
import { z } from 'zod';
import { EnvConfigProvider } from '@stratix/config-env';

const AppConfigSchema = z.object({
  port: z.number().int().min(1000).max(65535),
  host: z.string().default('localhost'),
  nodeEnv: z.enum(['development', 'production', 'test']),
  database: z.object({
    url: z.string().url(),
    poolSize: z.number().int().positive().default(10),
  }),
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

// Validate at startup
try {
  const appConfig = await config.getAll();
  // Config is valid and typed
} catch (error) {
  console.error('Configuration validation failed:', error);
  process.exit(1);
}
```

### Early Validation

```typescript
async function bootstrap() {
  const config = new EnvConfigProvider({
    prefix: 'APP_',
    schema: AppConfigSchema,
  });

  // Validate immediately
  try {
    await config.getAll();
    console.log('Configuration valid');
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      console.error('Configuration errors:');
      for (const err of error.errors) {
        console.error(`  - ${err.path}: ${err.message}`);
      }
    }
    process.exit(1);
  }

  // Start application...
}
```

## Integration with ApplicationBuilder

```typescript
import { ApplicationBuilder } from '@stratix/runtime';
import { EnvConfigProvider } from '@stratix/config-env';

const config = new EnvConfigProvider({
  prefix: 'APP_',
  autoTransform: true,
});

const app = await ApplicationBuilder.create()
  .useConfig(config)
  .useContainer(container)
  .useLogger(logger)
  .usePlugins([
    // plugins can access config
  ])
  .build();
```

## Usage in Handlers

Configuration is automatically injected:

```typescript
class CreateOrderHandler implements CommandHandler<CreateOrderCommand> {
  constructor(
    private readonly config: ConfigProvider,
    private readonly repository: OrderRepository,
  ) {}

  async handle(command: CreateOrderCommand): Promise<Result<Order>> {
    // Get configuration
    const maxOrderAmount = await this.config.get<number>(
      'limits.maxOrderAmount',
      10000
    );

    const enableDiscounts = await this.config.get<boolean>(
      'features.enableDiscounts',
      false
    );

    // Use configuration...
    if (command.data.amount > maxOrderAmount) {
      return Failure.create(
        new DomainError(`Order amount exceeds limit: ${maxOrderAmount}`)
      );
    }

    // Create order...
  }
}
```

## Common Patterns

### Microservices

```typescript
const config = new EnvConfigProvider({
  prefix: 'SERVICE_',
  autoTransform: true,
});

const serviceName = await config.getRequired<string>('name');
const servicePort = await config.getRequired<number>('port');
const upstreamUrl = await config.get<string>('upstream.url');
```

```bash
SERVICE_NAME=users-service
SERVICE_PORT=3001
SERVICE_UPSTREAM__URL=http://api-gateway:8080
```

### Feature Flags

```typescript
const features = await config.getNamespace<FeatureFlags>('features');

if (features.enableNewUI) {
  // Use new UI
}

if (features.enableMetrics) {
  metricsService.start();
}
```

```bash
APP_FEATURES__ENABLE_NEW_UI=true
APP_FEATURES__ENABLE_METRICS=false
APP_FEATURES__ENABLE_CACHE=true
```

### Multi-Tenant

```typescript
const tenantId = 'enterprise';
const tenantConfig = await config.getNamespace(`tenants.${tenantId}`);

const maxUsers = tenantConfig.limits.maxUsers;
const enableAdvancedFeatures = tenantConfig.features.advanced;
```

```bash
APP_TENANTS__ENTERPRISE__LIMITS__MAX_USERS=10000
APP_TENANTS__ENTERPRISE__FEATURES__ADVANCED=true
APP_TENANTS__BASIC__LIMITS__MAX_USERS=100
APP_TENANTS__BASIC__FEATURES__ADVANCED=false
```

## Testing

### Mock Environment

```typescript
const config = new EnvConfigProvider({
  env: {
    'TEST_PORT': '3000',
    'TEST_HOST': 'localhost',
    'TEST_DEBUG': 'true',
  },
  prefix: 'TEST_',
  loadDotenv: false,
});

// Use in tests
const port = await config.get('port');
expect(port).toBe(3000);
```

### Test Different Configurations

```typescript
describe('UserService', () => {
  it('should enforce user limit from config', async () => {
    const config = new EnvConfigProvider({
      env: { 'APP_LIMITS__MAX_USERS': '100' },
      prefix: 'APP_',
      loadDotenv: false,
    });

    const service = new UserService(config);

    // Test behavior with this config...
  });
});
```

## Best Practices

### 1. Always Use Prefixes

Prevents conflicts with system variables:

```typescript
// ✅ Good
const config = new EnvConfigProvider({ prefix: 'APP_' });

// ❌ Avoid
const config = new EnvConfigProvider({ prefix: '' });
```

### 2. Validate Early

Fail fast on invalid configuration:

```typescript
async function main() {
  const config = new EnvConfigProvider({
    prefix: 'APP_',
    schema: AppConfigSchema,
  });

  // This will throw if invalid
  await config.getAll();

  // Continue with valid config
}
```

### 3. Use Type-Safe Getters

```typescript
// ✅ Good - typed
const port = await config.getRequired<number>('port');

// ❌ Avoid - untyped
const port = await config.getRequired('port');
```

### 4. Provide Defaults

```typescript
// ✅ Good - safe fallback
const timeout = await config.get('timeout', 5000);

// ❌ Risky - undefined handling needed
const timeout = await config.get('timeout');
```

### 5. Document Expected Variables

Create a `.env.example`:

```bash
# .env.example
APP_PORT=3000
APP_HOST=localhost
APP_NODE_ENV=development

APP_DATABASE__URL=postgresql://localhost:5432/mydb
APP_DATABASE__POOL__SIZE=10

APP_FEATURES__CACHE=true
APP_FEATURES__METRICS=false
```

## Troubleshooting

### Values Not Transforming

Ensure `autoTransform` is enabled:

```typescript
const config = new EnvConfigProvider({
  autoTransform: true, // ← Enable auto-transform
});
```

### Nested Objects Not Working

Use double underscores (`__`):

```bash
# ❌ Wrong
APP_DATABASE_URL=...

# ✅ Correct
APP_DATABASE__URL=...
```

### .env File Not Loading

Check the path and enable loading:

```typescript
const config = new EnvConfigProvider({
  loadDotenv: true,
  dotenvPath: '.env', // or custom path
});
```

## API Reference

See the [ConfigProvider API](https://stratix-dev.github.io/stratix/api/) for complete method documentation and type signatures.

## Next Steps

- [FileConfigProvider](./file-provider) - JSON/YAML configuration
- [CompositeConfigProvider](./composite-provider) - Multiple sources
- [Validation Guide](./validation) - Schema validation
- [Best Practices](./best-practices) - Production patterns
