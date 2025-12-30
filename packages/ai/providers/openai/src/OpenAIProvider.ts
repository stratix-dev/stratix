import OpenAI from 'openai';
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
  ResponseFormat,
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
 * Configuration for OpenAIProvider.
 */
export interface OpenAIConfig {
  readonly apiKey: string;
  readonly organization?: string;
  readonly baseURL?: string;
  readonly models: ModelPricing[];
}

/**
 * OpenAI provider implementation for Stratix AI Agents v2.0.
 *
 * Supports GPT-4, GPT-3.5, and embeddings models with:
 * - Function/tool calling
 * - Streaming responses
 * - Vision (image inputs) for GPT-4 Vision models
 * - Structured output (JSON mode and JSON schema)
 * - Embeddings generation
 *
 * @example Basic usage
 * ```typescript
 * import { OpenAIProvider } from '@stratix/ai-openai';
 *
 * const provider = new OpenAIProvider({
 *   apiKey: process.env.OPENAI_API_KEY!,
 *   models: [
 *     { name: 'gpt-4o', pricing: { input: 2.5, output: 10.0 } },
 *     { name: 'gpt-4o-mini', pricing: { input: 0.15, output: 0.60 } }
 *   ]
 * });
 *
 * const response = await provider.chat({
 *   model: 'gpt-4o',
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 * ```
 *
 * @example With vision (images)
 * ```typescript
 * const response = await provider.chat({
 *   model: 'gpt-4o',
 *   messages: [{
 *     role: 'user',
 *     content: [
 *       { type: 'text', text: 'What is in this image?' },
 *       {
 *         type: 'image_url',
 *         image_url: {
 *           url: 'https://example.com/image.jpg',
 *           detail: 'high'
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
 *   model: 'gpt-4o',
 *   messages: [{ role: 'user', content: 'Write a story' }]
 * })) {
 *   if (chunk.type === 'content') {
 *     process.stdout.write(chunk.content);
 *   }
 * }
 * ```
 *
 * @example Structured output
 * ```typescript
 * const response = await provider.chat({
 *   model: 'gpt-4o',
 *   messages: [{ role: 'user', content: 'Extract person info' }],
 *   responseFormat: {
 *     type: 'json_schema',
 *     schema: {
 *       name: 'person_info',
 *       schema: {
 *         type: 'object',
 *         properties: {
 *           name: { type: 'string' },
 *           age: { type: 'number' }
 *         },
 *         required: ['name', 'age']
 *       },
 *       strict: true
 *     }
 *   }
 * });
 * ```
 */
