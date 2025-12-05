---
sidebar_position: 3
title: Quick Start
description: Build your first Stratix agent or API in minutes
---

# Quick Start

Pick your path:
- **AI Agent end-to-end (5 minutes)** – recommended to see the agent + ecosystem flow
- **CRUD API (2 minutes)** – fast baseline for REST and CQRS

## Quick Start: AI Agent end-to-end (5 minutes)

Build and expose an AI agent with HTTP and OpenAI in a few commands.

### What You'll Build
- An AI agent (`SupportAgent`) with OpenAI provider
- HTTP endpoint `POST /support` that routes to the agent
- Type-safe result handling and logging

### Step 1: Create project with HTTP + OpenAI

```bash
stratix new support-agent --structure multi-context --with http
cd support-agent
stratix add ai-openai
```

**What this does:**
- Creates a new Stratix project with Fastify HTTP plugin
- Installs `@stratix/ai-openai` and dependencies
- Sets up TypeScript, ESLint, and Prettier

### Step 2: Add an AI agent and route

Create `src/contexts/support/SupportAgent.ts`:

```typescript
import { AIAgent, AgentResult, AgentVersionFactory, AgentCapabilities, EntityId } from '@stratix/core';
import { OpenAIProvider } from '@stratix/ai-openai';

export class SupportAgent extends AIAgent<string, string> {
  readonly name = 'Support Agent';
  readonly description = 'Helpful customer support agent';
  readonly version = AgentVersionFactory.create('1.0.0');
  readonly capabilities = [AgentCapabilities.CUSTOMER_SUPPORT];
  readonly model = {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 2000,
  };

  constructor(
    private readonly llmProvider: OpenAIProvider,
    id = EntityId.create<'AIAgent'>(),
    createdAt = new Date(),
    updatedAt = new Date()
  ) {
    super(id, createdAt, updatedAt);
  }

  protected async execute(input: string): Promise<AgentResult<string>> {
    const response = await this.llmProvider.chat({
      model: this.model.model,
      messages: [
        { role: 'system', content: 'You are a helpful customer support agent.', timestamp: new Date() },
        { role: 'user', content: input, timestamp: new Date() },
      ],
      temperature: this.model.temperature,
      maxTokens: this.model.maxTokens,
    });

    return AgentResult.success(response.content, {
      model: this.model.model,
      duration: 0,
      totalTokens: response.usage.totalTokens,
    });
  }
}
```

Create `src/contexts/support/http/SupportRoutes.ts`:

```typescript
import { FastifyHTTPPlugin } from '@stratix/http-fastify';
import { SupportAgent } from '../SupportAgent.js';

export function registerSupportRoutes(http: FastifyHTTPPlugin, agent: SupportAgent): void {
  http.post('/support', async (request) => {
    const { message } = request.body as { message: string };
    const result = await agent.executeWithEvents(message);

    if (result.isFailure()) {
      return { statusCode: 400, body: { error: result.error?.message || 'Unknown error' } };
    }

    return { statusCode: 200, body: { reply: result.data, metadata: result.metadata } };
  });
}
```

Update `src/index.ts`:

```typescript
import { ApplicationBuilder, ConsoleLogger } from '@stratix/runtime';
import { AwilixContainer } from '@stratix/di-awilix';
import { FastifyHTTPPlugin } from '@stratix/http-fastify';
import { OpenAIProvider } from '@stratix/ai-openai';
import { SupportAgent } from './contexts/support/SupportAgent.js';
import { registerSupportRoutes } from './contexts/support/http/SupportRoutes.js';

async function bootstrap() {
  const http = new FastifyHTTPPlugin({ port: 3000 });
  const openai = new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY! });
  const agent = new SupportAgent(openai);

  registerSupportRoutes(http, agent);

  const app = await ApplicationBuilder.create()
    .useContainer(new AwilixContainer())
    .useLogger(new ConsoleLogger())
    .usePlugin(http)
    .build();

  await app.start();
  console.log('Server running on http://localhost:3000');

  process.on('SIGINT', async () => {
    await app.stop();
    process.exit(0);
  });
}

bootstrap().catch(console.error);
```

### Step 3: Run and test

Set your OpenAI API key:

```bash
export OPENAI_API_KEY="your-api-key-here"
```

Run the server:

```bash
npm run dev
```

Call the agent:

```bash
curl -X POST http://localhost:3000/support \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I reset my password?"}'
```

---

## Quick Start: CRUD API (2 minutes)

Build a complete CRUD API with Stratix in just **2 minutes**. This tutorial will guide you through creating a product management system with zero manual code.

### What You'll Build

A REST API for managing products with:
- Domain entities and repositories
- CQRS commands and queries
- HTTP endpoints (POST, GET, GET/:id)
- Type-safe error handling
- In-memory storage

**All generated automatically** - no manual coding required!

---

## Step 1: Create Project with HTTP

Create a multi-context project with the HTTP plugin preinstalled:

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
import { ApplicationBuilder, InMemoryCommandBus, InMemoryQueryBus, ConsoleLogger } from '@stratix/runtime';
import { AwilixContainer } from '@stratix/di-awilix';
import { FastifyHTTPPlugin } from '@stratix/http-fastify';
import {
  CreateProduct,
  CreateProductHandler,
  GetProductById,
  GetProductByIdHandler,
  ListProducts,
  ListProductsHandler,
  registerProductRoutes,
} from './contexts/product/index.js';

async function bootstrap() {
  const commandBus = new InMemoryCommandBus();
  const queryBus = new InMemoryQueryBus();

  // Register handlers so buses can resolve commands/queries
  commandBus.register(CreateProduct, new CreateProductHandler());
  queryBus.register(GetProductById, new GetProductByIdHandler());
  queryBus.register(ListProducts, new ListProductsHandler());
  
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

**All in 3 commands and ~2 minutes!**

---

## Next Steps

Now that you've built your first application, explore:

1. **[Project Structure](./project-structure)** - Understand the project organization
2. **[Core Concepts](../core-concepts/architecture-overview)** - Learn about Stratix architecture
3. **[AI Agents](../ai-agents/ai-agents-overview)** - Build AI-powered features
4. **[Official Plugins](../plugins/official-plugins)** - Use the ecosystem for HTTP, data, messaging, and observability

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
