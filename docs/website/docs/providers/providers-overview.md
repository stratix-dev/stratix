---
sidebar_position: 1
title: Providers Overview
description: Understanding providers in the Stratix framework
---

# Providers Overview

Providers are **implementations of core interfaces** that supply specific functionality to your Stratix application. Unlike plugins, providers don't have a lifecycle and are instantiated directly when needed.

## Providers vs Plugins vs Libraries

Understanding the distinction between these three types of packages is crucial:

| Aspect                | Plugins 🔌                                  | Providers 🔧                                                       | Libraries 📚                       |
| --------------------- | ------------------------------------------ | ----------------------------------------------------------------- | --------------------------------- |
| **Purpose**           | Extend application with external resources | Implement core interfaces                                         | Provide utility functions/classes |
| **Lifecycle**         | Yes (initialize → start → stop)            | No                                                                | No                                |
| **Interface**         | Implements `Plugin`                        | Implements specific interfaces (e.g., `LLMProvider`, `Container`) | Exports utilities                 |
| **Manages Resources** | Yes (databases, servers, connections)      | Sometimes                                                         | No                                |
| **Registration**      | Via runtime plugin system                  | Direct instantiation                                              | Direct import                     |
| **Examples**          | PostgresPlugin, FastifyHTTPPlugin          | AnthropicProvider, AwilixContainer                                | @stratix/errors, @stratix/mappers |

## When to Use Providers

Use providers when you need to:

- **Implement a core interface**: Like `LLMProvider` for AI models or `Container` for dependency injection
- **Provide swappable implementations**: Different providers for the same interface (e.g., OpenAI vs Anthropic)
- **No lifecycle management needed**: The provider is instantiated when needed, not during app startup

## Available Provider Categories

### AI Providers

Implementations of the `LLMProvider` interface for different AI models:

- **[@stratix/ai-anthropic](./ai-providers#anthropic)** - Claude models (Opus, Sonnet, Haiku)
- **[@stratix/ai-openai](./ai-providers#openai)** - OpenAI models (GPT-4, GPT-3.5)

[Learn more about AI Providers →](./ai-providers)

### Dependency Injection Providers

Implementations of the `Container` interface:

- **[@stratix/di-awilix](./di-providers)** - Awilix-based DI container (recommended)

[Learn more about DI Providers →](./di-providers)

### Validation Providers

Implementations of the `Validator` interface:

- **[@stratix/validation-zod](./validation-providers)** - Zod-based schema validation

[Learn more about Validation Providers →](./validation-providers)


## Using Providers

Providers are typically instantiated directly in your code:

```typescript
import { AnthropicProvider } from '@stratix/ai-anthropic';
import { AwilixContainer } from '@stratix/di-awilix';

// AI Provider - instantiated when creating an agent
const llmProvider = new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY!
});

// DI Container - instantiated at app startup
const container = new AwilixContainer();
```

## Creating Custom Providers

To create a custom provider, implement the relevant core interface:

```typescript
import type { LLMProvider, ChatParams, ChatResponse } from '@stratix/core';

export class CustomLLMProvider implements LLMProvider {
  readonly name = 'custom-llm';
  readonly models = ['custom-model-1', 'custom-model-2'];

  async chat(params: ChatParams): Promise<ChatResponse> {
    // Your implementation
  }

  async *streamChat(params: ChatParams): AsyncIterable<ChatChunk> {
    // Your streaming implementation
  }

  async embeddings(params: EmbeddingParams): Promise<EmbeddingResponse> {
    // Your embeddings implementation
  }
}
```

## Next Steps

- **[AI Providers](./ai-providers)** - Learn about LLM providers for AI agents
- **[DI Providers](./di-providers)** - Learn about dependency injection containers
- **[Creating Plugins](../plugins/creating-plugins)** - If you need lifecycle management, create a plugin instead
