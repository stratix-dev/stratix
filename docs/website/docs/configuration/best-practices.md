---
sidebar_position: 6
---

# Best Practices

Production-ready patterns for configuration management in Stratix applications.

## Configuration Strategy

### 12-Factor App Principles

Follow the [12-Factor App](https://12factor.net/config) methodology:

1. **Store config in environment** - Use ENV variables for deployment-specific config
2. **Strict separation** - Never commit secrets or environment-specific config
3. **No grouping** - Avoid environment-based config files in production

```typescript
// Good: ENV-based configuration
const config = new EnvConfigProvider({
  prefix: 'APP_',
});

// Avoid: Environment-specific files in production
const config = new FileConfigProvider({
  files: [`./config/${process.env.NODE_ENV}.json`],
});
```

### Configuration Layers

Use a layered approach with clear priorities:

```typescript
const config = new CompositeConfigProvider({
  providers: [
    // 1. Environment variables (highest priority)
    new EnvConfigProvider({ prefix: 'APP_' }),

    // 2. Environment-specific files
    new FileConfigProvider({
      files: [`./config/${nodeEnv}.json`],
      optional: true,
    }),

    // 3. Default configuration (lowest priority)
    new FileConfigProvider({
      files: ['./config/default.json'],
    }),
  ],
  strategy: 'first-wins',
});
```

## Security

### Separate Secrets from Config

Never mix secrets with public configuration:

```typescript
import { EnvSecretsProvider } from '@stratix/secrets-env';
import { EnvConfigProvider } from '@stratix/config-env';

// Public configuration
const config = new EnvConfigProvider({
  prefix: 'APP_',
});

// Sensitive data
const secrets = new EnvSecretsProvider({
  prefix: 'SECRET_',
});

// Usage
const dbHost = await config.get('database.host');     // Public
const dbPassword = await secrets.get('database.password'); // Secret
```

### Never Commit Secrets

Add to `.gitignore`:

```gitignore
# Environment files
.env
.env.local
.env.*.local

# Secret files
config/secrets.json
config/local.json
*.key
*.pem
```

### Use Secret Management Services

In production, use dedicated secret management:

```typescript
import { AwsSecretsProvider } from '@stratix/secrets-aws';
import { EnvConfigProvider } from '@stratix/config-env';

const isProd = process.env.NODE_ENV === 'production';

const secrets = isProd
  ? new AwsSecretsProvider({
      region: 'us-east-1',
      secretName: 'myapp/production',
    })
  : new EnvSecretsProvider({ prefix: 'SECRET_' });

const config = new EnvConfigProvider({ prefix: 'APP_' });
```

### Validate Secrets

Ensure secrets meet security requirements:

```typescript
import { z } from 'zod';

const SecretsSchema = z.object({
  apiKey: z.string()
    .min(32, 'API key must be at least 32 characters')
    .regex(/^[A-Za-z0-9]+$/, 'API key contains invalid characters'),

  jwtSecret: z.string()
    .min(32, 'JWT secret must be at least 32 characters'),

  databasePassword: z.string()
    .min(16, 'Database password must be at least 16 characters')
    .refine(
      (pwd) => /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd),
      'Password must contain uppercase, lowercase, and numbers'
    ),
});
```

## Validation

### Fail Fast

Validate configuration at startup:

```typescript
async function bootstrap() {
  try {
    // Validate all configuration
    await config.getAll();
    console.log('Configuration validated successfully');
  } catch (error) {
    console.error('Configuration validation failed:', error);
    process.exit(1);
  }

  // Start application
  const app = await ApplicationBuilder.create()
    .useConfig(config)
    .build();

  await app.start();
}
```

### Use Schemas

Always use schema validation in production:

```typescript
import { z } from 'zod';

const AppConfigSchema = z.object({
  nodeEnv: z.enum(['development', 'staging', 'production']),

  server: z.object({
    port: z.number().int().min(1000).max(65535),
    host: z.string(),
  }),

  database: z.object({
    url: z.string().url(),
    poolSize: z.number().int().positive(),
    ssl: z.boolean(),
  }).refine(
    (db) => {
      // Require SSL in production
      const env = process.env.NODE_ENV;
      return env !== 'production' || db.ssl === true;
    },
    { message: 'SSL is required in production' }
  ),
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

### Type Safety

Use TypeScript for type-safe configuration access:

```typescript
interface AppConfig {
  server: {
    port: number;
    host: string;
  };
  database: {
    url: string;
    poolSize: number;
  };
}

const config = await provider.getAll<AppConfig>();

// Fully typed access
const port: number = config.server.port;
```

## Environment Management

### Use .env Files for Development

```bash
# .env.development
APP_PORT=3000
APP_HOST=localhost
APP_NODE_ENV=development
APP_DATABASE__URL=postgresql://localhost:5432/devdb
APP_DATABASE__POOL__SIZE=5
```

```typescript
const config = new EnvConfigProvider({
  prefix: 'APP_',
  loadDotenv: true,
  dotenvPath: `.env.${process.env.NODE_ENV || 'development'}`,
});
```

### Document Required Variables

Create `.env.example`:

```bash
# .env.example

# Required environment variables
APP_PORT=3000
APP_HOST=localhost
APP_NODE_ENV=development

# Database configuration
APP_DATABASE__URL=postgresql://localhost:5432/mydb
APP_DATABASE__POOL__SIZE=10
APP_DATABASE__SSL=false

# Feature flags
APP_FEATURES__ENABLE_CACHE=true
APP_FEATURES__ENABLE_METRICS=false
```

### Environment-Specific Defaults

```typescript
const getDefaultConfig = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';

  const defaults = {
    development: {
      database: { poolSize: 5, ssl: false },
      logging: { level: 'debug' },
    },
    staging: {
      database: { poolSize: 20, ssl: true },
      logging: { level: 'info' },
    },
    production: {
      database: { poolSize: 50, ssl: true },
      logging: { level: 'warn' },
    },
  };

  return defaults[nodeEnv] || defaults.development;
};
```

## Performance

### Enable Caching

Cache frequently accessed values:

```typescript
const config = new EnvConfigProvider({
  prefix: 'APP_',
  cache: true,        // Enable caching
  cacheTTL: 300000,   // 5 minutes
});
```

### Load Configuration Once

Don't reload configuration unnecessarily:

```typescript
// Good: Load once at startup
const appConfig = await config.getAll();

