import type { TokenUsage } from '../shared/TokenUsage.js';
import type { ToolCall } from './LLMMessage.js';

/**
 * Finish reason for LLM completion.
 */
export type FinishReason =
  | 'stop' // Natural completion
  | 'length' // Max tokens reached
  | 'tool_calls' // Model wants to call tools
  | 'content_filter' // Content filtered by safety systems
  | 'error'; // Error occurred

/**
 * Response from LLM chat completion.
 */
export interface LLMResponse {
  /**
   * Generated content.
   */
  readonly content: string;

  /**
   * Tool calls requested by the model.
   */
  readonly toolCalls?: readonly ToolCall[];

  /**
   * Token usage for this request.
   */
  readonly usage: TokenUsage;

  /**
   * Why the model stopped generating.
   */
  readonly finishReason: FinishReason;

  /**
   * Model that generated the response.
   */
  readonly model: string;

  /**
   * Additional provider-specific metadata.
   */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Chunk of streaming response.
 */
export interface LLMStreamChunk {
  /**
   * Content delta (new content since last chunk).
   */
  readonly content: string;

  /**
   * Tool call deltas (if any).
   */
  readonly toolCallDeltas?: readonly ToolCallDelta[];

  /**
   * Whether this is the final chunk.
   */
  readonly isComplete: boolean;

  /**
   * Finish reason (only present in final chunk).
   */
  readonly finishReason?: FinishReason;

  /**
   * Token usage (usually only in final chunk).
   */
  readonly usage?: TokenUsage;
}

/**
 * Delta for streaming tool calls.
 */
export interface ToolCallDelta {
  readonly id?: string;
  readonly type?: 'function';
  readonly function?: {
    readonly name?: string;
    readonly arguments?: string; // Partial JSON
  };
}

/**
 * Embedding vector.
 */
export interface Embedding {
  /**
   * The embedding vector.
   */
  readonly vector: readonly number[];

  /**
   * Index of this embedding in the batch.
   */
  readonly index: number;

  /**
   * Original input for this embedding (if provided).
   */
  readonly input?: string;
}

/**
 * Response from embedding request.
 */
export interface EmbeddingResponse {
  /**
   * Generated embeddings.
   */
  readonly embeddings: readonly Embedding[];

  /**
   * Token usage for this request.
   */
  readonly usage: TokenUsage;

  /**
   * Model that generated the embeddings.
   */
  readonly model: string;

  /**
   * Dimensions of the embedding vectors.
   */
  readonly dimensions: number;
}

/**
 * Helper functions for working with LLM responses.
 */
export const LLMResponseHelpers = {
  /**
   * Create a success response.
   */
  create(
    content: string,
    usage: TokenUsage,
    model: string,
    finishReason: FinishReason = 'stop',
    toolCalls?: readonly ToolCall[],
    metadata?: Record<string, unknown>
  ): LLMResponse {
    return {
      content,
      toolCalls,
      usage,
      finishReason,
      model,
      metadata
    };
  },

  /**
   * Create a streaming chunk.
   */
  createChunk(
    content: string,
    isComplete: boolean,
    finishReason?: FinishReason,
    usage?: TokenUsage,
    toolCallDeltas?: readonly ToolCallDelta[]
  ): LLMStreamChunk {
    return {
      content,
      toolCallDeltas,
      isComplete,
      finishReason,
      usage
    };
  },

  /**
   * Create an embedding.
   */
  createEmbedding(vector: readonly number[], index: number, input?: string): Embedding {
    return {
      vector,
      index,
      input
    };
  },

  /**
   * Create an embedding response.
   */
  createEmbeddingResponse(
    embeddings: readonly Embedding[],
    usage: TokenUsage,
    model: string,
    dimensions: number
  ): EmbeddingResponse {
    return {
      embeddings,
      usage,
      model,
      dimensions
    };
  },

  /**
   * Check if response has tool calls.
   */
  hasToolCalls(response: LLMResponse): boolean {
    return response.toolCalls !== undefined && response.toolCalls.length > 0;
  },

  /**
   * Get tool call by name.
   */
  getToolCall(response: LLMResponse, name: string): ToolCall | undefined {
    return response.toolCalls?.find((call) => call.function.name === name);
  },

  /**
   * Parse tool call arguments as JSON.
   */
  parseToolArguments<T = unknown>(toolCall: ToolCall): T {
    return JSON.parse(toolCall.function.arguments) as T;
  },

  /**
   * Check if response was truncated due to max tokens.
   */
  isTruncated(response: LLMResponse): boolean {
    return response.finishReason === 'length';
  },

  /**
   * Check if response was filtered by content safety.
   */
  isFiltered(response: LLMResponse): boolean {
    return response.finishReason === 'content_filter';
  },

  /**
   * Calculate total cost from usage and pricing.
   */
  calculateCost(
    usage: TokenUsage,
    promptPricePerMillion: number,
    completionPricePerMillion: number
  ): number {
    const promptCost = (usage.promptTokens / 1_000_000) * promptPricePerMillion;
    const completionCost = (usage.completionTokens / 1_000_000) * completionPricePerMillion;
    return promptCost + completionCost;
  },

  /**
   * Accumulate streaming chunks into a full response.
   */
  accumulateChunks(chunks: readonly LLMStreamChunk[]): {
    content: string;
    toolCalls: ToolCall[];
    usage?: TokenUsage;
    finishReason?: FinishReason;
  } {
    let content = '';
    // Use mutable temporary type for accumulation
    type MutableToolCall = {
      id?: string;
      type?: 'function';
      function?: {
        name: string;
        arguments: string;
      };
    };
    const toolCallsMap = new Map<string, MutableToolCall>();
    let usage: TokenUsage | undefined;
    let finishReason: FinishReason | undefined;

    for (const chunk of chunks) {
      content += chunk.content;

      if (chunk.toolCallDeltas) {
        for (const delta of chunk.toolCallDeltas) {
          if (!delta.id) {
            continue;
          }

          if (!toolCallsMap.has(delta.id)) {
            toolCallsMap.set(delta.id, { id: delta.id, type: 'function' });
          }

          // Accumulate deltas
          const current = toolCallsMap.get(delta.id);

          if (current && delta.function) {
            if (!current.function) {
              current.function = { name: '', arguments: '' };
            }
            if (delta.function.name) {
              current.function.name += delta.function.name;
            }
            if (delta.function.arguments) {
              current.function.arguments += delta.function.arguments;
            }
          }
        }
      }

      if (chunk.usage) {
        usage = chunk.usage;
      }

      if (chunk.isComplete && chunk.finishReason) {
        finishReason = chunk.finishReason;
      }
    }

    // Convert tool calls map to array
    const toolCalls = Array.from(toolCallsMap.values())
      .filter((tc): tc is ToolCall =>
        Boolean(tc.id && tc.type && tc.function?.name && tc.function?.arguments)
      )
      .map((tc) => ({
        ...tc,
        type: 'function' as const
      }));

    return {
      content,
      toolCalls,
      usage,
      finishReason
    };
  }
};
