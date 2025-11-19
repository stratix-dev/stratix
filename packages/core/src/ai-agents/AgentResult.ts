import type { AgentExecutionMetadata } from './types.js';
import type { ExecutionTrace } from './ExecutionTrace.js';

/**
 * Represents the result of an agent execution.
 *
 * @template T - The type of data returned by the agent
 *
 * @example
 * ```typescript
 * // Success case
 * const result = AgentResult.success(
 *   { response: "Hello!", sentiment: "positive" },
 *   { model: "gpt-4", cost: 0.02 }
 * );
 *
 * // Failure case
 * const result = AgentResult.failure(
 *   new Error("API timeout"),
 *   { model: "gpt-4", stage: "execution" }
 * );
 * ```
 */
export class AgentResult<T> {
  private constructor(
    public readonly success: boolean,
    public readonly data: T | undefined,
    public readonly error: Error | undefined,
    public readonly metadata: AgentExecutionMetadata,
    public readonly warnings: string[] = [],
    public readonly partial: boolean = false,
    public trace?: ExecutionTrace
  ) { }

  /**
   * Creates a successful agent result
   *
   * @param data - The successful result data
   * @param metadata - Execution metadata (model, cost, tokens, etc.)
   * @param warnings - Optional warnings to include
   * @returns A successful AgentResult
   */
  static success<T>(
    data: T,
    metadata: AgentExecutionMetadata,
    warnings: string[] = []
  ): AgentResult<T> {
    return new AgentResult(true, data, undefined, metadata, warnings, false);
  }

  /**
   * Creates a partial result (successful but incomplete)
   *
   * @param data - The partial result data
   * @param metadata - Execution metadata
   * @param warnings - Warnings explaining why result is partial
   * @returns A partial AgentResult
   */
  static partial<T>(
    data: T,
    metadata: AgentExecutionMetadata,
    warnings: string[]
  ): AgentResult<T> {
    return new AgentResult(true, data, undefined, metadata, warnings, true);
  }

  /**
   * Creates a failed agent result
   *
   * @param error - The error that occurred
   * @param metadata - Execution metadata
   * @param partialData - Optional partial data if some work was completed
   * @returns A failed AgentResult
   */
  static failure<T>(
    error: Error,
    metadata: AgentExecutionMetadata,
    partialData?: T
  ): AgentResult<T> {
    return new AgentResult<T>(
      false,
      partialData,
      error,
      metadata,
      [],
      partialData !== undefined
    );
  }

  /**
   * Checks if the result is successful
   */
  isSuccess(): this is AgentResult<T> & { data: T } {
    return this.success;
  }

  /**
   * Checks if the result is a failure
   */
  isFailure(): this is AgentResult<T> & { error: Error } {
    return !this.success;
  }

  /**
   * Checks if the result has warnings
   */
  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  /**
   * Checks if the result is partial
   */
  isPartial(): boolean {
    return this.partial;
  }

  /**
   * Gets the data or throws if the result is a failure
   *
   * @throws {Error} If the result is a failure
   */
  unwrap(): T {
    if (this.isFailure()) {
      throw this.error;
    }
    return this.data as T;
  }

  /**
   * Gets the data or returns a default value if the result is a failure
   *
   * @param defaultValue - The default value to return on failure
   */
  unwrapOr(defaultValue: T): T {
    return this.isSuccess() ? (this.data as T) : defaultValue;
  }

  /**
   * Attaches an execution trace to this result
   *
   * @param trace - The execution trace
   */
  withTrace(trace: ExecutionTrace): this {
    this.trace = trace;
    return this;
  }
}
