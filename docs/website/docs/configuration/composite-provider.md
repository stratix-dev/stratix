---
sidebar_position: 4
---

# CompositeConfigProvider

Combines multiple configuration providers with flexible merge strategies for complex configuration hierarchies.

## Installation

```bash
npm install @stratix/config-composite
```

You'll also need the providers you want to combine:

```bash
npm install @stratix/config-env @stratix/config-file
```

## Basic Usage

```typescript
import { CompositeConfigProvider } from '@stratix/config-composite';
import { EnvConfigProvider } from '@stratix/config-env';
import { FileConfigProvider } from '@stratix/config-file';

const envConfig = new EnvConfigProvider({ prefix: 'APP_' });
const fileConfig = new FileConfigProvider({
  files: ['./config/default.json'],
});

const config = new CompositeConfigProvider({
  providers: [envConfig, fileConfig],
  strategy: 'first-wins', // ENV variables override file config
});

// Get values (ENV takes priority)
const port = await config.getRequired<number>('server.port');
```

## Configuration Options

```typescript
interface CompositeConfigProviderOptions {
  // Array of config providers (order matters)
  providers: ConfigProvider[];

  // Merge strategy (default: 'first-wins')
  strategy?: 'first-wins' | 'last-wins' | 'merge';

  // Validation schema
  schema?: ConfigSchema;

  // Enable caching (default: true)
  cache?: boolean;

  // Cache TTL in milliseconds (default: 5 minutes)
  cacheTTL?: number;
}
```

## Merge Strategies

### first-wins (Default)

First provider with the value wins. Best for **priority-based** configuration.

```typescript
const envConfig = new EnvConfigProvider({ prefix: 'APP_' });
const fileConfig = new FileConfigProvider({
  files: ['./config/default.json'],
});

const config = new CompositeConfigProvider({
  providers: [envConfig, fileConfig], // ENV first
  strategy: 'first-wins',
});

// Environment: APP_PORT=8080
// File: { "port": 3000 }
const port = await config.get('port'); // 8080 (from ENV)
```

**Use when:**
- Environment variables should override files
- External config takes priority over defaults
- Secrets override public config

### last-wins

Last provider with the value wins. Best for **defaults with overrides**.

```typescript
const defaultConfig = new FileConfigProvider({
  files: ['./config/defaults.json'],
});
const userConfig = new FileConfigProvider({
  files: ['./config/user.json'],
  optional: true,
});

const config = new CompositeConfigProvider({
  providers: [defaultConfig, userConfig], // User overrides defaults
  strategy: 'last-wins',
});

// defaults.json: { "theme": "light" }
// user.json: { "theme": "dark" }
const theme = await config.get('theme'); // "dark" (from user)
```

**Use when:**
- User preferences override defaults
- Local config overrides shared config
- Latest config is most important

### merge

Deep merges objects from all providers. Best for **complex hierarchies**.

```typescript
const baseConfig = new FileConfigProvider({
  files: ['./config/base.json'],
});
const envConfig = new EnvConfigProvider({ prefix: 'APP_' });

const config = new CompositeConfigProvider({
  providers: [baseConfig, envConfig],
  strategy: 'merge',
});

// base.json: { "server": { "port": 3000, "host": "localhost" } }
// ENV: APP_SERVER__PORT=8080
const server = await config.getNamespace('server');
// Result: { port: 8080, host: "localhost" }
```

**Merge behavior:**
- Objects are deeply merged
- Arrays use last-wins
- Primitives use last-wins
- Nested objects merge recursively

**Use when:**
- Combining defaults with overrides
- Partial configuration updates
- Multi-layer config hierarchies

## Common Patterns

### Environment Variables Override Files

```typescript
const fileConfig = new FileConfigProvider({
  files: [
    './config/default.json',
    './config/production.json',
  ],
});

const envConfig = new EnvConfigProvider({
  prefix: 'APP_',
  autoTransform: true,
});

const config = new CompositeConfigProvider({
  providers: [
    envConfig,    // 1st: Highest priority
    fileConfig,   // 2nd: Fallback
  ],
  strategy: 'first-wins',
});
```