class UserService {
  constructor(private readonly config: AppConfig) {}

  async createUser() {
    const maxUsers = this.config.limits.maxUsers;
    // Use cached config
  }
}

// Avoid: Loading on every request
class UserService {
  async createUser() {
    const maxUsers = await config.get('limits.maxUsers'); // Slow
  }
}
```

### Use Namespaces

Get entire namespaces instead of individual keys:

```typescript
// Good: One call
const dbConfig = await config.getNamespace('database');
const { host, port, username, password } = dbConfig;

// Avoid: Multiple calls
const host = await config.get('database.host');
const port = await config.get('database.port');
const username = await config.get('database.username');
const password = await config.get('database.password');
```

## Error Handling

### Provide Defaults

Use sensible defaults for optional configuration:

```typescript
const timeout = await config.get('api.timeout', 5000);
const retries = await config.get('api.retries', 3);
const enableMetrics = await config.get('features.enableMetrics', false);
```

### Required vs Optional

Be explicit about required values:

```typescript
// Required: Will throw if not found
const apiKey = await config.getRequired<string>('api.key');
const databaseUrl = await config.getRequired<string>('database.url');

// Optional: Returns undefined or default
const cacheTTL = await config.get<number>('cache.ttl', 300);
```

### Graceful Degradation

```typescript
async function initializeCache() {
  try {
    const cacheUrl = await config.get('cache.url');
    if (cacheUrl) {
      return new RedisCache(cacheUrl);
    }
  } catch (error) {
    console.warn('Cache configuration not found, using in-memory cache');
  }
  return new InMemoryCache();
}
```

### Detailed Error Messages

```typescript
try {
  await config.getAll();
} catch (error) {
  if (error instanceof ConfigValidationError) {
    console.error('Configuration validation failed:');
    for (const err of error.errors) {
      console.error(`  - ${err.path}: ${err.message}`);
    }

    // Provide guidance
    console.error('\nPlease check:');
    console.error('  1. Environment variables are set correctly');
    console.error('  2. Configuration files exist and are valid');
    console.error('  3. See .env.example for required variables');
  }
  process.exit(1);
}
```

## Testing

### Mock Configuration

```typescript
import { describe, it, expect } from 'vitest';

describe('UserService', () => {
  it('should enforce user limit from config', async () => {
    const config = new EnvConfigProvider({
      env: {
        'APP_LIMITS__MAX_USERS': '100',
      },
      prefix: 'APP_',
      loadDotenv: false,
    });

    const service = new UserService(config);
    // Test with this config
  });
});
```

### Test Configuration Validation

```typescript
describe('Config Validation', () => {
  it('should reject invalid port', async () => {
    const config = new EnvConfigProvider({
      env: { 'APP_PORT': '-1' },
      prefix: 'APP_',
      loadDotenv: false,
      schema: AppConfigSchema,
    });

    await expect(config.getAll()).rejects.toThrow(ConfigValidationError);
  });

  it('should require SSL in production', async () => {
    const config = new EnvConfigProvider({
      env: {
        'APP_NODE_ENV': 'production',
        'APP_DATABASE__SSL': 'false',
      },
      prefix: 'APP_',
      loadDotenv: false,
      schema: AppConfigSchema,
    });

    await expect(config.getAll()).rejects.toThrow('SSL is required');
  });
});
```

## Documentation

### Document Configuration

Create `docs/configuration.md`:

```markdown
# Configuration

