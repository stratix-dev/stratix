---
sidebar_position: 3
title: Official Plugins
description: Official Stratix plugins and extensions
---

# Official Plugins

Stratix provides official plugins for common infrastructure needs.

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

### @stratix/http-express

HTTP server using Express (not yet available).

```bash
# Coming soon
stratix add http-express
```

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

### @stratix/redis

Redis caching and pub/sub.

```bash
stratix add redis
```

## AI Providers

### @stratix/ai-openai

OpenAI integration (GPT-4, GPT-3.5).

```bash
stratix add ai-openai
```

**Features:**
- Chat completion
- Streaming
- Function calling
- Embeddings
- Cost tracking

**[Documentation](../ai-agents/llm-providers)**

### @stratix/ai-anthropic

Anthropic Claude integration.

```bash
stratix add ai-anthropic
```

## Message Queues

### @stratix/rabbitmq

RabbitMQ message broker.

```bash
stratix add rabbitmq
```

## Dependency Injection

### @stratix/di-awilix

Awilix DI container (recommended).

```bash
stratix add awilix
```

**[Documentation](../core-concepts/dependency-injection)**

## Utilities

### @stratix/validation-zod

Schema validation with Zod.

```bash
stratix add validation
```

### @stratix/mappers

Entity-to-DTO mapping utilities.

```bash
stratix add mappers
```

### @stratix/auth

JWT authentication and RBAC authorization.

```bash
stratix add auth
```

### @stratix/errors

Structured error handling.

```bash
stratix add errors
```

### @stratix/secrets

Secrets management.

```bash
stratix add secrets
```

## Observability

### @stratix/obs-opentelemetry

OpenTelemetry integration for observability.

```bash
stratix add opentelemetry
```

## Testing

### @stratix/testing

Testing utilities and mocks.

```bash
# Note: Use full package name for testing package
npm install --save-dev @stratix/testing
```

**Features:**
- MockLLMProvider
- AgentTester
- Test helpers

**[Documentation](../ai-agents/agent-testing)**

## Plugin Matrix

| Plugin | Status | Version | Dependencies |
|--------|--------|---------|--------------|
| http-fastify | ✅ Stable | 0.1.3 | - |
| http-express | ✅ Stable | 0.1.3 | - |
| postgres | ✅ Stable | 0.1.3 | - |
| mongodb | ✅ Stable | 0.1.3 | - |
| redis | ✅ Stable | 0.1.3 | - |
| ai-openai | ✅ Stable | 0.1.3 | - |
| ai-anthropic | ✅ Stable | 0.1.3 | - |
| rabbitmq | ✅ Stable | 0.1.3 | - |
| di-awilix | ✅ Stable | 0.1.3 | - |
| logger | ✅ Stable | 0.1.3 | - |
| validation | ✅ Stable | 0.1.3 | - |
| cache | ✅ Stable | 0.1.3 | - |
| testing | ✅ Stable | 0.1.3 | - |

## Next Steps

- **[Creating Plugins](./creating-plugins)** - Build your own
- **[Plugin Configuration](./plugin-configuration)** - Configuration guide
- **[add Command](../cli/add-command)** - Install plugins