**Priority:** ENV > Files

**Example:**
```bash
APP_SERVER__PORT=9000  # Overrides file config
```

### Multi-Environment Configuration

```typescript
const nodeEnv = process.env.NODE_ENV || 'development';

const baseConfig = new FileConfigProvider({
  files: ['./config/default.json'],
});

const envSpecificConfig = new FileConfigProvider({
  files: [`./config/${nodeEnv}.json`],
});

const localConfig = new FileConfigProvider({
  files: ['./config/local.json'],
  optional: true,
});

const envVars = new EnvConfigProvider({
  prefix: 'APP_',
});

const config = new CompositeConfigProvider({
  providers: [
    envVars,           // 1st: ENV variables (highest)
    localConfig,       // 2nd: Local overrides
    envSpecificConfig, // 3rd: Environment-specific
    baseConfig,        // 4th: Base defaults (lowest)
  ],
  strategy: 'first-wins',
});
```

**Priority:** ENV > local.json > {env}.json > default.json

### Secrets Separate from Config

```typescript
import { EnvSecretsProvider } from '@stratix/secrets-env';

const publicConfig = new FileConfigProvider({
  files: ['./config/public.json'],
});

const secrets = new EnvSecretsProvider({
  prefix: 'SECRET_',
});

const envConfig = new EnvConfigProvider({
  prefix: 'APP_',
});

const config = new CompositeConfigProvider({
  providers: [envConfig, publicConfig],
  strategy: 'merge',
});

// Use separately
const dbHost = await config.get('database.host');     // Public config
const dbPassword = await secrets.get('database.password'); // Secret
```

### Feature Flags with Overrides

```typescript
const defaultFlags = new FileConfigProvider({
  files: ['./config/features.json'],
});

const envFlags = new EnvConfigProvider({
  prefix: 'FEATURE_',
});

const flags = new CompositeConfigProvider({
  providers: [envFlags, defaultFlags],
  strategy: 'first-wins',
});

// features.json: { "enableNewUI": false }
// ENV: FEATURE_ENABLE_NEW_UI=true
const enableNewUI = await flags.get('enableNewUI'); // true
```

### Multi-Region Configuration

```typescript
const region = process.env.AWS_REGION || 'us-east-1';

const globalConfig = new FileConfigProvider({
  files: ['./config/global.json'],
});

const regionConfig = new FileConfigProvider({
  files: [`./config/regions/${region}.json`],
});

const config = new CompositeConfigProvider({
  providers: [regionConfig, globalConfig],
  strategy: 'merge',
});

// global.json: { "database": { "poolSize": 10 } }
// us-west-2.json: { "database": { "host": "db.us-west-2.amazonaws.com" } }
const db = await config.getNamespace('database');
// Result: { poolSize: 10, host: "db.us-west-2.amazonaws.com" }
```

## Accessing Configuration

### Get Individual Values

```typescript
const port = await config.get<number>('server.port');
const host = await config.get<string>('server.host', 'localhost');
```

### Get Namespaces

```typescript
const serverConfig = await config.getNamespace('server');
// { port: 3000, host: 'localhost', ... }

const dbConfig = await config.getNamespace('database');
// { url: '...', poolSize: 10, ... }
```

### Get All Configuration

```typescript
interface AppConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  features: FeatureFlags;
}

const allConfig = await config.getAll<AppConfig>();
```

### Required vs Optional

```typescript
// Throws if not found in any provider
const apiKey = await config.getRequired('api.key');

// Returns default if not found
const timeout = await config.get('api.timeout', 5000);
```

## Validation

Validate the merged configuration from all providers:

```typescript
import { z } from 'zod';

const AppConfigSchema = z.object({
  server: z.object({
    port: z.number().int().min(1000).max(65535),
    host: z.string(),
  }),
  database: z.object({
    url: z.string().url(),
    poolSize: z.number().int().positive(),
  }),
});

const config = new CompositeConfigProvider({
  providers: [envConfig, fileConfig],
  strategy: 'merge',
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
  const validatedConfig = await config.getAll();
  // Config is valid and typed
} catch (error) {
  console.error('Configuration validation failed:', error);
  process.exit(1);
}
```

