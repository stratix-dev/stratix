import type { LLMMessage } from './LLMMessage.js';
import type { LLMResponse, LLMStreamChunk, EmbeddingResponse } from './LLMResponse.js';
import type { ModelConfig } from '../core/agent/ModelConfig.js';

/**
 * Tool definition for LLM function calling.
 *
 * This is the single source of truth for tool definitions,
 * used across the entire LLM and tools subsystems.
 */
export interface ToolDefinition {
  /**
   * Function name (must be valid identifier).
   */
  readonly name: string;

  /**
   * Human-readable description of what the function does.
   */
  readonly description: string;

  /**
   * JSON schema for the function parameters.
   */
  readonly parameters: {
    readonly type: 'object';
    readonly properties: Record<string, unknown>;
    readonly required?: readonly string[];
    readonly additionalProperties?: boolean;
  };

  /**
   * Whether this function is strict (parameters validated against schema).
   */
  readonly strict?: boolean;
}

/**
 * Response format specification for structured output.
 */
export interface ResponseFormat {
  /**
   * Type of response format.
   */
  readonly type: 'text' | 'json_object' | 'json_schema';

  /**
   * JSON schema (required when type is 'json_schema').
   */
  readonly schema?: {
    readonly name: string;
    readonly description?: string;
    readonly schema: Record<string, unknown>;
    readonly strict?: boolean;
  };
}

/**
 * Parameters for chat completion.
 */
export interface ChatCompletionParams {
  /**
   * Model to use for completion.
   */
  readonly model: string;

  /**
   * Messages in the conversation.
   */
  readonly messages: readonly LLMMessage[];

  /**
   * Model config (temperature, maxTokens, etc.).
   * If not provided, uses provider defaults.
   */
  readonly config?: Partial<ModelConfig>;

  /**
   * Tools available for the model to call.
   */
  readonly tools?: readonly ToolDefinition[];

  /**
   * Tool choice strategy.
   */
  readonly toolChoice?: 'none' | 'auto' | 'required' | { name: string };

  /**
   * Response format specification.
   */
  readonly responseFormat?: ResponseFormat;

  /**
   * User identifier for tracking and abuse prevention.
   */
  readonly user?: string;
}

/**
 * Parameters for embedding generation.
 */
export interface EmbeddingParams {
  /**
   * Model to use for embeddings.
   */
  readonly model: string;

  /**
   * Input text(s) to embed.
   */
  readonly input: string | readonly string[];

  /**
   * Dimensions of the embedding vector (if model supports it).
   */
  readonly dimensions?: number;

  /**
   * Encoding format for the embeddings.
   */
  readonly encodingFormat?: 'float' | 'base64';

  /**
   * User identifier for tracking.
   */
  readonly user?: string;
}

/**
 * Provider capabilities.
 */
export interface ProviderCapabilities {
  /**
   * Whether provider supports function/tool calling.
   */
  readonly toolCalling: boolean;

  /**
   * Whether provider supports streaming responses.
   */
  readonly streaming: boolean;

  /**
   * Whether provider supports embeddings.
   */
  readonly embeddings: boolean;

  /**
   * Whether provider supports vision (image inputs).
   */
  readonly vision: boolean;

  /**
   * Whether provider supports structured output (JSON mode).
   */
  readonly structuredOutput: boolean;

  /**
   * Maximum context window size (in tokens).
   */
  readonly maxContextTokens: number;

  /**
   * Maximum output tokens per request.
   */
  readonly maxOutputTokens: number;
}

/**
 * Interface for LLM (Large Language Model) providers.
 *
 * Implementations provide access to AI models like GPT-4, Claude, Gemini, etc.
 * This interface is provider-agnostic and works with any LLM API.
 *
 * @example
 * ```TypeScript
 * class OpenAIProvider implements LLMProvider {
 *   readonly name = 'openai';
 *   readonly models = ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'];
 *
 *   async chat(params: ChatCompletionParams): Promise<LLMResponse> {
 *     // Call OpenAI API
 *     const response = await openai.chat.completions.create({
 *       model: params.model,
 *       messages: params.messages,
 *       ...
 *     });
 *     return this.mapResponse(response);
 *   }
 *
 *   async *streamChat(params: ChatCompletionParams): AsyncIterable<LLMStreamChunk> {
 *     // Stream from OpenAI API
 *     const stream = await openai.chat.completions.create({
 *       model: params.model,
 *       messages: params.messages,
 *       stream: true,
 *       ...
 *     });
 *     for await (const chunk of stream) {
 *       yield this.mapChunk(chunk);
 *     }
 *   }
 * }
 * ```
 */
