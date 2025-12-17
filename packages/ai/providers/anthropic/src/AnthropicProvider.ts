import Anthropic from '@anthropic-ai/sdk';
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
 * Configuration for AnthropicProvider
 */
export interface AnthropicConfig {
  readonly apiKey: string;
  readonly baseURL?: string;
  readonly models: ModelConfig[];
}


/**
 * Anthropic provider implementation for Stratix AI Agents.
 *
 * Requires explicit model configuration - no defaults provided.
 * Supports Claude 3 models (Opus, Sonnet, Haiku) with tool use and streaming.
 * Note: Anthropic does not support embeddings.
 *
 * @example Using predefined model constants
 * ```typescript
 * import { AnthropicProvider } from '@stratix/ai-anthropic';
 *
 * const provider = new AnthropicProvider({
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 *   models: [
 *     { name: 'claude-sonnet-4-5-20250929', pricing: { input: 3.0, output: 15.0 } },
 *     { name: 'claude-opus-4-5-20251101', pricing: { input: 5.0, output: 25.0 } }
 *   ]
 * });
 *
 * const response = await provider.chat({
 *   model: 'claude-sonnet-4-5-20250929',
 *   messages: [{ role: 'user', content: 'Hello!', timestamp: new Date() }]
 * });
 * ```
 *
 * @example Custom models with updated pricing
 * ```typescript
 * const provider = new AnthropicProvider({
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 *   models: [
 *     { name: 'claude-sonnet-4-5-20250929', pricing: { input: 3.5, output: 17.5 } },
 *     { name: 'claude-opus-4-5-20251101', pricing: { input: 25.0, output: 125.0 } }
 *   ]
 * });
 * ```
 *
 * @example Without pricing (calculateCost returns 0)
 * ```typescript
 * const provider = new AnthropicProvider({
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 *   models: [
 *     { name: 'claude-sonnet-4-5-20250929' }
 *   ]
 * });
 * ```
 *
 * @example Streaming
 * ```typescript
 * for await (const chunk of provider.streamChat({
 *   model: 'claude-3-5-sonnet-20241022',
 *   messages: [{ role: 'user', content: 'Write a story', timestamp: new Date() }]
 * })) {
 *   process.stdout.write(chunk.content);
 * }
 * ```
 */
export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  readonly models: string[];

  private client: Anthropic;
  private pricing: Map<string, { input: number; output: number }>;

  constructor(config: AnthropicConfig) {
    if (!config.models || config.models.length === 0) {
      throw new Error('AnthropicProvider requires at least one model to be configured');
    }

    this.models = config.models.map((m) => m.name);
    this.pricing = new Map(
      config.models
        .filter((m) => m.pricing !== undefined)
        .map((m) => [m.name, m.pricing!])
    );

    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  async chat(params: ChatParams): Promise<ChatResponse> {
    const { system, messages } = this.convertMessages(params.messages);

    const response = await this.client.messages.create({
      model: params.model,
      max_tokens: params.maxTokens || 4096,
      temperature: params.temperature ?? 0.7,
      system,
      messages,
      tools: params.tools ? this.convertTools(params.tools) : undefined,
    });

    let content = '';
    let toolCalls: ToolCall[] | undefined;

    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text;
      } else if (block.type === 'tool_use') {
        if (!toolCalls) toolCalls = [];
        toolCalls.push({
          name: block.name,
          arguments: block.input as Record<string, unknown>,
        });
      }
    }

    const usage: TokenUsage = {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    };

    return {
      content,
      toolCalls,
      usage,
      finishReason: this.mapStopReason(response.stop_reason),
    };
  }

  async *streamChat(params: ChatParams): AsyncIterable<ChatChunk> {
    const { system, messages } = this.convertMessages(params.messages);

    const stream = this.client.messages.stream({
      model: params.model,
      max_tokens: params.maxTokens || 4096,
      temperature: params.temperature ?? 0.7,
      system,
      messages,
      tools: params.tools ? this.convertTools(params.tools) : undefined,
    });

    for await (const chunk of stream) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      const anyChunk = chunk as any;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        anyChunk.type === 'content_block_delta' &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        anyChunk.delta?.type === 'text_delta'
      ) {
        yield {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          content: anyChunk.delta.text as string,
          isComplete: false,
        };
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      } else if (anyChunk.type === 'message_stop') {
        yield {
          content: '',
          isComplete: true,
        };
      }
    }
  }

  embeddings(_params: EmbeddingParams): Promise<EmbeddingResponse> {
    return Promise.reject(
      new Error(
        'Anthropic does not support embeddings. Use OpenAI or another provider for embeddings.'
      )
    );
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

  private convertMessages(messages: AgentMessage[]): {
    system?: string;
    messages: Anthropic.MessageParam[];
  } {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    const system =
      systemMessages.length > 0 ? systemMessages.map((m) => m.content).join('\n\n') : undefined;

    const anthropicMessages: Anthropic.MessageParam[] = conversationMessages.map((msg) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    return { system, messages: anthropicMessages };
  }

  private convertTools(
    tools: Array<{ name: string; description: string; parameters: Record<string, unknown> }>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    }));
  }

  private mapStopReason(
    reason: string | null
  ): 'stop' | 'length' | 'tool_calls' | 'content_filter' {
    switch (reason) {
      case 'end_turn':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'tool_use':
        return 'tool_calls';
      case 'stop_sequence':
        return 'stop';
      default:
        return 'stop';
    }
  }
}
