import type {
  LLMProvider,
  ChatCompletionParams,
  LLMResponse,
  LLMStreamChunk,
  EmbeddingParams,
  EmbeddingResponse,
  ProviderCapabilities,
  LLMMessage,
  ToolCall,
  TokenUsage,
} from '@stratix/core/ai-agents';

/**
 * Mock response configuration
 */
export interface MockResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  delay?: number;
}

/**
 * Mock LLM Provider for testing AI agents without making actual API calls.
 *
 * @example
 * ```typescript
 * const mockProvider = new MockLLMProvider();
 *
 * // Set deterministic response
 * mockProvider.setResponse({
 *   content: '{"result": "success"}',
 *   usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
 * });
 *
 * // Use in tests
 * const agent = new MyAgent({ provider: mockProvider });
 * const result = await agent.execute(input);
 * ```
 */
export class MockLLMProvider implements LLMProvider {
  readonly name = 'mock';
  readonly models = ['mock-model'];
  readonly capabilities: ProviderCapabilities = {
    toolCalling: true,
    streaming: true,
    embeddings: true,
    vision: false,
    structuredOutput: true,
    maxContextTokens: 100000,
    maxOutputTokens: 4096,
  };

  private responses: MockResponse[] = [];
  private currentResponseIndex = 0;
  private callHistory: ChatCompletionParams[] = [];

  /**
   * Sets a single response that will be returned for all calls
   */
  setResponse(response: MockResponse): void {
    this.responses = [response];
    this.currentResponseIndex = 0;
  }

  /**
   * Sets multiple responses that will be returned in sequence
   */
  setResponses(responses: MockResponse[]): void {
    this.responses = responses;
    this.currentResponseIndex = 0;
  }

  /**
   * Adds a response to the queue
   */
  addResponse(response: MockResponse): void {
    this.responses.push(response);
  }

  /**
   * Gets the call history for assertions
   */
  getCallHistory(): ReadonlyArray<ChatCompletionParams> {
    return this.callHistory;
  }

  /**
   * Gets the last call made to the provider
   */
  getLastCall(): ChatCompletionParams | undefined {
    return this.callHistory[this.callHistory.length - 1];
  }

  /**
   * Gets the number of calls made
   */
  getCallCount(): number {
    return this.callHistory.length;
  }

  /**
   * Clears all responses and call history
   */
  reset(): void {
    this.responses = [];
    this.currentResponseIndex = 0;
    this.callHistory = [];
  }

  /**
   * Implements chat method
   */
  async chat(params: ChatCompletionParams): Promise<LLMResponse> {
    this.callHistory.push(params);

    if (this.responses.length === 0) {
      throw new Error('No mock responses configured. Use setResponse() or setResponses()');
    }

    const response = this.responses[this.currentResponseIndex];

    // Cycle through responses or stick to last one
    if (this.currentResponseIndex < this.responses.length - 1) {
      this.currentResponseIndex++;
    }

    // Simulate delay if specified
    if (response.delay) {
      await new Promise((resolve) => setTimeout(resolve, response.delay));
    }

    return {
      content: response.content,
      usage: response.usage || {
        promptTokens: 10,
        completionTokens: 10,
        totalTokens: 20,
      },
      finishReason: response.finishReason || 'stop',
      toolCalls: undefined,
      model: params.model,
    };
  }

  /**
   * Implements streamChat method
   */
  async *streamChat(params: ChatCompletionParams): AsyncIterable<LLMStreamChunk> {
    this.callHistory.push(params);

    if (this.responses.length === 0) {
      throw new Error('No mock responses configured');
    }

    const response = this.responses[this.currentResponseIndex];

    if (this.currentResponseIndex < this.responses.length - 1) {
      this.currentResponseIndex++;
    }

    // Split content into chunks
    const words = response.content.split(' ');
    const delayPerWord = response.delay !== undefined ? response.delay / words.length : 0;

    for (let i = 0; i < words.length; i++) {
      const chunk: LLMStreamChunk = {
        content: words[i] + (i < words.length - 1 ? ' ' : ''),
        isComplete: i === words.length - 1,
      };

      if (delayPerWord > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayPerWord));
      }