export interface LLMProvider {
  /**
   * Unique name of the provider (e.g., 'openai', 'anthropic', 'local').
   */
  readonly name: string;

  /**
   * List of supported model names.
   */
  readonly models: readonly string[];

  /**
   * Provider capabilities.
   */
  readonly capabilities: ProviderCapabilities;

  /**
   * Send a chat completion request.
   *
   * @param params - Chat completion parameters
   * @returns The completion response
   */
  chat(params: ChatCompletionParams): Promise<LLMResponse>;

  /**
   * Stream a chat completion response.
   *
   * @param params - Chat completion parameters
   * @returns Async iterable of response chunks
   */
  streamChat(params: ChatCompletionParams): AsyncIterable<LLMStreamChunk>;

  /**
   * Generate embeddings for the given input.
   *
   * @param params - Embedding parameters
   * @returns The embedding vectors
   */
  embeddings(params: EmbeddingParams): Promise<EmbeddingResponse>;

  /**
   * Get capabilities for a specific model.
   *
   * @param model - Model name
   * @returns Capabilities for the model, or undefined if not supported
   */
  getModelCapabilities?(model: string): ProviderCapabilities | undefined;

  /**
   * Estimate cost for a request (in USD).
   *
   * @param model - Model name
   * @param promptTokens - Number of prompt tokens
   * @param completionTokens - Number of completion tokens
   * @returns Estimated cost in USD
   */
  estimateCost?(model: string, promptTokens: number, completionTokens: number): number;

  /**
   * Validate that a model is supported.
   *
   * @param model - Model name
   * @returns True if model is supported
   */
  supportsModel(model: string): boolean;
}

/**
 * Helper functions for working with LLM providers.
 */
export const LLMProviderHelpers = {
  /**
   * Validate chat completion params.
   */
  validateChatParams(params: ChatCompletionParams): string[] {
    const errors: string[] = [];

    if (!params.model) {
      errors.push('Model is required');
    }

    if (!params.messages || params.messages.length === 0) {
      errors.push('At least one message is required');
    }

    if (params.tools) {
      for (const tool of params.tools) {
        if (!tool.name) {
          errors.push('Tool name is required');
        }
        if (!tool.description) {
          errors.push(`Tool ${tool.name} must have a description`);
        }
        if (!tool.parameters) {
          errors.push(`Tool ${tool.name} must have parameters schema`);
        }
      }
    }

    return errors;
  },

  /**
   * Validate embedding params.
   */
  validateEmbeddingParams(params: EmbeddingParams): string[] {
    const errors: string[] = [];

    if (!params.model) {
      errors.push('Model is required');
    }

    if (!params.input || (Array.isArray(params.input) && params.input.length === 0)) {
      errors.push('Input is required');
    }

    return errors;
  },

  /**
   * Check if params are valid.
   */
  isValidChatParams(params: ChatCompletionParams): boolean {
    return LLMProviderHelpers.validateChatParams(params).length === 0;
  },

  /**
   * Check if embedding params are valid.
   */
  isValidEmbeddingParams(params: EmbeddingParams): boolean {
    return LLMProviderHelpers.validateEmbeddingParams(params).length === 0;
  },

  /**
   * Create default provider capabilities.
   */
  createDefaultCapabilities(overrides?: Partial<ProviderCapabilities>): ProviderCapabilities {
    return {
      toolCalling: false,
      streaming: false,
      embeddings: false,
      vision: false,
      structuredOutput: false,
      maxContextTokens: 4096,
      maxOutputTokens: 4096,
      ...overrides
    };
  }
};
