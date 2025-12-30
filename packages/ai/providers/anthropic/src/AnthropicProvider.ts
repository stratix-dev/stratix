import Anthropic from '@anthropic-ai/sdk';
import type {
  LLMProvider,
  ChatCompletionParams,
  LLMResponse,
  LLMStreamChunk,
  EmbeddingParams,
  EmbeddingResponse,
  ProviderCapabilities,
  LLMMessage,
  ToolDefinition,
  ToolCall,
  ToolCallDelta,
  FinishReason,
  TokenUsage,
} from '@stratix/core/ai-agents';

/**
 * Model pricing configuration.
 */
export interface ModelPricing {
  readonly name: string;
  readonly pricing?: {
    readonly input: number;  // per 1M tokens
    readonly output: number; // per 1M tokens
  };
  readonly capabilities?: Partial<ProviderCapabilities>;
}

/**
 * Configuration for AnthropicProvider.
 */
export interface AnthropicConfig {
  readonly apiKey: string;
  readonly baseURL?: string;
  readonly models: ModelPricing[];
}

/**
 * Anthropic provider implementation for Stratix AI Agents v2.0.
 *
 * Supports Claude 3+ models with:
 * - Tool use (function calling)
 * - Streaming responses
 * - Vision (image inputs) for Claude 3+ models
 * - Extended context windows (up to 200K tokens)
 * - Prompt caching (automatic in SDK)
 *
 * Note: Anthropic does not support embeddings - use OpenAI or another provider.
 *
 * @example Basic usage
 * ```typescript
 * import { AnthropicProvider } from '@stratix/ai-anthropic';
 *
 * const provider = new AnthropicProvider({
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 *   models: [
 *     { name: 'claude-sonnet-4-5-20250929', pricing: { input: 3.0, output: 15.0 } },
 *     { name: 'claude-opus-4-5-20251101', pricing: { input: 15.0, output: 75.0 } }
 *   ]
 * });
 *
 * const response = await provider.chat({
 *   model: 'claude-sonnet-4-5-20250929',
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 * ```
 *
 * @example With vision (base64 images)
 * ```typescript
 * // Note: Anthropic SDK only supports base64-encoded images
 * const imageBase64 = await fs.readFile('image.jpg', 'base64');
 * const response = await provider.chat({
 *   model: 'claude-sonnet-4-5-20250929',
 *   messages: [{
 *     role: 'user',
 *     content: [
 *       { type: 'text', text: 'What is in this image?' },
 *       {
 *         type: 'image',
 *         source: {
 *           type: 'base64',
 *           mediaType: 'image/jpeg',
 *           data: imageBase64
 *         }
 *       }
 *     ]
 *   }]
 * });
 * ```
 *
 * @example Streaming
 * ```typescript
 * for await (const chunk of provider.streamChat({
 *   model: 'claude-sonnet-4-5-20250929',
 *   messages: [{ role: 'user', content: 'Write a story' }]
 * })) {
 *   if (chunk.type === 'content') {
 *     process.stdout.write(chunk.content);
 *   }
 * }
 * ```
 */
