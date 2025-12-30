import type {
  LLMPort,
  LLMRequest,
  LLMCompletionResponse,
  LLMStreamChunk,
} from '@stratix/core';
import { OpenAIProvider } from '@stratix/ai-openai';

/**
 * Adapter that implements LLMPort using OpenAI provider.
 *
 * This is an infrastructure component that adapts the concrete
 * OpenAIProvider to the domain-defined LLMPort interface.
 *
 * Benefits:
 * - Domain depends on LLMPort (abstraction)
 * - Infrastructure depends on LLMPort (abstraction)
 * - OpenAIProvider can change without affecting domain
 * - Easy to swap providers (just create new adapter)
 *
 * @example
 * ```typescript
 * // infrastructure/bootstrap.ts
 * const adapter = new OpenAILLMAdapter(process.env.OPENAI_API_KEY);
 *
 * // application/bootstrap.ts
 * const service = new CustomerSupportService(adapter);
 * ```
 */
export class OpenAILLMAdapter implements LLMPort {
  private provider: OpenAIProvider;

  constructor(apiKey: string) {
    this.provider = new OpenAIProvider({ apiKey });
  }

  /**
   * Generate a completion using OpenAI.
   */
  async generate(request: LLMRequest): Promise<LLMCompletionResponse> {
    // Adapt domain request to provider format
    const response = await this.provider.chat({
      model: request.config.model,
      messages: request.messages,
      config: {
        temperature: request.config.temperature,
        maxTokens: request.config.maxTokens,
        topP: request.config.topP,
      },
      user: request.user,
    });

    // Adapt provider response to domain format
    return {
      content: response.content,
      usage: {
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
      },
      model: response.model,
      finishReason: this.mapFinishReason(response.finishReason),
      toolCalls: response.toolCalls?.map((tc) => ({
        id: tc.id,
        name: tc.name,
        arguments: tc.arguments,
      })),
    };
  }

  /**
   * Stream a completion using OpenAI.
   */
  async *stream(request: LLMRequest): AsyncIterable<LLMStreamChunk> {
    const stream = this.provider.streamChat({
      model: request.config.model,
      messages: request.messages,
      config: {
        temperature: request.config.temperature,
        maxTokens: request.config.maxTokens,
      },
      user: request.user,
    });

    for await (const chunk of stream) {
      yield {
        content: chunk.content,
        done: chunk.done,
        finishReason: chunk.finishReason
          ? this.mapFinishReason(chunk.finishReason)
          : undefined,
      };
    }
  }

  /**
   * Map provider finish reason to domain finish reason.
   */
  private mapFinishReason(
    reason: string
  ): 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'error' {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      case 'tool_calls':
      case 'function_call':
        return 'tool_calls';
      default:
        return 'error';
    }
  }
}
