---
sidebar_position: 4
title: add Command
description: Add extensions and plugins to your project
---

# add Command

Add official and third-party extensions to your Stratix project.

## Usage

```bash
stratix add <extension> [options]
```

## Interactive Mode

```bash
stratix add
```

Browse and select from available extensions.

## Non-Interactive Mode

```bash
stratix add http
stratix add postgres --skip-install
```

The `add` command uses simplified names for official Stratix extensions. For example, `stratix add http` installs `@stratix/http-fastify`.

## Official Extensions

### HTTP Servers

```bash
# Fastify (installs @stratix/http-fastify)
stratix add http
```

### Databases

```bash
# PostgreSQL (installs @stratix/db-postgres)
stratix add postgres

# MongoDB (installs @stratix/db-mongodb)
stratix add mongodb

# Redis (installs @stratix/db-redis)
stratix add redis
```

### Configuration

```bash
# Environment variable configuration (installs @stratix/config-env)
stratix add config-env

# File-based configuration (installs @stratix/config-file)
stratix add config-file

# Composite configuration (installs @stratix/config-composite)
stratix add config-composite
```

### AI Providers

```bash
# OpenAI (installs @stratix/ai-openai)
stratix add ai-openai

# Anthropic Claude (installs @stratix/ai-anthropic)
stratix add ai-anthropic
```

### Message Queues

```bash
# RabbitMQ (installs @stratix/msg-rabbitmq)
stratix add rabbitmq
```

### Utilities

```bash
# Validation (installs @stratix/validation-zod)
stratix add validation


# Auth (installs @stratix/auth)
stratix add auth
```

### Observability

```bash
# OpenTelemetry (installs @stratix/obs-opentelemetry)
stratix add opentelemetry
```

### Dependency Injection

```bash
# Awilix (installs @stratix/di-awilix)
stratix add awilix
```

## Options

| Option           | Description                       | Default |
| ---------------- | --------------------------------- | ------- |
| `--skip-install` | Don't run package manager install | `false` |
| `--dev`          | Install as dev dependency         | `false` |
| `--exact`        | Install exact version             | `false` |

## What Happens

When you add an extension:

1. **Package Installation** - Extension is added to `package.json`
2. **Configuration** - Creates config files if needed
3. **Example Code** - Generates usage examples
4. **Documentation** - Links to extension docs

## Examples

### Add HTTP server

```bash
stratix add http
```

**Creates:**
- `src/infrastructure/http/http.plugin.ts`
- Example route in `src/infrastructure/http/routes/`

### Add database

```bash
stratix add postgres
```

**Creates:**
- `src/infrastructure/persistence/postgres.plugin.ts`
- Example repository implementation

### Add configuration provider

```bash
stratix add config-env
```

**Next steps shown:**
- Creates `.env` file example
- Import and usage example
- ApplicationBuilder integration
- Link to documentation

### Add AI provider

```bash
stratix add ai-openai
```

**Creates:**
- `src/infrastructure/ai/openai.plugin.ts`
- Example agent in `src/domain/agents/`

### Add multiple extensions

```bash
stratix add http postgres config-env ai-openai
```

## Third-Party Extensions

```bash
stratix add <package-name>
```

The CLI will:
- Install the package
- Detect if it's a Stratix plugin
- Generate basic integration code

## Extension Configuration

After adding an extension, configure it in `src/main.ts`:

```typescript
import { ApplicationBuilder } from '@stratix/runtime';
import { FastifyHTTPPlugin } from '@stratix/http-fastify';
import { PostgresPlugin } from '@stratix/db-postgres';

const app = await ApplicationBuilder.create()
  .usePlugin(new FastifyHTTPPlugin({ port: 3000 }))
  .usePlugin(new PostgresPlugin({
    host: 'localhost',
    port: 5432,
    database: 'myapp'
  }))
  .build();

await app.start();
```

## Configuration Setup

After adding a configuration provider, set it up in your application:

### Environment Variable Configuration

```bash
stratix add config-env
```

Create `.env` file:

```bash
APP_PORT=3000
APP_HOST=localhost
APP_DATABASE__URL=postgresql://localhost:5432/mydb
```

Configure in `src/main.ts`:

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
  .build();

await app.start();
```

### File-Based Configuration

```bash
stratix add config-file
```

Create `config/default.json`:

```json
{
  "server": {
    "port": 3000,
    "host": "localhost"
  },
  "database": {
    "url": "postgresql://localhost:5432/mydb"
  }
}
```

Configure in `src/main.ts`:

```typescript
import { ApplicationBuilder } from '@stratix/runtime';
import { FileConfigProvider } from '@stratix/config-file';

const config = new FileConfigProvider({
  files: ['./config/default.json'],
  watch: true, // Enable hot reload
});

const app = await ApplicationBuilder.create()
  .useConfig(config)
  .useContainer(container)
  .build();

await app.start();
```

### Composite Configuration (Multiple Sources)

```bash
stratix add config-composite
stratix add config-env
stratix add config-file
```

Configure in `src/main.ts`:

```typescript
import { ApplicationBuilder } from '@stratix/runtime';
import { CompositeConfigProvider } from '@stratix/config-composite';
import { EnvConfigProvider } from '@stratix/config-env';
import { FileConfigProvider } from '@stratix/config-file';

const config = new CompositeConfigProvider({
  providers: [
    new EnvConfigProvider({ prefix: 'APP_' }),        // Highest priority
    new FileConfigProvider({ files: ['./config/default.json'] }), // Fallback
  ],
  strategy: 'first-wins',
});

const app = await ApplicationBuilder.create()
  .useConfig(config)
  .useContainer(container)
  .build();

await app.start();
```

See [Configuration Documentation](../configuration/overview) for more details.

## Best Practices

### 1. Add Extensions Early

```bash
# Set up infrastructure first
stratix add http
stratix add postgres
stratix add awilix
```

### 2. Use Official Extensions

```bash
# Official, well-maintained
stratix add http

# Third-party, verify compatibility
stratix add some-random-plugin
```

### 3. Skip Install in CI/CD

```bash
stratix add http --skip-install
```

## Removing Extensions

To remove an extension:

```bash
# Remove package (use full package name)
npm uninstall @stratix/http-fastify

# Remove plugin registration from src/main.ts
# Remove generated files
```

## Next Steps

- **[CLI Overview](./cli-overview)** - All commands
- **[Plugin Architecture](../plugins/plugin-architecture)** - Create plugins