export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  readonly models: readonly string[];
  readonly capabilities: ProviderCapabilities = {
    toolCalling: true,
    streaming: true,
    embeddings: false, // Anthropic doesn't support embeddings
    vision: true,      // Claude 3+ supports vision
    structuredOutput: false, // No native structured output support
    maxContextTokens: 200000, // Claude 3+ supports up to 200K
    maxOutputTokens: 4096,
  };

  private client: Anthropic;
  private pricing: Map<string, { input: number; output: number }>;
  private modelCapabilities: Map<string, ProviderCapabilities>;

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

    // Store model-specific capabilities
    this.modelCapabilities = new Map(
      config.models
        .filter((m) => m.capabilities !== undefined)
        .map((m) => [m.name, { ...this.capabilities, ...m.capabilities! }])
    );

    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  async chat(params: ChatCompletionParams): Promise<LLMResponse> {
    const { system, messages } = this.convertMessages(params.messages);

    const response = await this.client.messages.create({
      model: params.model,
      max_tokens: params.config?.maxTokens || 4096,
      temperature: params.config?.temperature ?? 0.7,
      top_p: params.config?.topP,
      stop_sequences: params.config?.stopSequences as string[] | undefined,
      system,
      messages,
      tools: params.tools ? this.convertTools(params.tools) : undefined,
    });

    let content = '';
    const toolCalls: ToolCall[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          type: 'function',
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input),
          },
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
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage,
      finishReason: this.mapStopReason(response.stop_reason),
      model: response.model,
      metadata: {
        id: response.id,
        stopSequence: response.stop_sequence,
      },
    };
  }

  async *streamChat(params: ChatCompletionParams): AsyncIterable<LLMStreamChunk> {
    const { system, messages } = this.convertMessages(params.messages);

    const stream = this.client.messages.stream({
      model: params.model,
      max_tokens: params.config?.maxTokens || 4096,
      temperature: params.config?.temperature ?? 0.7,
      top_p: params.config?.topP,
      stop_sequences: params.config?.stopSequences as string[] | undefined,
      system,
      messages,
      tools: params.tools ? this.convertTools(params.tools) : undefined,
    });

    let currentUsage: TokenUsage | undefined;

    for await (const chunk of stream) {
      const anyChunk = chunk as unknown as {
        type: string;
        delta?: { type: string; text?: string };
        content_block?: { type: string; id?: string; name?: string; input?: unknown };
        message?: { usage?: { input_tokens: number; output_tokens: number } };
      };

      let chunkContent = '';
      const chunkToolDeltas: ToolCallDelta[] = [];
      let isComplete = false;
      let finishReason: FinishReason | undefined;

      if (anyChunk.type === 'content_block_delta' && anyChunk.delta?.type === 'text_delta') {
        chunkContent = anyChunk.delta.text || '';
      } else if (anyChunk.type === 'content_block_start' && anyChunk.content_block?.type === 'tool_use') {
        chunkToolDeltas.push({
          id: anyChunk.content_block.id,
          type: 'function',
          function: {
            name: anyChunk.content_block.name,
            arguments: JSON.stringify(anyChunk.content_block.input || {}),
          },
        });
      } else if (anyChunk.type === 'message_stop') {
        isComplete = true;
        finishReason = 'stop';
        if (anyChunk.message?.usage) {
          currentUsage = {
            promptTokens: anyChunk.message.usage.input_tokens,
            completionTokens: anyChunk.message.usage.output_tokens,
            totalTokens: anyChunk.message.usage.input_tokens + anyChunk.message.usage.output_tokens,
          };
        }
      }

      yield {
        content: chunkContent,
        toolCallDeltas: chunkToolDeltas.length > 0 ? chunkToolDeltas : undefined,
        isComplete,
        finishReason,
        usage: currentUsage,
      };
    }
  }

  embeddings(_params: EmbeddingParams): Promise<EmbeddingResponse> {
    return Promise.reject(
      new Error(
        'Anthropic does not support embeddings. Use OpenAI or another provider for embeddings.'
      )
    );
  }

  supportsModel(model: string): boolean {
    return this.models.includes(model);
  }

  getModelCapabilities(model: string): ProviderCapabilities | undefined {
    return this.modelCapabilities.get(model) || this.capabilities;
  }

  estimateCost(model: string, promptTokens: number, completionTokens: number): number {
    const pricing = this.pricing.get(model);
    if (!pricing) {
      return 0;
    }

    const inputCost = (promptTokens / 1_000_000) * pricing.input;
    const outputCost = (completionTokens / 1_000_000) * pricing.output;

    return inputCost + outputCost;
  }

  private convertMessages(messages: readonly LLMMessage[]): {
    system?: string | Anthropic.Messages.TextBlock[];
    messages: Anthropic.Messages.MessageParam[];
  } {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    // Combine system messages
    const system =
      systemMessages.length > 0
        ? systemMessages.map((m) => m.content as string).join('\n\n')
        : undefined;

    // Convert conversation messages
    const anthropicMessages: Anthropic.Messages.MessageParam[] = [];

    for (const msg of conversationMessages) {
      // Handle multimodal content
      if (Array.isArray(msg.content)) {
        const content = msg.content.map(
          (
            part
          ):
            | Anthropic.TextBlockParam
            | Anthropic.ImageBlockParam => {
            if (part.type === 'text') {
              return {
                type: 'text',
                text: part.text,
              };
            } else {
              // part.type === 'image'
              // Anthropic SDK v0.35.0+ only supports base64-encoded images
              if (part.source.type === 'url') {
                throw new Error(
                  'Anthropic SDK does not support URL-based images. Please convert images to base64 format before sending.'
                );
              } else {
                // Validate media_type is supported
                const validMediaTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
                type ValidMediaType = typeof validMediaTypes[number];

                const mediaType = part.source.mediaType;
                if (!validMediaTypes.includes(mediaType as ValidMediaType)) {
                  throw new Error(
                    `Unsupported media type: ${mediaType}. Supported types: ${validMediaTypes.join(', ')}`
                  );
                }

                return {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mediaType as ValidMediaType,
                    data: part.source.data,
                  },
                };
              }
            }
          }
        );

        anthropicMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content,
        });
      }
      // Handle tool result messages
      else if (msg.role === 'tool' && msg.tool_call_id) {
        anthropicMessages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: msg.tool_call_id,
              content: msg.content as string,
            },
          ],
        });
      }
      // Handle assistant messages with tool calls
      else if (msg.role === 'assistant' && msg.tool_calls) {
        const content: Anthropic.Messages.ContentBlock[] = [];

        if (msg.content) {
          content.push({
            type: 'text',
            text: String(msg.content),
          });
        }

        for (const toolCall of msg.tool_calls) {
          content.push({
            type: 'tool_use',
            id: toolCall.id,
            name: toolCall.function.name,
            input: JSON.parse(toolCall.function.arguments),
          });
        }

        anthropicMessages.push({
          role: 'assistant',
          content,
        });
      }
      // Standard messages
      else {
        anthropicMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content as string,
        });
      }
    }

    return { system, messages: anthropicMessages };
  }

  private convertTools(tools: readonly ToolDefinition[]): Anthropic.Messages.Tool[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters as Anthropic.Messages.Tool.InputSchema,
    }));
  }

  private mapStopReason(reason: string | null): FinishReason {
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