## Integration with ApplicationBuilder

```typescript
import { ApplicationBuilder } from '@stratix/runtime';
import { CompositeConfigProvider } from '@stratix/config-composite';
import { EnvConfigProvider } from '@stratix/config-env';
import { FileConfigProvider } from '@stratix/config-file';

const isDevelopment = process.env.NODE_ENV === 'development';

const fileConfig = new FileConfigProvider({
  files: ['./config/default.json', './config/production.json'],
  watch: isDevelopment,
});

const envConfig = new EnvConfigProvider({
  prefix: 'APP_',
  autoTransform: true,
});

const config = new CompositeConfigProvider({
  providers: [envConfig, fileConfig],
  strategy: 'first-wins',
});

const app = await ApplicationBuilder.create()
  .useConfig(config)
  .useContainer(container)
  .useLogger(logger)
  .build();
```

## Caching

Control caching behavior:

```typescript
const config = new CompositeConfigProvider({
  providers: [envConfig, fileConfig],
  cache: true,        // Enable caching (default)
  cacheTTL: 300000,   // 5 minutes (default)
});

// First call queries all providers
const port1 = await config.get('port'); // Queries providers

// Subsequent calls use cache (within TTL)
const port2 = await config.get('port'); // From cache

// After TTL expires, queries again
await new Promise(resolve => setTimeout(resolve, 300000));
const port3 = await config.get('port'); // Queries providers again
```

Disable caching for dynamic config:

```typescript
const config = new CompositeConfigProvider({
  providers: [dynamicProvider],
  cache: false, // Always query providers
});
```

## Advanced Examples

### Configuration with Fallback Chain

```typescript
const remoteConfig = new RemoteConfigProvider({
  url: 'https://config.example.com/api/config',
  timeout: 5000,
});

const fileConfig = new FileConfigProvider({
  files: ['./config/fallback.json'],
});

const hardcodedDefaults = new InMemoryConfigProvider({
  server: { port: 3000, host: 'localhost' },
  database: { poolSize: 10 },
});

const config = new CompositeConfigProvider({
  providers: [
    remoteConfig,        // Try remote first
    fileConfig,          // Fallback to file
    hardcodedDefaults,   // Last resort defaults
  ],
  strategy: 'first-wins',
});
```

### Per-Tenant Configuration

```typescript
const getTenantConfig = (tenantId: string) => {
  const sharedConfig = new FileConfigProvider({
    files: ['./config/shared.json'],
  });

  const tenantConfig = new FileConfigProvider({
    files: [`./config/tenants/${tenantId}.json`],
    optional: true,
  });

  const tenantEnv = new EnvConfigProvider({
    prefix: `TENANT_${tenantId.toUpperCase()}_`,
  });

  return new CompositeConfigProvider({
    providers: [tenantEnv, tenantConfig, sharedConfig],
    strategy: 'merge',
  });
};

// Usage
const enterpriseConfig = getTenantConfig('enterprise');
const basicConfig = getTenantConfig('basic');
```

### Dynamic Provider Selection

```typescript
const getConfigForEnvironment = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';

  const providers: ConfigProvider[] = [
    new FileConfigProvider({
      files: ['./config/default.json'],
    }),
  ];

  if (nodeEnv === 'production') {
    providers.unshift(
      new RemoteConfigProvider({
        url: process.env.CONFIG_SERVICE_URL!,
      })
    );
  } else {
    providers.push(
      new FileConfigProvider({
        files: ['./config/local.json'],
        optional: true,
      })
    );
  }

  providers.unshift(
    new EnvConfigProvider({ prefix: 'APP_' })
  );

  return new CompositeConfigProvider({
    providers,
    strategy: 'first-wins',
  });
};
```

## Best Practices

### 1. Order Matters

Put highest priority providers first with `first-wins`:

```typescript
// Correct: ENV overrides files
const config = new CompositeConfigProvider({
  providers: [envConfig, fileConfig],
  strategy: 'first-wins',
});

// Wrong: Files override ENV
const config = new CompositeConfigProvider({
  providers: [fileConfig, envConfig],
  strategy: 'first-wins',
});
```

