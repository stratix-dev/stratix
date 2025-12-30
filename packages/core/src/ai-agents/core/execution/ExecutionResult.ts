import type { Result } from '../../../result/Result.js';
import { Success, Failure } from '../../../result/Result.js';
import type { ExecutionMetadata } from '../../shared/ExecutionMetadata.js';

/**
 * Represents the result of an agent execution.
 *
 * Similar to Result<T, E> but specialized for agent execution with:
 * - Execution metadata (model, tokens, cost, duration)
 * - Warnings for partial success
 * - Monadic operations (map, flatMap)
 * - Conversion to/from standard Result
 *
 * @template T - The type of data returned by the agent
 *
 * @example
 * ```typescript
 * // Success
 * const result = ExecutionResult.success(
 *   { answer: 'Hello!' },
 *   { model: 'gpt-4', usage: {...}, cost: 0.01 }
 * );
 *
 * // Failure
 * const result = ExecutionResult.failure(
 *   new Error('API timeout'),
 *   { model: 'gpt-4', stage: 'generation' }
 * );
 *
 * // Partial result
 * const result = ExecutionResult.partial(
 *   { answer: 'Partial response...' },
 *   { model: 'gpt-4', usage: {...} },
 *   ['Response truncated due to token limit']
 * );
 * ```
 */
export class ExecutionResult<T> {
  /**
   * Private constructor - use static factory methods.
   */
  private constructor(
    public readonly success: boolean,
    public readonly value: T | undefined,
    public readonly error: Error | undefined,
    public readonly metadata: ExecutionMetadata,
    public readonly warnings: readonly string[],
    public readonly partial: boolean
  ) {}

  /**
   * Create a successful execution result.
   *
   * @param value - The successful result value
   * @param metadata - Execution metadata (model, tokens, cost, etc.)
   * @param warnings - Optional warnings (non-fatal issues)
   * @returns Successful ExecutionResult
   */
  static success<T>(
    value: T,
    metadata: ExecutionMetadata,
    warnings: readonly string[] = []
  ): ExecutionResult<T> {
    return new ExecutionResult(
      true,
      value,
      undefined,
      metadata,
      Object.freeze([...warnings]),
      false
    );
  }

  /**
   * Create a partial result (successful but incomplete).
   *
   * Use this when execution succeeded but couldn't complete fully,
   * such as when hitting token limits or timeouts.
   *
   * @param value - The partial result value
   * @param metadata - Execution metadata
   * @param warnings - Warnings explaining why result is partial
   * @returns Partial ExecutionResult
   */
  static partial<T>(
    value: T,
    metadata: ExecutionMetadata,
    warnings: readonly string[]
  ): ExecutionResult<T> {
    if (warnings.length === 0) {
      throw new Error('Partial results must have at least one warning');
    }

    return new ExecutionResult(
      true,
      value,
      undefined,
      metadata,
      Object.freeze([...warnings]),
      true
    );
  }

  /**
   * Create a failed execution result.
   *
   * @param error - The error that occurred
   * @param metadata - Execution metadata
   * @param partialValue - Optional partial value if some work was completed
   * @returns Failed ExecutionResult
   */
  static failure<T>(
    error: Error,
    metadata: ExecutionMetadata,
    partialValue?: T
  ): ExecutionResult<T> {
    return new ExecutionResult(
      false,
      partialValue,
      error,
      metadata,
      [],
      partialValue !== undefined
    );
  }

  /**
   * Type guard for success.
   * Narrows type so that `value` is guaranteed to exist.
   *
   * @returns true if execution was successful
   */
  isSuccess(): this is ExecutionResult<T> & { value: T } {
    return this.success && this.value !== undefined;
  }

  /**
   * Type guard for failure.
   * Narrows type so that `error` is guaranteed to exist.
   *
   * @returns true if execution failed
   */
  isFailure(): this is ExecutionResult<T> & { error: Error } {
    return !this.success;
  }