      yield chunk;
    }
  }

  /**
   * Implements embeddings method
   */
  async embeddings(params: EmbeddingParams): Promise<EmbeddingResponse> {
    const inputs = Array.isArray(params.input) ? params.input : [params.input];
    const tokenCount = inputs.join(' ').split(' ').length;
    const dimensions = params.dimensions || 1536;

    return {
      embeddings: inputs.map((input, index) => ({
        vector: Array.from({ length: dimensions }, () => Math.random()),
        index,
        input,
      })),
      usage: {
        promptTokens: tokenCount,
        completionTokens: 0,
        totalTokens: tokenCount,
      },
      model: params.model,
      dimensions,
    };
  }

  /**
   * Check if a model is supported
   */
  supportsModel(model: string): boolean {
    return this.models.includes(model);
  }

  // ============================================================================
  // Static Factory Methods
  // ============================================================================

  /**
   * Creates a mock response with JSON content
   */
  static jsonResponse(data: unknown, usage?: Partial<TokenUsage>): MockResponse {
    return {
      content: JSON.stringify(data),
      usage: {
        promptTokens: usage?.promptTokens || 10,
        completionTokens: usage?.completionTokens || 20,
        totalTokens: usage?.totalTokens || 30,
      },
      finishReason: 'stop',
    };
  }

  /**
   * Creates a mock error response
   */
  static errorResponse(message: string): MockResponse {
    return {
      content: JSON.stringify({ error: message }),
      usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 },
      finishReason: 'stop',
    };
  }

  /**
   * Creates a mock response with simulated streaming (chunked delivery)
   */
  static streamedResponse(content: string, _chunkSize?: number, delayMs?: number): MockResponse {
    return {
      content,
      delay: delayMs || 100,
      finishReason: 'stop',
    };
  }

  // ============================================================================
  // Call History Analysis
  // ============================================================================

  /**
   * Gets messages from the last call
   */
  getLastMessages(): readonly LLMMessage[] {
    const lastCall = this.getLastCall();
    return lastCall?.messages || [];
  }

  /**
   * Gets messages by role from all calls
   */
  getMessagesByRole(role: 'system' | 'user' | 'assistant' | 'tool'): readonly LLMMessage[] {
    const allMessages: LLMMessage[] = [];
    for (const call of this.callHistory) {
      const filtered = call.messages.filter((msg) => msg.role === role);
      allMessages.push(...filtered);
    }
    return allMessages;
  }

  /**
   * Gets all tool calls from call history
   */
  getToolCalls(): readonly ToolCall[] {
    // Tool calls would be in the responses, but for now we return empty
    // This is a placeholder for when tool calling is fully implemented
    return [];
  }

  // ============================================================================
  // Assertions
  // ============================================================================

  /**
   * Asserts that the provider was called a specific number of times
   */
  assertCalled(times?: number): void {
    if (times === undefined) {
      if (this.callHistory.length === 0) {
        throw new Error('Expected provider to be called, but it was not called');
      }
    } else {
      if (this.callHistory.length !== times) {
        throw new Error(
          `Expected provider to be called ${times} time(s), but it was called ${this.callHistory.length} time(s)`
        );
      }
    }
  }

  /**
   * Asserts that the provider was called with specific parameters
   */
  assertCalledWith(matcher: Partial<ChatCompletionParams>): void {
    if (this.callHistory.length === 0) {
      throw new Error('Expected provider to be called with specific params, but it was not called');
    }

    const lastCall = this.getLastCall()!;
    const mismatches: string[] = [];

    if (matcher.model !== undefined && lastCall.model !== matcher.model) {
      mismatches.push(`model: expected "${matcher.model}", got "${lastCall.model}"`);
    }

    if (matcher.tools !== undefined && JSON.stringify(lastCall.tools) !== JSON.stringify(matcher.tools)) {
      mismatches.push(`tools: mismatch`);
    }

    if (matcher.toolChoice !== undefined && lastCall.toolChoice !== matcher.toolChoice) {
      mismatches.push(`toolChoice: expected "${matcher.toolChoice}", got "${lastCall.toolChoice}"`);
    }

    if (mismatches.length > 0) {
      throw new Error(`Provider call parameter mismatch:\n  ${mismatches.join('\n  ')}`);
    }
  }

  /**
   * Asserts that the provider was not called
   */
  assertNotCalled(): void {
    if (this.callHistory.length > 0) {
      throw new Error(`Expected provider not to be called, but it was called ${this.callHistory.length} time(s)`);
    }
  }
}
