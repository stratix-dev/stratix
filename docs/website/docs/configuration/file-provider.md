---
sidebar_position: 3
---

# FileConfigProvider

File-based configuration supporting JSON and YAML with hot reload and multi-file merging.

## Installation

```bash
npm install @stratix/config-file
```

## Basic Usage

```typescript
import { FileConfigProvider } from '@stratix/config-file';

const config = new FileConfigProvider({
  files: ['./config/default.json'],
});

// Get values
const port = await config.getRequired<number>('server.port');
const host = await config.get<string>('server.host', 'localhost');
```

## Configuration Options

```typescript
interface FileConfigProviderOptions {
  // Array of file paths (in merge order)
  files: string[];

  // Skip missing files instead of throwing
  optional?: boolean; // default: false

  // Validation schema
  schema?: ConfigSchema;

  // Enable hot reload (watches for file changes)
  watch?: boolean; // default: false
}
```

## Supported Formats

### JSON

```json
// config/default.json
{
  "server": {
    "port": 3000,
    "host": "localhost"
  },
  "database": {
    "url": "postgresql://localhost/mydb",
    "poolSize": 10
  },
  "features": {
    "enableCache": true,
    "enableMetrics": false
  }
}
```

### YAML

```yaml
# config/default.yaml
server:
  port: 3000
  host: localhost

database:
  url: postgresql://localhost/mydb
  poolSize: 10

features:
  enableCache: true
  enableMetrics: false
```

## Multi-File Configuration

### Environment-Specific Files

```typescript
const nodeEnv = process.env.NODE_ENV || 'development';

const config = new FileConfigProvider({
  files: [
    './config/default.json',           // Base configuration
    `./config/${nodeEnv}.json`,        // Environment-specific
    './config/local.json',             // Local overrides (gitignored)
  ],
  optional: true, // Skip local.json if it doesn't exist
});
```

### File Structure

```
config/
├── default.json       # Base configuration
├── development.json   # Development overrides
├── staging.json       # Staging overrides
├── production.json    # Production overrides
├── test.json         # Test configuration
└── local.json        # Local overrides (gitignored)
```

### Example Files

**default.json** - Base configuration:
```json
{
  "server": {
    "port": 3000,
    "host": "localhost",
    "cors": {
      "enabled": true,
      "origins": ["http://localhost:3000"]
    }
  },
  "database": {
    "url": "postgresql://localhost:5432/devdb",
    "poolSize": 10,
    "ssl": false
  },
  "logging": {
    "level": "info",
    "format": "json"
  }
}
```

**production.json** - Production overrides:
```json
{
  "server": {
    "port": 8080,
    "host": "0.0.0.0",
    "cors": {
      "origins": ["https://myapp.com"]
    }
  },
  "database": {
    "poolSize": 50,
    "ssl": true
  },
  "logging": {
    "level": "warn"
  }
}
```

### Merge Behavior

Later files override earlier ones:

```typescript
const config = new FileConfigProvider({
  files: ['default.json', 'production.json'],
});

const result = await config.getAll();
// {
//   server: {
//     port: 8080,          // from production.json
//     host: '0.0.0.0',     // from production.json
//     cors: {
//       enabled: true,     // from default.json (not overridden)
//       origins: ['https://myapp.com'] // from production.json
//     }
//   },
//   database: {
//     url: 'postgresql://localhost:5432/devdb', // from default.json
//     poolSize: 50,        // from production.json
//     ssl: true            // from production.json
//   },
//   logging: {
//     level: 'warn',       // from production.json
//     format: 'json'       // from default.json
//   }
// }
```

## Hot Reload

### Enable Watch Mode

```typescript
const config = new FileConfigProvider({
  files: ['./config.json'],
  watch: true, // Enable hot reload
});

// Listen for changes
const unwatch = config.watch((changes) => {
  for (const change of changes) {
    console.log(`Config changed: ${change.key}`);
    console.log(`  Old: ${change.oldValue}`);
    console.log(`  New: ${change.newValue}`);
  }
});

// Later: stop watching
unwatch();
```

### React to Changes

```typescript
const config = new FileConfigProvider({
  files: ['./config/development.json'],
  watch: true,
});

config.watch?.((changes) => {
  for (const change of changes) {
    // React to specific changes
    if (change.key === 'logging.level') {
      logger.setLevel(change.newValue as LogLevel);
      console.log(`Log level updated to: ${change.newValue}`);
    }

    if (change.key === 'features.enableMetrics') {
      if (change.newValue) {
        metricsService.start();
      } else {
        metricsService.stop();
      }
    }
  }
});
```

## Validation

### With Zod

```typescript
import { z } from 'zod';
import { FileConfigProvider } from '@stratix/config-file';

const ConfigSchema = z.object({
  server: z.object({
    port: z.number().int().min(1000).max(65535),
    host: z.string(),
  }),
  database: z.object({
    url: z.string().url(),
    poolSize: z.number().int().positive(),
  }),
});

const config = new FileConfigProvider({
  files: ['./config.json'],
  schema: {
    async validate(data) {
      const result = ConfigSchema.safeParse(data);
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

// Will throw if validation fails
const validatedConfig = await config.getAll();
```