## Environment Variables

### Required

- `APP_PORT` - HTTP server port (1000-65535)
- `APP_DATABASE__URL` - Database connection string
- `SECRET_API_KEY` - API authentication key

### Optional

- `APP_HOST` - HTTP server host (default: localhost)
- `APP_DATABASE__POOL__SIZE` - Connection pool size (default: 10)
- `APP_FEATURES__ENABLE_CACHE` - Enable caching (default: false)

## Example

See `.env.example` for a complete example.

## Validation

Configuration is validated at startup. See errors in console if validation fails.
```

### README Instructions

Include configuration setup in your README:

```markdown
## Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your settings

3. Required variables:
   - `APP_DATABASE__URL` - Database connection
   - `SECRET_API_KEY` - API key (min 32 characters)

4. Start the application:
   ```bash
   npm start
   ```
```

## Container Deployment

### Docker

Use environment variables:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

# Don't copy .env files
# Configuration comes from docker-compose or runtime

CMD ["node", "dist/index.js"]
```

**docker-compose.yml:**

```yaml
services:
  app:
    build: .
    environment:
      - NODE_ENV=production
      - APP_PORT=3000
      - APP_DATABASE__URL=postgresql://db:5432/myapp
    env_file:
      - .env.production
```

### Kubernetes

Use ConfigMaps and Secrets:

**ConfigMap:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  APP_PORT: "3000"
  APP_HOST: "0.0.0.0"
  APP_NODE_ENV: "production"
  APP_DATABASE__POOL__SIZE: "50"
```

**Secret:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  SECRET_DATABASE__PASSWORD: "my-secure-password"
  SECRET_API_KEY: "my-api-key"
```

**Deployment:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
```

## Multi-Environment Setup

### Development

```typescript
// config/development.ts
import { FileConfigProvider } from '@stratix/config-file';
import { EnvConfigProvider } from '@stratix/config-env';
import { CompositeConfigProvider } from '@stratix/config-composite';

export const config = new CompositeConfigProvider({
  providers: [
    new EnvConfigProvider({ prefix: 'APP_', loadDotenv: true }),
    new FileConfigProvider({
      files: ['./config/development.json'],
      watch: true, // Hot reload in dev
    }),
  ],
  strategy: 'first-wins',
});
```

### Production

```typescript
// config/production.ts
import { EnvConfigProvider } from '@stratix/config-env';

export const config = new EnvConfigProvider({
  prefix: 'APP_',
  loadDotenv: false, // Don't use .env files in production
  schema: ProductionConfigSchema, // Strict validation
});
```

### Configuration Factory

```typescript
// config/index.ts
export function createConfig() {
  const nodeEnv = process.env.NODE_ENV || 'development';

  switch (nodeEnv) {
    case 'production':
      return import('./production').then(m => m.config);
    case 'staging':
      return import('./staging').then(m => m.config);
    default:
      return import('./development').then(m => m.config);
  }
}
```

## Monitoring

### Log Configuration on Startup

```typescript
async function bootstrap() {
  const config = await configProvider.getAll();

  console.log('Configuration loaded:');
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(`  Port: ${config.server.port}`);
  console.log(`  Database: ${sanitizeUrl(config.database.url)}`);

  // Don't log secrets
}

function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.password = '***';
    return parsed.toString();
  } catch {
    return '***';
  }
}
```

### Health Checks

```typescript
class ConfigHealthCheck implements HealthCheck {
  constructor(private readonly config: ConfigProvider) {}

  async check(): Promise<HealthCheckResult> {
    try {
      await this.config.has('server.port');
      return {
        status: 'healthy',
        details: { config: 'loaded' },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { config: 'failed', error: String(error) },
      };
    }
  }
}
```

## Summary

Key best practices:

1. **Security**: Separate secrets from config, never commit sensitive data
2. **Validation**: Use schemas, validate at startup, fail fast
3. **Type Safety**: Use TypeScript interfaces and type inference
4. **Defaults**: Provide sensible defaults for optional values
5. **Documentation**: Document required variables and provide examples
6. **Testing**: Mock configuration in tests
7. **Performance**: Cache frequently accessed values
8. **Containers**: Use ENV variables, ConfigMaps, and Secrets
9. **Monitoring**: Log configuration (sanitized) and implement health checks

## Next Steps

- [EnvConfigProvider](./env-provider) - Environment variables
- [FileConfigProvider](./file-provider) - JSON/YAML files
- [CompositeConfigProvider](./composite-provider) - Multiple sources
- [Validation Guide](./validation) - Schema validation
