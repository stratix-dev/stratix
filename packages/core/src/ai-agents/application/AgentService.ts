import { Result, Success, Failure } from '../../result/Result.js';
import type { AgentSpecification } from '../domain/AgentSpecification.js';
import type { LLMPort, LLMRequest, LLMCompletionResponse } from '../domain/ports/LLMPort.js';
import type { ExecutionContext } from '../core/execution/ExecutionContext.js';
import type { LLMMessage } from '../llm/LLMMessage.js';

/**
 * Result of an agent service execution.
 */
export interface AgentServiceResult<TOutput> {
  /**
   * Output data from the agent.
   */
  readonly output: TOutput;

  /**
   * Model that generated the response.
   */
  readonly model: string;

  /**
   * Token usage for this execution.
   */
  readonly usage: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };

  /**
   * Estimated cost in USD.
   */
  readonly cost: number;

  /**
   * Execution duration in milliseconds.
   */
  readonly durationMs: number;
}

/**
 * Error types for agent service execution.
 */
export class AgentServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AgentServiceError';
  }
}

/**
 * Application service for executing AI agents.
 *
 * AgentService is an application layer component that:
 * - Orchestrates agent execution using infrastructure (LLMPort)
 * - Handles cross-cutting concerns (timing, error handling)
 * - Coordinates between domain logic and infrastructure
 *
 * This service should be used when following strict hexagonal architecture.
 * It keeps the domain layer free from I/O operations while still allowing
 * rich agent domain models.
 *
 * Architecture:
 * ```
 * domain/
 *   ├── AgentSpecification.ts        ← Domain entity (no I/O)
 *   └── ports/
 *       └── LLMPort.ts                ← Domain defines interface
 *
 * application/
 *   └── AgentService.ts               ← This class (orchestration)
 *
 * infrastructure/
 *   └── adapters/
 *       ├── OpenAILLMAdapter.ts       ← Implements LLMPort
 *       └── AnthropicLLMAdapter.ts    ← Implements LLMPort
 * ```
 *
 * @example Basic usage
 * ```typescript
 * // Domain layer
 * class CustomerSupportSpec extends AgentSpecification {
 *   buildMessages(query: string): LLMMessage[] {
 *     return [
 *       { role: 'system', content: 'You are a helpful support agent' },
 *       { role: 'user', content: query }
 *     ];
 *   }
 * }
 *
 * // Application layer
 * class CustomerSupportService extends AgentService<string, string> {
 *   protected prepareRequest(
 *     spec: CustomerSupportSpec,
 *     input: string
 *   ): LLMRequest {
 *     return {
 *       messages: spec.buildMessages(input),
 *       config: spec.modelConfig
 *     };
 *   }
 *
 *   protected parseResponse(response: LLMCompletionResponse): string {
 *     return response.content;
 *   }
 * }
 *
 * // Usage
 * const service = new CustomerSupportService(llmPort);
 * const result = await service.execute(spec, 'How do I reset my password?');
 * ```
 *
 * @example With validation
 * ```typescript
 * class ValidatedAgentService extends AgentService<Input, Output> {
 *   protected async validate(
 *     spec: AgentSpecification,
 *     input: Input
 *   ): Promise<Result<void, Error>> {
 *     if (!spec.hasCapability('required-capability')) {
 *       return Failure.create(
 *         new AgentServiceError(
 *           'Agent lacks required capability',
 *           'MISSING_CAPABILITY'
 *         )
 *       );
 *     }
 *     return Success.create(undefined);
 *   }
 * }
 * ```
 *
 * @template TInput - Type of input data for the agent
 * @template TOutput - Type of output data from the agent
 */
export abstract class AgentService<TInput, TOutput> {
  /**
   * Create an agent service.
   *
   * @param llmPort - LLM port for making completions (infrastructure)
   */
  constructor(protected readonly llmPort: LLMPort) {}

  /**
   * Execute the agent with the given specification and input.
   *
   * This method orchestrates the full execution:
   * 1. Validate input (optional hook)
   * 2. Prepare LLM request (abstract method)
   * 3. Call LLM via port (infrastructure)
   * 4. Parse response (abstract method)
   * 5. Return result with metadata
   *
   * @param spec - Agent specification (domain entity)
   * @param input - Input data for the agent
   * @param context - Optional execution context
   * @returns Promise resolving to Result with output or error
   */
  async execute(
    spec: AgentSpecification,
    input: TInput,
    context?: ExecutionContext
  ): Promise<Result<AgentServiceResult<TOutput>, Error>> {
    const startTime = Date.now();

    try {
      // 1. Validate (optional hook)
      const validation = await this.validate(spec, input);
      if (validation.isFailure) {
        return validation as Result<AgentServiceResult<TOutput>, Error>;
      }

      // 2. Prepare LLM request (domain logic)
      const request = this.prepareRequest(spec, input, context);

      // 3. Call LLM (infrastructure)
      const response = await this.llmPort.generate(request);

      // 4. Parse response (domain logic)
      const output = this.parseResponse(response, spec);

      // 5. Calculate metrics
      const durationMs = Date.now() - startTime;
      const cost = this.estimateCost(response, spec);

      // 6. Return result
      return Success.create({
        output,
        model: response.model,
        usage: {
          promptTokens: response.usage.promptTokens,
          completionTokens: response.usage.completionTokens,
          totalTokens: response.usage.totalTokens,
        },
        cost,
        durationMs,
      });
    } catch (error) {
      return Failure.create(
        new AgentServiceError(
          `Agent execution failed: ${(error as Error).message}`,
          'EXECUTION_FAILED',
          error
        )
      );
    }
  }