## Accessing Configuration

### Get Individual Values

```typescript
const port = await config.get<number>('server.port');
const dbUrl = await config.get<string>('database.url');
```

### Get Namespaces

```typescript
const serverConfig = await config.getNamespace('server');
// { port: 3000, host: 'localhost', cors: {...} }

const dbConfig = await config.getNamespace('database');
// { url: '...', poolSize: 10, ssl: false }
```

### Get All Configuration

```typescript
interface AppConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  features: FeatureFlags;
}

const config = await provider.getAll<AppConfig>();
```

### Required vs Optional

```typescript
// Throws if not found
const apiKey = await config.getRequired('api.key');

// Returns undefined or default
const timeout = await config.get('api.timeout', 5000);
```

## Integration with ApplicationBuilder

```typescript
import { ApplicationBuilder } from '@stratix/runtime';
import { FileConfigProvider } from '@stratix/config-file';

const nodeEnv = process.env.NODE_ENV || 'development';

const config = new FileConfigProvider({
  files: [
    './config/default.json',
    `./config/${nodeEnv}.json`,
  ],
  watch: nodeEnv === 'development', // Hot reload in dev only
});

const app = await ApplicationBuilder.create()
  .useConfig(config)
  .useContainer(container)
  .useLogger(logger)
  .build();
```

## Common Patterns

### Docker Configuration

```typescript
// Mount config directory as volume
const config = new FileConfigProvider({
  files: ['/app/config/production.json'],
  optional: false,
});
```

**docker-compose.yml:**
```yaml
services:
  app:
    volumes:
      - ./config:/app/config
```

### Kubernetes ConfigMaps

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  config.json: |
    {
      "server": {
        "port": 8080
      }
    }
```

Mount and use:
```typescript
const config = new FileConfigProvider({
  files: ['/etc/config/config.json'],
});
```

### Development vs Production

```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

const config = new FileConfigProvider({
  files: [
    './config/default.json',
    isDevelopment
      ? './config/development.json'
      : './config/production.json',
  ],
  watch: isDevelopment, // Hot reload only in dev
});
```

## Best Practices

### 1. Use Environment-Specific Files

```
config/
├── default.json      # Always loaded first
├── development.json  # Dev overrides
├── production.json   # Prod overrides
└── local.json       # Local overrides (gitignored)
```

### 2. Validate Configuration Early

```typescript
async function bootstrap() {
  try {
    const config = await configProvider.getAll();
    console.log('Configuration loaded and validated');
  } catch (error) {
    console.error('Configuration error:', error);
    process.exit(1);
  }
}
```

### 3. Use .gitignore

```gitignore
# .gitignore
config/local.json
config/secrets.json
*.env
```

### 4. Document Configuration

Create `config/README.md`:

```markdown
# Configuration Files

- `default.json` - Base configuration
- `development.json` - Development overrides
- `production.json` - Production overrides
- `local.json` - Local overrides (gitignored)

## Required Values

- `server.port` - HTTP port
- `database.url` - Database connection string
```

### 5. Use Type-Safe Interfaces

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
config.server.port; // number
```

## Troubleshooting

### File Not Found

```typescript
// Use optional for files that may not exist
const config = new FileConfigProvider({
  files: [
    './config/default.json',    // Must exist
    './config/local.json',      // May not exist
  ],
  optional: true, // Don't fail if local.json missing
});
```

### Unsupported Format

Only JSON and YAML are supported:

```typescript
// ✅ Supported
files: ['config.json', 'config.yaml', 'config.yml']

// ❌ Not supported
files: ['config.toml', 'config.ini']
```

### Watch Not Working

Ensure watch is enabled:

```typescript
const config = new FileConfigProvider({
  files: ['./config.json'],
  watch: true, // ← Enable watching
});

// Subscribe to changes
config.watch?.((changes) => {
  console.log('Changes:', changes);
});
```

## Manual Reload

```typescript
// Manually trigger reload
await config.reload();

// Useful after external config updates
```

## API Reference

### Methods

#### `get<T>(key: string, defaultValue?: T): Promise<T | undefined>`

Get configuration value with optional default.

#### `getRequired<T>(key: string): Promise<T>`

Get required configuration value. Throws if not found.

#### `getAll<T>(): Promise<T>`

Get all configuration as object.

#### `getNamespace<T>(namespace: string): Promise<T>`

Get configuration for specific namespace.

#### `has(key: string): Promise<boolean>`

Check if configuration key exists.

#### `reload(): Promise<void>`

Manually reload configuration files.

#### `watch(callback): () => void`

Watch for configuration changes. Returns unsubscribe function.

## Next Steps

- [EnvConfigProvider](./env-provider) - Environment variables
- [CompositeConfigProvider](./composite-provider) - Multiple sources
- [Validation Guide](./validation) - Schema validation
- [Best Practices](./best-practices) - Production patterns
