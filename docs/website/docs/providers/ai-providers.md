---
sidebar_position: 2
title: AI Providers
description: LLM providers for Stratix AI agents
---

# AI Providers

AI Providers implement the `LLMProvider` interface from `@stratix/core`, enabling your AI agents to communicate with different Large Language Model services.

## Available Providers

### Anthropic (Claude) {#anthropic}

**Package:** `@stratix/ai-anthropic`

Anthropic's Claude models, known for their strong reasoning and long context windows.

#### Installation

```bash
npm install @stratix/ai-anthropic
```

Or using the CLI:

```bash
stratix add ai-anthropic
```

#### Supported Models

- `claude-3-opus-20240229` - Most capable, best for complex tasks
- `claude-3-sonnet-20240229` - Balanced performance and cost
- `claude-3-haiku-20240307` - Fastest, most cost-effective
- `claude-3-5-sonnet-20241022` - Latest Sonnet with improved capabilities

#### Usage

```typescript
import { AnthropicProvider } from '@stratix/ai-anthropic';
import { AIAgent } from '@stratix/core';

// Create provider
const provider = new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY!
});

// Use with an agent
const agent = new AIAgent({
  id: 'assistant',
  name: 'Assistant',
  description: 'Helpful assistant',
  llmProvider: provider,
  model: 'claude-3-5-sonnet-20241022',
  systemPrompt: 'You are a helpful assistant.',
});

// Execute agent
const result = await agent.execute({
  messages: [
    { role: 'user', content: 'Hello!', timestamp: new Date() }
  ]
});
```

#### Features

- ✅ Chat completion
- ✅ Streaming responses
- ✅ Tool/function calling
- ✅ Cost tracking
- ❌ Embeddings (not supported by Anthropic)

---

### OpenAI {#openai}

**Package:** `@stratix/ai-openai`

OpenAI's GPT models, including GPT-4 and GPT-3.5.

#### Installation

```bash
npm install @stratix/ai-openai
```

Or using the CLI:

```bash
stratix add ai-openai
```

#### Supported Models

- `gpt-4-turbo` - Latest GPT-4 with vision
- `gpt-4` - Original GPT-4
- `gpt-3.5-turbo` - Fast and cost-effective
- `text-embedding-3-small` - Embeddings model
- `text-embedding-3-large` - Higher quality embeddings

#### Usage

```typescript
import { OpenAIProvider } from '@stratix/ai-openai';
import { AIAgent } from '@stratix/core';

// Create provider
const provider = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!
});

// Use with an agent
const agent = new AIAgent({
  id: 'assistant',
  name: 'Assistant',
  description: 'Helpful assistant',
  llmProvider: provider,
  model: 'gpt-4-turbo',
  systemPrompt: 'You are a helpful assistant.',
});
```

#### Features

- ✅ Chat completion
- ✅ Streaming responses
- ✅ Tool/function calling
- ✅ Embeddings
- ✅ Cost tracking
- ✅ Vision (GPT-4 Turbo)

---

## Provider Interface

All AI providers implement the `LLMProvider` interface:

```typescript
interface LLMProvider {
  readonly name: string;
  readonly models: string[];

  chat(params: ChatParams): Promise<ChatResponse>;
  streamChat(params: ChatParams): AsyncIterable<ChatChunk>;
  embeddings(params: EmbeddingParams): Promise<EmbeddingResponse>;
}
```

## Choosing a Provider

| Use Case             | Recommended Provider | Model                      |
| -------------------- | -------------------- | -------------------------- |
| Complex reasoning    | Anthropic            | claude-3-opus-20240229     |
| Balanced performance | Anthropic            | claude-3-5-sonnet-20241022 |
| Fast responses       | Anthropic            | claude-3-haiku-20240307    |
| Vision tasks         | OpenAI               | gpt-4-turbo                |
| Embeddings           | OpenAI               | text-embedding-3-large     |
| Cost-effective       | OpenAI               | gpt-3.5-turbo              |

## Creating a Custom Provider

To create your own LLM provider:

```typescript
import type {
  LLMProvider,
  ChatParams,
  ChatResponse,
  ChatChunk,
  EmbeddingParams,
  EmbeddingResponse
} from '@stratix/core';

export class CustomProvider implements LLMProvider {
  readonly name = 'custom';
  readonly models = ['model-1', 'model-2'];

  constructor(private config: { apiKey: string }) {}

  async chat(params: ChatParams): Promise<ChatResponse> {
    // Call your LLM API
    const response = await fetch('https://api.example.com/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature
      })
    });

    const data = await response.json();

    return {
      content: data.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      },
      finishReason: 'stop'
    };
  }

  async *streamChat(params: ChatParams): AsyncIterable<ChatChunk> {
    // Implement streaming
  }

  async embeddings(params: EmbeddingParams): Promise<EmbeddingResponse> {
    // Implement embeddings
  }
}
```

## Next Steps

- **[Creating AI Agents](../ai-agents/creating-agents)** - Build agents using these providers
- **[Agent Tools](../ai-agents/agent-tools)** - Add tool calling to your agents
- **[Agent Testing](../ai-agents/agent-testing)** - Test agents with MockLLMProvider