export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  readonly models: readonly string[];
  readonly capabilities: ProviderCapabilities = {
    toolCalling: true,
    streaming: true,
    embeddings: true,
    vision: true,
    structuredOutput: true,
    maxContextTokens: 128000, // GPT-4 Turbo
    maxOutputTokens: 4096,
  };

  private client: OpenAI;
  private pricing: Map<string, { input: number; output: number }>;
  private modelCapabilities: Map<string, ProviderCapabilities>;

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

    // Store model-specific capabilities
    this.modelCapabilities = new Map(
      config.models
        .filter((m) => m.capabilities !== undefined)
        .map((m) => [m.name, { ...this.capabilities, ...m.capabilities! }])
    );

    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
      baseURL: config.baseURL,
    });
  }

  async chat(params: ChatCompletionParams): Promise<LLMResponse> {
    const messages = this.convertMessages(params.messages);

    const completion = await this.client.chat.completions.create({
      model: params.model,
      messages,
      temperature: params.config?.temperature ?? 0.7,
      max_tokens: params.config?.maxTokens,
      top_p: params.config?.topP,
      frequency_penalty: params.config?.frequencyPenalty,
      presence_penalty: params.config?.presencePenalty,
      stop: params.config?.stopSequences as string[] | undefined,
      seed: params.config?.seed,
      logit_bias: params.config?.logitBias as Record<string, number> | undefined,
      tools: params.tools ? this.convertTools(params.tools) : undefined,
      tool_choice: params.toolChoice ? this.convertToolChoice(params.toolChoice) : undefined,
      response_format: params.responseFormat
        ? (this.convertResponseFormat(params.responseFormat) as
          | { type: 'text' | 'json_object' }
          | undefined)
        : undefined,
      user: params.user,
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
      model: completion.model,
      metadata: {
        id: completion.id,
        created: completion.created,
        systemFingerprint: completion.system_fingerprint,
      },
    };
  }

  async *streamChat(params: ChatCompletionParams): AsyncIterable<LLMStreamChunk> {
    const messages = this.convertMessages(params.messages);

    const stream = await this.client.chat.completions.create({
      model: params.model,
      messages,
      temperature: params.config?.temperature ?? 0.7,
      max_tokens: params.config?.maxTokens,
      top_p: params.config?.topP,
      frequency_penalty: params.config?.frequencyPenalty,
      presence_penalty: params.config?.presencePenalty,
      stop: params.config?.stopSequences as string[] | undefined,
      tools: params.tools ? this.convertTools(params.tools) : undefined,
      tool_choice: params.toolChoice ? this.convertToolChoice(params.toolChoice) : undefined,
      user: params.user,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      const finishReason = chunk.choices[0]?.finish_reason;
      const isComplete = Boolean(finishReason);

      const toolCallDeltas: ToolCallDelta[] = [];
      if (delta?.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          toolCallDeltas.push({
            id: toolCall.id,
            type: 'function',
            function: {
              name: toolCall.function?.name,
              arguments: toolCall.function?.arguments,
            },
          });
        }
      }

      yield {
        content: delta?.content || '',
        toolCallDeltas: toolCallDeltas.length > 0 ? toolCallDeltas : undefined,
        isComplete,
        finishReason: finishReason ? this.mapFinishReason(finishReason) : undefined,
        usage: chunk.usage ? {
          promptTokens: chunk.usage.prompt_tokens || 0,
          completionTokens: chunk.usage.completion_tokens || 0,
          totalTokens: chunk.usage.total_tokens || 0,
        } : undefined,
      };
    }
  }

  async embeddings(params: EmbeddingParams): Promise<EmbeddingResponse> {
    // OpenAI SDK requires mutable array, convert readonly to mutable
    const input = (Array.isArray(params.input)
      ? Array.from(params.input)
      : params.input) as string | string[];

    const response = await this.client.embeddings.create({
      model: params.model,
      input,
      dimensions: params.dimensions,
      encoding_format: params.encodingFormat,
      user: params.user,
    });

    const embeddings = response.data.map((item) => ({
      vector: item.embedding,
      index: item.index,
      input: Array.isArray(input) ? input[item.index] : input,
    }));

    const usage: TokenUsage = {
      promptTokens: response.usage.prompt_tokens,
      completionTokens: 0,
      totalTokens: response.usage.total_tokens,
    };

    // Get dimensions from first embedding or from params
    const dimensions = embeddings[0]?.vector.length ?? params.dimensions ?? 1536;

    return {
      embeddings,
      usage,
      model: response.model,
      dimensions,
    };
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

  private convertMessages(
    messages: readonly LLMMessage[]
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const result: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    for (const msg of messages) {
      // Handle multimodal content
      if (Array.isArray(msg.content)) {
        const content = msg.content.map((part) => {
          if (part.type === 'text') {
            return { type: 'text' as const, text: part.text };
          } else {
            // part.type === 'image'
            const imageUrl = part.source.type === 'url'
              ? part.source.url
              : `data:${part.source.mediaType};base64,${part.source.data}`;

            return {
              type: 'image_url' as const,
              image_url: {
                url: imageUrl,
                detail: part.detail,
              },
            };
          }
        });

        // OpenAI only supports multimodal content for user messages
        if (msg.role === 'user') {
          result.push({ role: 'user', content, name: msg.name });
        } else {
          // For assistant/system with multimodal, convert to text only
          const textContent = content.map(c => c.type === 'text' ? c.text : '').join('');
          if (msg.role === 'assistant') {
            result.push({ role: 'assistant', content: textContent, name: msg.name });
          } else {
            result.push({ role: 'system', content: textContent });
          }
        }
        continue;
      }

      // Handle tool messages
      if (msg.role === 'tool' && msg.tool_call_id) {
        result.push({
          role: 'tool',
          content: msg.content as string,
          tool_call_id: msg.tool_call_id,
        });
        continue;
      }

      // Handle assistant messages with tool calls
      if (msg.role === 'assistant' && msg.tool_calls) {
        result.push({
          role: 'assistant',
          content: msg.content as string | null,
          tool_calls: msg.tool_calls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          })),
        });
        continue;
      }

      // Standard messages
      if (msg.role === 'user') {
        result.push({ role: 'user', content: msg.content as string, name: msg.name });
      } else if (msg.role === 'assistant') {
        result.push({ role: 'assistant', content: msg.content as string, name: msg.name });
      } else {
        result.push({ role: 'system', content: msg.content as string });
      }
    }

    return result;
  }

  private convertTools(tools: readonly ToolDefinition[]): OpenAI.Chat.Completions.ChatCompletionTool[] {
    return tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        strict: tool.strict,
      },
    }));
  }

  private convertToolChoice(
    toolChoice: 'none' | 'auto' | 'required' | { name: string }
  ): OpenAI.Chat.Completions.ChatCompletionToolChoiceOption {
    if (typeof toolChoice === 'string') {
      return toolChoice;
    }
    return {
      type: 'function',
      function: { name: toolChoice.name },
    };
  }

  private convertResponseFormat(format: ResponseFormat): unknown {
    if (format.type === 'json_object') {
      return { type: 'json_object' };
    }

    if (format.type === 'json_schema' && format.schema) {
      return {
        type: 'json_schema',
        json_schema: {
          name: format.schema.name,
          description: format.schema.description,
          schema: format.schema.schema,
          strict: format.schema.strict ?? true,
        },
      };
    }

    return undefined;
  }

  private extractToolCalls(
    toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]
  ): ToolCall[] {
    return toolCalls.map((tc) => ({
      id: tc.id,
      type: 'function' as const,
      function: {
        name: tc.function.name,
        arguments: tc.function.arguments,
      },
    }));
  }

  private mapFinishReason(reason: string | null | undefined): FinishReason {
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
