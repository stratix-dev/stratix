---
sidebar_position: 3
title: Official Plugins
description: Official Stratix plugins
---

# Official Plugins

Stratix plugins are packages that implement the `Plugin` interface and manage external resources with a lifecycle (initialize → start → stop).

:::info What's the difference?
- **Plugins** 🔌 - Manage external resources, have lifecycle (this page)
- **[Providers](../providers/providers-overview)** 🔧 - Implement core interfaces (AI, DI)
- **[Libraries](../libraries/libraries-overview)** 📚 - Pure utility functions and classes
:::

## HTTP Servers

### @stratix/http-fastify

High-performance HTTP server using Fastify.

```bash
stratix add http
```

**Features:**
- Type-safe routes
- CQRS integration
- Error handling
- Schema validation
- CORS support

## Databases

### @stratix/postgres

PostgreSQL database plugin.

```bash
stratix add postgres
```

**Features:**
- Connection pooling
- Transaction support
- Query builder
- Migration support

**[Documentation](../database/postgres)**

### @stratix/mongodb

MongoDB database plugin.

```bash
stratix add mongodb
```

**[Documentation](../database/mongodb)**

### @stratix/redis

Redis caching and pub/sub.

```bash
stratix add redis
```

**[Documentation](../database/redis)**

## Message Queues

### @stratix/rabbitmq

RabbitMQ message broker.

```bash
stratix add rabbitmq
```

**Features:**
- Message publishing
- Queue consumption
- Topic exchanges
- Dead letter queues

## Observability

### @stratix/obs-opentelemetry

OpenTelemetry integration for observability.

```bash
stratix add opentelemetry
```

**Features:**
- Distributed tracing
- Metrics collection
- Log correlation
- Auto-instrumentation

## Security

### @stratix/auth

JWT authentication and RBAC authorization.

```bash
stratix add auth
```

**Features:**
- JWT token generation and validation
- Role-based access control (RBAC)
- Permission checking
- User authentication

### @stratix/secrets

Secrets management plugin.

```bash
stratix add secrets
```

**Features:**
- Environment-based secrets
- AWS Secrets Manager integration
- Azure Key Vault integration
- Secret rotation support

## Plugin Matrix

| Plugin        | Category      | Status   | Version |
| ------------- | ------------- | -------- | ------- |
| http-fastify  | HTTP          | ✅ Stable | 0.5.0   |
| postgres      | Database      | ✅ Stable | 0.5.0   |
| mongodb       | Database      | ✅ Stable | 0.5.0   |
| redis         | Database      | ✅ Stable | 0.5.0   |
| rabbitmq      | Messaging     | ✅ Stable | 0.5.0   |
| opentelemetry | Observability | ✅ Stable | 0.5.0   |
| auth          | Security      | ✅ Stable | 0.5.0   |
| secrets       | Security      | ✅ Stable | 0.5.0   |

## Looking for Providers or Libraries?

- **[AI Providers](../providers/ai-providers)** - Anthropic, OpenAI (LLM providers)
- **[DI Providers](../providers/di-providers)** - Awilix (dependency injection)
- **[Error Handling](../libraries/error-handling)** - Structured error classes
- **[Validation](../providers/validation-providers)** - Zod schema validation
- **[Mappers](../core-concepts/mapping)** - Domain-persistence mapping (now part of Core)

## Next Steps

- **[Creating Plugins](./creating-plugins)** - Build your own plugins
- **[Plugin Configuration](./plugin-configuration)** - Configuration guide
- **[add Command](../cli/add-command)** - Install plugins