  /**
   * Execute the agent with streaming.
   *
   * @param spec - Agent specification
   * @param input - Input data
   * @param context - Optional execution context
   * @returns Async iterable of output chunks
   */
  async *executeStream(
    spec: AgentSpecification,
    input: TInput,
    context?: ExecutionContext
  ): AsyncIterable<TOutput> {
    // Validate
    const validation = await this.validate(spec, input);
    if (validation.isFailure) {
      throw validation.error;
    }

    // Prepare request
    const request = this.prepareRequest(spec, input, context);

    // Stream from LLM
    for await (const chunk of this.llmPort.stream(request)) {
      if (chunk.content) {
        yield this.parseStreamChunk(chunk.content, spec);
      }
    }
  }

  /**
   * Prepare the LLM request.
   *
   * This method should build the messages and configuration
   * using domain logic from the specification.
   *
   * @param spec - Agent specification
   * @param input - Input data
   * @param context - Optional execution context
   * @returns LLM request object
   */
  protected abstract prepareRequest(
    spec: AgentSpecification,
    input: TInput,
    context?: ExecutionContext
  ): LLMRequest;

  /**
   * Parse the LLM response into the output type.
   *
   * This method should extract and transform the response
   * into the expected output format.
   *
   * @param response - LLM completion response
   * @param spec - Agent specification
   * @returns Parsed output
   */
  protected abstract parseResponse(
    response: LLMCompletionResponse,
    spec: AgentSpecification
  ): TOutput;

  /**
   * Parse a streaming chunk.
   *
   * Default implementation returns the content as-is.
   * Override for custom parsing.
   *
   * @param content - Chunk content
   * @param _spec - Agent specification (unused in default implementation)
   * @returns Parsed chunk
   */
  protected parseStreamChunk(content: string, _spec: AgentSpecification): TOutput {
    return content as unknown as TOutput;
  }

  /**
   * Validate input before execution.
   *
   * Default implementation succeeds.
   * Override to add custom validation logic.
   *
   * @param _spec - Agent specification (unused in default implementation)
   * @param _input - Input data to validate (unused in default implementation)
   * @returns Result indicating validation success or failure
   */
  protected validate(
    _spec: AgentSpecification,
    _input: TInput
  ): Promise<Result<void, Error>> {
    return Promise.resolve(Success.create(undefined));
  }

  /**
   * Estimate cost for this execution.
   *
   * Default implementation uses simple pricing.
   * Override for provider-specific pricing.
   *
   * @param response - LLM response
   * @param _spec - Agent specification (unused in default implementation)
   * @returns Estimated cost in USD
   */
  protected estimateCost(
    response: LLMCompletionResponse,
    _spec: AgentSpecification
  ): number {
    const inputCostPer1k = 0.03;
    const outputCostPer1k = 0.06;

    const inputCost = (response.usage.promptTokens / 1000) * inputCostPer1k;
    const outputCost = (response.usage.completionTokens / 1000) * outputCostPer1k;

    return inputCost + outputCost;
  }
}

/**
 * Simple agent service implementation for text-to-text agents.
 *
 * This is a convenience class for common use cases where:
 * - Input is text
 * - Output is text
 * - Messages are built from a simple template
 *
 * @example
 * ```typescript
 * const service = new SimpleTextAgentService(
 *   llmPort,
 *   (spec, input) => [
 *     { role: 'system', content: 'You are helpful' },
 *     { role: 'user', content: input }
 *   ]
 * );
 *
 * const result = await service.execute(spec, 'Hello!');
 * ```
 */
export class SimpleTextAgentService extends AgentService<string, string> {
  constructor(
    llmPort: LLMPort,
    private readonly buildMessages: (spec: AgentSpecification, input: string) => LLMMessage[]
  ) {
    super(llmPort);
  }

  protected prepareRequest(spec: AgentSpecification, input: string): LLMRequest {
    return {
      messages: this.buildMessages(spec, input),
      config: spec.modelConfig,
    };
  }

  protected parseResponse(response: LLMCompletionResponse): string {
    return response.content;
  }
}
