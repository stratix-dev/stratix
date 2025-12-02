---
sidebar_position: 3
title: Quick Start
description: Build your first Stratix application in 2 minutes
---

# Quick Start

Build a complete CRUD API with Stratix in just **2 minutes**. This tutorial will guide you through creating a product management system with zero manual code.

## What You'll Build

A REST API for managing products with:
- Domain entities and repositories
- CQRS commands and queries
- HTTP endpoints (POST, GET, GET/:id)
- Type-safe error handling
- In-memory storage

**All generated automatically** - no manual coding required!

---

## Step 1: Create Project with HTTP

Create un proyecto multi-context con el plugin HTTP preinstalado:

```bash
stratix new product-api --structure multi-context --with http
cd product-api
```

**What this does:**
- Creates a new Stratix project
- Installs `@stratix/http-fastify` and dependencies
- Sets up TypeScript, ESLint, and Prettier
- Initializes git repository

---

## Step 2: Generate Context with HTTP Routes

Generate a complete Product context with HTTP routes:

> The `context` generator assumes a multi-context project structure (created with `--structure multi-context`).
> Props are passed as a JSON array of `{ name, type }` objects.

```bash
stratix generate context Product \
  --props '[{"name":"name","type":"string"},{"name":"price","type":"number"},{"name":"stock","type":"number"}]' \
  --with-http
```

**What this generates:**
- ✅ `Product` entity (aggregate root)
- ✅ `ProductRepository` interface
- ✅ `InMemoryProductRepository` implementation
- ✅ `CreateProductCommand` + handler
- ✅ `GetProductByIdQuery` + handler
- ✅ `ListProductsQuery` + handler
- ✅ **HTTP routes** (POST, GET, GET/:id)

**Generated structure:**
```
src/contexts/product/
├── domain/
│   ├── entities/Product.ts
│   └── repositories/ProductRepository.ts
├── application/
│   ├── commands/
│   │   ├── CreateProduct.ts
│   │   └── CreateProductHandler.ts
│   └── queries/
│       ├── GetProductById.ts
│       ├── GetProductByIdHandler.ts
│       ├── ListProducts.ts
│       └── ListProductsHandler.ts
├── infrastructure/
│   ├── repositories/InMemoryProductRepository.ts
│   └── http/ProductRoutes.ts  ← Generated with --with-http
└── index.ts
```

---

## Step 3: Configure and Run

Update `src/index.ts` to register the routes:

```typescript
import { ApplicationBuilder } from '@stratix/runtime';
import { AwilixContainer } from '@stratix/di-awilix';
import { ConsoleLogger, InMemoryCommandBus, InMemoryQueryBus } from '@stratix/core';
import { FastifyHTTPPlugin } from '@stratix/http-fastify';
import { registerProductRoutes } from './contexts/product/infrastructure/http/ProductRoutes.js';

async function bootstrap() {
  // Create buses
  const commandBus = new InMemoryCommandBus();
  const queryBus = new InMemoryQueryBus();
  
  // Create HTTP plugin
  const httpPlugin = new FastifyHTTPPlugin({ port: 3000 });
  
  // Register routes
  registerProductRoutes(httpPlugin, commandBus, queryBus);
  
  // Build application
  const app = await ApplicationBuilder.create()
    .useContainer(new AwilixContainer())
    .useLogger(new ConsoleLogger())
    .usePlugin(httpPlugin)
    .build();
  
  // Start application
  await app.start();
  
  console.log('Server running on http://localhost:3000');
}

bootstrap().catch(console.error);
```

**Run the server:**

```bash
npm run dev
```

You should see:
```
Server running on http://localhost:3000
```

---

## Test Your API

### Create a Product

```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop",
    "price": 999.99,
    "stock": 10
  }'
```

**Response:**
```json
{
  "id": "...",
  "name": "Laptop",
  "price": 999.99,
  "stock": 10
}
```

### Get All Products

```bash
curl http://localhost:3000/products
```

### Get Product by ID

```bash
curl http://localhost:3000/products/{id}
```

---

## What You've Learned

Congratulations! You've just built a complete CRUD API with:

- **Domain-Driven Design** - Entities and repositories
- **CQRS Pattern** - Commands and queries with handlers
- **HTTP Server** - Fastify integration with routes
- **Type Safety** - Full TypeScript support
- **Result Pattern** - Explicit error handling
- **Clean Architecture** - Separation of concerns

**All in 3 commands and ~2 minutes!** 🚀

---

## Comparison: Before vs After

| Aspect          | Old Quickstart | New Quickstart |
| --------------- | -------------- | -------------- |
| **Steps**       | 10             | 3              |
| **Time**        | 15-20 minutes  | 2 minutes      |
| **Manual code** | 150 lines      | 26 lines       |
| **Commands**    | 13             | 3              |

---

## Next Steps

Now that you've built your first application, explore:

1. **[Project Structure](./project-structure)** - Understand the project organization
2. **[Core Concepts](../core-concepts/architecture-overview)** - Learn about Stratix architecture
3. **[AI Agents](../ai-agents/ai-agents-overview)** - Build AI-powered features

---

## Add More Features

### Add Database

Replace in-memory storage with PostgreSQL:

```bash
stratix add postgres
```

Then update your repository implementation to use PostgreSQL instead of in-memory storage.

### Add Validation

Add Zod-based validation:

```bash
stratix add validation
```

Then add schemas to validate request bodies.

### Add Authentication

Protect your endpoints with JWT:

```bash
stratix add auth
```

### Add AI Agent

Create an AI agent for product recommendations:

```bash
stratix add ai-openai
```

---

## Tips

### Use Stratix Copilot

Install the [Stratix Copilot VS Code extension](https://marketplace.visualstudio.com/items?itemName=stratix.stratix-copilot-rag) for AI-powered code generation:

```
@stratix /entity Product with name, price, and stock
```

### Multiple Contexts

For larger applications, generate multiple contexts:

```bash
stratix generate context Order --props '[{"name":"userId","type":"string"},{"name":"total","type":"number"}]' --with-http
stratix generate context User --props '[{"name":"email","type":"string"},{"name":"name","type":"string"}]' --with-http
```

### Dry Run

Preview what will be generated without creating files:

```bash
stratix generate context Product --props '[{"name":"name","type":"string"}]' --with-http --dry-run
```

---

## Getting Help

- **Documentation**: [Full documentation](../core-concepts/architecture-overview)
- **Examples**: [More examples](https://github.com/stratix-dev/stratix/tree/main/examples)
- **Community**: [GitHub Discussions](https://github.com/stratix-dev/stratix/discussions)
