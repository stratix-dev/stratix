import OpenAI from 'openai';
import type {
  LLMProvider,
  ChatParams,
  ChatResponse,
  ChatChunk,
  EmbeddingParams,
  EmbeddingResponse,
} from '@stratix/core';
import type { AgentMessage, TokenUsage, ToolCall } from '@stratix/core';

/**
 * Model configuration with optional pricing information
 */
export interface ModelConfig {
  readonly name: string;
  readonly pricing?: {
    readonly input: number;  // per 1M tokens
    readonly output: number; // per 1M tokens
  };
}

/**
 * Configuration for OpenAIProvider
 */
export interface OpenAIConfig {
  readonly apiKey: string;
  readonly organization?: string;
  readonly baseURL?: string;
  readonly models: ModelConfig[];
}

/**
 * OpenAI provider implementation for Stratix AI Agents.
 *
 * Requires explicit model configuration - no defaults provided.
 * Supports GPT-4, GPT-3.5, and embeddings models with function calling and streaming.
 *
 * @example Using predefined model constants
 * ```typescript
 * import { OpenAIProvider, OPENAI_MODELS } from '@stratix/ai-openai';
 *
 * const provider = new OpenAIProvider({
 *   apiKey: process.env.OPENAI_API_KEY!,
 *   organization: 'org-123',
 *   models: [
  *     { name: gpt-5.2, pricing: { input: 1.75, output: 14.0 } },
  *     { name: gpt-5.1, pricing: { input: 1.25, output: 10.0 } }
 *   ]
 * });
 *
 * const response = await provider.chat({
 *   model: 'gpt-4o',
 *   messages: [{ role: 'user', content: 'Hello!', timestamp: new Date() }]
 * });
 * ```
 *
 * @example Custom models with updated pricing
 * ```typescript
 * const provider = new OpenAIProvider({
 *   apiKey: process.env.OPENAI_API_KEY!,
 *   models: [
 *     { name: 'gpt-4o', pricing: { input: 6.0, output: 22.0 } },
 *     { name: 'gpt-5', pricing: { input: 50.0, output: 150.0 } }
 *   ]
 * });
 * ```
 *
 * @example Without pricing (calculateCost returns 0)
 * ```typescript
 * const provider = new OpenAIProvider({
 *   apiKey: process.env.OPENAI_API_KEY!,
 *   models: [
 *     { name: 'gpt-4o' },
 *     { name: 'gpt-4o-mini' }
 *   ]
 * });
 * ```
 *
 * @example Streaming
 * ```typescript
 * for await (const chunk of provider.streamChat({
 *   model: 'gpt-4o',
 *   messages: [{ role: 'user', content: 'Write a story', timestamp: new Date() }]
 * })) {
 *   process.stdout.write(chunk.content);
 * }
 * ```
 */
export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  readonly models: string[];

  private client: OpenAI;
  private pricing: Map<string, { input: number; output: number }>;

  constructor(config: OpenAIConfig) {
    if (!config.models || config.models.length === 0) {
      throw new Error('OpenAIProvider requires at least one model to be configured');
    }

    this.models = config.models.map((m) => m.name);
    this.pricing = new Map(
      config.models
        .filter((m) => m.pricing !== undefined)
        .map((m) => [m.name, m.pricing!])
    );

    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
      baseURL: config.baseURL,
    });
  }

  async chat(params: ChatParams): Promise<ChatResponse> {
    const messages = this.convertMessages(params.messages);

    const completion = await this.client.chat.completions.create({
      model: params.model,
      messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens,
      tools: params.tools ? this.convertTools(params.tools) : undefined,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      response_format: params.responseFormat
        ? this.convertResponseFormat(params.responseFormat)
        : undefined,
    });

    const choice = completion.choices[0];
    if (!choice) {
      throw new Error('No completion choice returned from OpenAI');
    }

    const content = choice.message.content || '';
    const toolCalls = choice.message.tool_calls
      ? this.extractToolCalls(choice.message.tool_calls)
      : undefined;

    const usage: TokenUsage = {
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalTokens: completion.usage?.total_tokens || 0,
    };

    return {
      content,
      toolCalls,
      usage,
      finishReason: this.mapFinishReason(choice.finish_reason),
    };
  }

  async *streamChat(params: ChatParams): AsyncIterable<ChatChunk> {
    const messages = this.convertMessages(params.messages);

    const stream = await this.client.chat.completions.create({
      model: params.model,
      messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens,
      tools: params.tools ? this.convertTools(params.tools) : undefined,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        yield {
          content: delta.content,
          isComplete: chunk.choices[0]?.finish_reason !== null,
        };
      }
    }
  }

  async embeddings(params: EmbeddingParams): Promise<EmbeddingResponse> {
    const response = await this.client.embeddings.create({
      model: params.model,
      input: params.input,
    });

    const embeddings = response.data.map((item) => item.embedding);

    const usage: TokenUsage = {
      promptTokens: response.usage.prompt_tokens,
      completionTokens: 0,
      totalTokens: response.usage.total_tokens,
    };

    return {
      embeddings,
      usage,
    };
  }

  /**
   * Calculates the cost of a chat completion based on token usage.
   * Returns 0 if no pricing information is available for the model.
   *
   * @param model - The model used
   * @param usage - Token usage information
   * @returns Cost in USD, or 0 if pricing not configured
   */
  calculateCost(model: string, usage: TokenUsage): number {
    const pricing = this.pricing.get(model);
    if (!pricing) {
      return 0;
    }

    const inputCost = (usage.promptTokens / 1_000_000) * pricing.input;
    const outputCost = (usage.completionTokens / 1_000_000) * pricing.output;

    return inputCost + outputCost;
  }

  private convertMessages(
    messages: AgentMessage[]
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  private convertTools(
    tools: Array<{ name: string; description: string; parameters: Record<string, unknown> }>
  ): OpenAI.Chat.Completions.ChatCompletionTool[] {
    return tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  private convertResponseFormat(format: {
    type: string;
    schema?: Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }): any {
    if (format.type === 'json_object') {
      return { type: 'json_object' };
    }
    if (format.type === 'json_schema' && format.schema) {
      // OpenAI requires additionalProperties: false for structured outputs
      const schemaWithAdditionalProps = {
        ...format.schema,
        additionalProperties: false,
      };

      return {
        type: 'json_schema',
        json_schema: {
          name: 'response_schema',
          schema: schemaWithAdditionalProps,
          strict: true,
        },
      };
    }
    return undefined;
  }

  private extractToolCalls(
    toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]
  ): ToolCall[] {
    return toolCalls.map((tc) => ({
      name: tc.function.name,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      arguments: JSON.parse(tc.function.arguments),
    }));
  }

  private mapFinishReason(
    reason: string | null | undefined
  ): 'stop' | 'length' | 'tool_calls' | 'content_filter' {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'tool_calls':
        return 'tool_calls';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }
}