  /**
   * Check if result has warnings.
   *
   * @returns true if warnings exist
   */
  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  /**
   * Check if result is partial.
   * Partial results are successful but incomplete.
   *
   * @returns true if result is partial
   */
  isPartial(): boolean {
    return this.partial;
  }

  /**
   * Unwrap the value or throw if failure.
   *
   * @returns The success value
   * @throws {Error} The error if result is failure
   */
  unwrap(): T {
    if (this.isFailure()) {
      throw this.error;
    }
    return this.value as T;
  }

  /**
   * Unwrap the value or return a default if failure.
   *
   * @param defaultValue - Default value to return on failure
   * @returns The success value or default
   */
  unwrapOr(defaultValue: T): T {
    return this.isSuccess() ? (this.value as T) : defaultValue;
  }

  /**
   * Unwrap the value or compute a default from the error if failure.
   *
   * @param fn - Function to compute default from error
   * @returns The success value or computed default
   */
  unwrapOrElse(fn: (error: Error) => T): T {
    if (this.isSuccess()) {
      return this.value as T;
    }
    if (this.isFailure()) {
      return fn(this.error);
    }
    // This should never happen but TypeScript needs it
    throw new Error('Invalid ExecutionResult state');
  }

  /**
   * Map the success value to a new value.
   * Failures and metadata pass through unchanged.
   *
   * @template U - New value type
   * @param fn - Mapping function
   * @returns New ExecutionResult with mapped value
   */
  map<U>(fn: (value: T) => U): ExecutionResult<U> {
    if (this.isFailure()) {
      return ExecutionResult.failure<U>(this.error, this.metadata);
    }

    if (this.isSuccess()) {
      try {
        const mapped = fn(this.value);
        return new ExecutionResult(
          true,
          mapped,
          undefined,
          this.metadata,
          this.warnings,
          this.partial
        );
      } catch (error) {
        return ExecutionResult.failure(error as Error, this.metadata);
      }
    }

    // This should never happen
    throw new Error('Invalid ExecutionResult state');
  }

  /**
   * Flat map the success value to a new ExecutionResult.
   * Use when the mapping function returns an ExecutionResult.
   *
   * @template U - New value type
   * @param fn - Mapping function that returns ExecutionResult
   * @returns New ExecutionResult
   */
  flatMap<U>(fn: (value: T) => ExecutionResult<U>): ExecutionResult<U> {
    if (this.isFailure()) {
      return ExecutionResult.failure<U>(this.error, this.metadata);
    }

    if (this.isSuccess()) {
      try {
        return fn(this.value);
      } catch (error) {
        return ExecutionResult.failure(error as Error, this.metadata);
      }
    }

    // This should never happen
    throw new Error('Invalid ExecutionResult state');
  }

  /**
   * Map the error to a new error.
   * Success values pass through unchanged.
   *
   * @param fn - Error mapping function
   * @returns New ExecutionResult with mapped error
   */
  mapError(fn: (error: Error) => Error): ExecutionResult<T> {
    if (this.isSuccess()) {
      return this;
    }

    if (this.isFailure()) {
      return new ExecutionResult(
        false,
        this.value,
        fn(this.error),
        this.metadata,
        this.warnings,
        this.partial
      );
    }

    // This should never happen
    throw new Error('Invalid ExecutionResult state');
  }

  /**
   * Apply a function to the value if success, otherwise do nothing.
   * Used for side effects (logging, metrics, etc.)
   *
   * @param fn - Function to apply
   * @returns This ExecutionResult (for chaining)
   */
  tap(fn: (value: T) => void): ExecutionResult<T> {
    if (this.isSuccess()) {
      fn(this.value);
    }
    return this;
  }

  /**
   * Apply a function to the error if failure, otherwise do nothing.
   * Used for error side effects (logging, metrics, etc.)
   *
   * @param fn - Function to apply
   * @returns This ExecutionResult (for chaining)
   */
  tapError(fn: (error: Error) => void): ExecutionResult<T> {
    if (this.isFailure()) {
      fn(this.error);
    }
    return this;
  }