### 2. Use Merge for Hierarchies

Use `merge` when combining partial configs:

```typescript
const config = new CompositeConfigProvider({
  providers: [
    new FileConfigProvider({ files: ['./config/base.json'] }),
    new FileConfigProvider({ files: ['./config/overrides.json'] }),
  ],
  strategy: 'merge', // Combine both configs
});
```

### 3. Validate After Merge

Always validate the final merged configuration:

```typescript
const config = new CompositeConfigProvider({
  providers: [envConfig, fileConfig],
  schema: AppConfigSchema, // Validates merged result
});
```

### 4. Fail Fast on Invalid Config

```typescript
async function bootstrap() {
  try {
    await config.getAll(); // Validate at startup
  } catch (error) {
    console.error('Invalid configuration:', error);
    process.exit(1);
  }
}
```

### 5. Document Provider Order

```typescript
// PRIORITY ORDER:
// 1. Environment variables (APP_*)
// 2. Local overrides (local.json, gitignored)
// 3. Environment-specific (production.json)
// 4. Base defaults (default.json)
const config = new CompositeConfigProvider({
  providers: [envConfig, localConfig, envSpecificConfig, baseConfig],
  strategy: 'first-wins',
});
```

## Troubleshooting

### Wrong Value Being Used

Check provider order and strategy:

```typescript
// Debug: Check which provider has the value
for (const provider of providers) {
  const value = await provider.get('key');
  console.log('Provider:', provider.constructor.name, 'Value:', value);
}
```

### Merge Not Working

Ensure you're using the `merge` strategy:

```typescript
// Wrong
const config = new CompositeConfigProvider({
  providers: [provider1, provider2],
  strategy: 'first-wins', // Only uses first provider's value
});

// Correct
const config = new CompositeConfigProvider({
  providers: [provider1, provider2],
  strategy: 'merge', // Combines both
});
```

### Performance Issues

Enable caching:

```typescript
const config = new CompositeConfigProvider({
  providers: [slowRemoteProvider, fileProvider],
  cache: true,      // Cache results
  cacheTTL: 300000, // 5 minutes
});
```

### Provider Errors

Handle provider failures gracefully:

```typescript
class SafeConfigProvider implements ConfigProvider {
  constructor(private inner: ConfigProvider) {}

  async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    try {
      return await this.inner.get(key, defaultValue);
    } catch (error) {
      console.error(`Provider error for key ${key}:`, error);
      return defaultValue;
    }
  }
  // ... implement other methods
}

const config = new CompositeConfigProvider({
  providers: [
    new SafeConfigProvider(remoteProvider),
    fileProvider,
  ],
});
```

## Comparison with Individual Providers

| Aspect | EnvConfigProvider | FileConfigProvider | CompositeConfigProvider |
|--------|------------------|-------------------|------------------------|
| **Sources** | ENV variables | JSON/YAML files | Multiple providers |
| **Priority** | N/A | Last file wins | Configurable strategy |
| **Hot reload** | No | Yes (optional) | If providers support it |
| **Validation** | Yes | Yes | Yes (on merged result) |
| **Best for** | Production ENV | Dev/staging | Enterprise/complex setups |

## API Reference

### Methods

#### `get<T>(key: string, defaultValue?: T): Promise<T | undefined>`

Get configuration value from providers based on strategy.

#### `getRequired<T>(key: string): Promise<T>`

Get required configuration value. Throws if not found in any provider.

#### `getAll<T>(): Promise<T>`

Get all configuration merged from all providers.

#### `getNamespace<T>(namespace: string): Promise<T>`

Get configuration namespace merged from all providers.

#### `has(key: string): Promise<boolean>`

Check if any provider has the configuration key.

## Next Steps

- [EnvConfigProvider](./env-provider) - Environment variables
- [FileConfigProvider](./file-provider) - JSON/YAML files
- [Validation Guide](./validation) - Schema validation
- [Best Practices](./best-practices) - Production patterns
