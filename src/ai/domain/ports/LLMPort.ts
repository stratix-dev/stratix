import type { LLMMessage } from '../../llm/LLMMessage.js';
import type { ModelConfig } from '../../core/agent/ModelConfig.js';

/**
 * Token usage information for an LLM request.
 */
export interface TokenUsage {
  /**
   * Number of tokens in the prompt (input).
   */
  readonly promptTokens: number;

  /**
   * Number of tokens in the completion (output).
   */
  readonly completionTokens: number;

  /**
   * Total tokens used (promptTokens + completionTokens).
   */
  readonly totalTokens: number;
}

/**
 * Request to generate a completion from an LLM.
 *
 * This is a simplified, domain-focused request type.
 */
export interface LLMRequest {
  /**
   * Messages in the conversation.
   */
  readonly messages: readonly LLMMessage[];

  /**
   * Model config (model, temperature, etc.).
   */
  readonly config: ModelConfig;

  /**
   * Optional user identifier for tracking.
   */
  readonly user?: string;
}

/**
 * Response from an LLM completion.
 *
 * This is a simplified, domain-focused response type.
 */
export interface LLMCompletionResponse {
  /**
   * Generated text content.
   */
  readonly content: string;

  /**
   * Token usage for this request.
   */
  readonly usage: TokenUsage;

  /**
   * Model that generated the response.
   */
  readonly model: string;

  /**
   * Finish reason (completed, length, stop, etc.).
   */
  readonly finishReason: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'error';

  /**
   * Optional tool calls requested by the model.
   */
  readonly toolCalls?: readonly ToolCall[];
}

/**
 * Tool call requested by the model.
 */
export interface ToolCall {
  /**
   * Unique identifier for this tool call.
   */
  readonly id: string;

  /**
   * Name of the tool to call.
   */
  readonly name: string;

  /**
   * Arguments to pass to the tool (JSON string).
   */
  readonly arguments: string;
}

/**
 * Chunk of a streaming response.
 */
export interface LLMStreamChunk {
  /**
   * Content delta for this chunk.
   */
  readonly content: string;

  /**
   * Whether this is the final chunk.
   */
  readonly done: boolean;

  /**
   * Finish reason (only present in final chunk).
   */
  readonly finishReason?: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'error';
}

/**
 * Port (interface) for LLM operations.
 *
 * This is a domain-level abstraction that defines what the domain needs
 * from an LLM provider, without knowing about implementation details.
 *
 * This port should be defined in the domain layer, and implemented
 * by adapters in the infrastructure layer.
 *
 * Benefits:
 * - Domain remains independent of LLM provider implementations
 * - Easy to test with mock implementations
 * - Can swap providers without changing domain code
 * - Respects dependency inversion principle
 *
 * @example
 * ```TypeScript
 * // domain/ports/LLMPort.ts (interface)
 * export interface LLMPort { ... }
 *
 * // infrastructure/adapters/OpenAILLMAdapter.ts (implementation)
 * export class OpenAILLMAdapter implements LLMPort {
 *   async generate(request: LLMRequest): Promise<LLMCompletionResponse> {
 *     const response = await openai.chat.completions.create({...});
 *     return this.mapToResponse(response);
 *   }
 * }
 *
 * // docorators/services/AgentService.ts (usage)
 * export class AgentService {
 *   constructor(private readonly llm: LLMPort) {}  // ← Depends on abstraction
 *
 *   async execute(spec: AgentSpec, input: Input) {
 *     const response = await this.llm.generate({...});
 *     return response;
 *   }
 * }
 * ```
 */
export interface LLMPort {
  /**
   * Generate a completion from the LLM.
   *
   * @param request - Completion request
   * @returns Promise resolving to completion response
   */
  generate(request: LLMRequest): Promise<LLMCompletionResponse>;

  /**
   * Generate a streaming completion from the LLM.
   *
   * @param request - Completion request
   * @returns Async iterable of response chunks
   */
  stream(request: LLMRequest): AsyncIterable<LLMStreamChunk>;
}

/**
 * Helpers for working with LLMPort.
 */
export const LLMPortHelpers = {
  /**
   * Create a simple LLM request.
   *
   * @param messages - Conversation messages
   * @param config - Model config
   * @returns LLM request object
   */
  createRequest(messages: readonly LLMMessage[], config: ModelConfig): LLMRequest {
    return {
      messages,
      config
    };
  },

  /**
   * Calculate cost from token usage.
   * Uses simple pricing model (customize per provider).
   *
   * @param usage - Token usage
   * @param _model - Model name (unused in default implementation)
   * @returns Estimated cost in USD
   */
  estimateCost(usage: TokenUsage, _model: string): number {
    // Simplified pricing (should be provider-specific in real implementation)
    const inputCostPer1k = 0.03; // $0.03 per 1k input tokens
    const outputCostPer1k = 0.06; // $0.06 per 1k output tokens

    const inputCost = (usage.promptTokens / 1000) * inputCostPer1k;
    const outputCost = (usage.completionTokens / 1000) * outputCostPer1k;

    return inputCost + outputCost;
  }
};