  /**
   * Recover from failure by providing a fallback value.
   *
   * @param fn - Function to compute fallback from error
   * @returns ExecutionResult with fallback value if was failure
   */
  recover(fn: (error: Error) => T): ExecutionResult<T> {
    if (this.isSuccess()) {
      return this;
    }

    if (this.isFailure()) {
      try {
        const fallback = fn(this.error);
        return ExecutionResult.success(fallback, this.metadata, [
          `Recovered from error: ${this.error.message}`,
        ]);
      } catch (error) {
        return ExecutionResult.failure(error as Error, this.metadata);
      }
    }

    // This should never happen
    throw new Error('Invalid ExecutionResult state');
  }

  /**
   * Convert to standard Result<T, Error>.
   * Loses execution metadata, warnings, and partial status.
   *
   * @returns Standard Result
   */
  toResult(): Result<T, Error> {
    if (this.isSuccess()) {
      return Success.create(this.value);
    }
    if (this.isFailure()) {
      return Failure.create(this.error);
    }
    // This should never happen
    throw new Error('Invalid ExecutionResult state');
  }

  /**
   * Create ExecutionResult from standard Result<T, Error>.
   *
   * @param result - Standard result
   * @param metadata - Execution metadata to attach
   * @returns ExecutionResult
   */
  static fromResult<T>(
    result: Result<T, Error>,
    metadata: ExecutionMetadata
  ): ExecutionResult<T> {
    return result.isSuccess
      ? ExecutionResult.success(result.value, metadata)
      : ExecutionResult.failure(result.error, metadata);
  }

  /**
   * Convert to plain object for serialization.
   *
   * @returns Plain object representation
   */
  toJSON(): object {
    return {
      success: this.success,
      value: this.value,
      error: this.error
        ? {
            name: this.error.name,
            message: this.error.message,
            stack: this.error.stack,
          }
        : undefined,
      metadata: this.metadata,
      warnings: this.warnings,
      partial: this.partial,
    };
  }
}

/**
 * Helper functions for working with multiple ExecutionResults
 */
export const ExecutionResultHelpers = {
  /**
   * Combine multiple results into one.
   * If any result is a failure, returns the first failure.
   * Otherwise, returns success with array of values.
   *
   * @param results - Array of results to combine
   * @returns Combined result
   */
  combine<T>(results: ExecutionResult<T>[]): ExecutionResult<T[]> {
    const values: T[] = [];
    const allWarnings: string[] = [];
    let hasPartial = false;

    for (const result of results) {
      if (result.isFailure()) {
        return ExecutionResult.failure<T[]>(result.error, result.metadata);
      }
      if (result.isSuccess()) {
        values.push(result.value);
        allWarnings.push(...result.warnings);
        if (result.isPartial()) {
          hasPartial = true;
        }
      }
    }

    // Merge metadata from all results
    const metadata =
      results.length > 0 ? results[0].metadata : { model: 'unknown' };

    if (hasPartial || allWarnings.length > 0) {
      return ExecutionResult.partial(values, metadata, allWarnings);
    }

    return ExecutionResult.success(values, metadata);
  },

  /**
   * Run results in sequence, stopping at first failure.
   * Each result can depend on previous results.
   *
   * @param fns - Array of functions returning results
   * @returns Result of sequential execution
   */
  async sequence<T>(
    fns: Array<() => Promise<ExecutionResult<T>>>
  ): Promise<ExecutionResult<T[]>> {
    const results: T[] = [];

    for (const fn of fns) {
      const result = await fn();
      if (result.isFailure()) {
        return ExecutionResult.failure<T[]>(result.error, result.metadata);
      }
      if (result.isSuccess()) {
        results.push(result.value);
      }
    }

    return ExecutionResult.success(
      results,
      { model: 'sequence' } // TODO: aggregate metadata properly
    );
  },
};
