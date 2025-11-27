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

# Errors (installs @stratix/errors)
stratix add errors

# Secrets (installs @stratix/secrets)
stratix add secrets
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

### Add AI provider

```bash
stratix add ai-openai
```

**Creates:**
- `src/infrastructure/ai/openai.plugin.ts`
- Example agent in `src/domain/agents/`

### Add multiple extensions

```bash
stratix add http postgres ai-openai
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
import { PostgresPlugin } from '@stratix/postgres';

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
