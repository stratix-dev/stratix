import type { ExecutionResult } from '@stratix/core/ai-agents';

// ============================================================================
// Status Assertions
// ============================================================================

/**
 * Assert that an execution result is successful.
 * Narrows the type so that `value` is guaranteed to exist.
 *
 * @param result - Execution result to check
 * @throws {Error} If result is not successful
 *
 * @example
 * ```typescript
 * const result = await agent.execute(input, context);
 * expectSuccess(result);
 * // Now result.value is guaranteed to exist (TypeScript knows this)
 * console.log(result.value);
 * ```
 */
export function expectSuccess<T>(result: ExecutionResult<T>): asserts result is ExecutionResult<T> & { value: T } {
  if (!result.isSuccess()) {
    throw new Error(
      `Expected successful result but got failure: ${result.error?.message || 'unknown error'}`
    );
  }
}

/**
 * Assert that an execution result is partial (successful but incomplete).
 *
 * @param result - Execution result to check
 * @throws {Error} If result is not partial
 *
 * @example
 * ```typescript
 * expectPartial(result);
 * // Result succeeded but may have warnings or incomplete data
 * ```
 */
export function expectPartial<T>(result: ExecutionResult<T>): asserts result is ExecutionResult<T> & { value: T; partial: true } {
  if (!result.isPartial()) {
    if (result.isFailure()) {
      throw new Error(`Expected partial result but got failure: ${result.error?.message}`);
    }
    throw new Error('Expected partial result but got complete success (no warnings)');
  }
}

/**
 * Assert that an execution result is a failure.
 * Narrows the type so that `error` is guaranteed to exist.
 *
 * @param result - Execution result to check
 * @throws {Error} If result is not a failure
 *
 * @example
 * ```typescript
 * const result = await agent.execute(badInput, context);
 * expectFailure(result);
 * // Now result.error is guaranteed to exist
 * console.log(result.error.message);
 * ```
 */
export function expectFailure<T>(result: ExecutionResult<T>): asserts result is ExecutionResult<T> & { error: Error } {
  if (!result.isFailure()) {
    throw new Error('Expected failure but got successful result');
  }
}

// ============================================================================
// Value Assertions
// ============================================================================

/**
 * Assert that the execution result value matches expected value.
 *
 * @param result - Execution result to check
 * @param expected - Expected value
 * @throws {Error} If result is failure or value doesn't match
 *
 * @example
 * ```typescript
 * expectValue(result, { answer: 'Hello!' });
 * ```
 */
export function expectValue<T>(result: ExecutionResult<T>, expected: T): void {
  expectSuccess(result);

  const actual = JSON.stringify(result.value);
  const expectedStr = JSON.stringify(expected);

  if (actual !== expectedStr) {
    throw new Error(`Expected value ${expectedStr} but got ${actual}`);
  }
}

/**
 * Assert that the execution result value matches partial expected values.
 *
 * @param result - Execution result to check
 * @param matcher - Partial object to match against
 * @throws {Error} If result is failure or value doesn't match
 *
 * @example
 * ```typescript
 * expectValueMatches(result, { answer: 'Hello!' });
 * // Other properties in result.value are ignored
 * ```
 */
export function expectValueMatches<T>(result: ExecutionResult<T>, matcher: Partial<T>): void {
  expectSuccess(result);

  const value = result.value as Record<string, unknown>;

  for (const [key, expectedVal] of Object.entries(matcher)) {
    const actualVal = value[key];

    if (JSON.stringify(actualVal) !== JSON.stringify(expectedVal)) {
      throw new Error(
        `Expected property '${key}' to be ${JSON.stringify(expectedVal)} but got ${JSON.stringify(actualVal)}`
      );
    }
  }
}

/**
 * Assert that the execution result value satisfies a predicate.
 *
 * @param result - Execution result to check
 * @param predicate - Function that returns true if value is valid
 * @param message - Optional error message
 * @throws {Error} If result is failure or predicate returns false
 *
 * @example
 * ```typescript
 * expectValueSatisfies(
 *   result,
 *   (value) => value.score > 0.8,
 *   'Score should be > 0.8'
 * );
 * ```
 */
export function expectValueSatisfies<T>(
  result: ExecutionResult<T>,
  predicate: (value: T) => boolean,
  message?: string
): void {
  expectSuccess(result);

  if (!predicate(result.value)) {
    throw new Error(message || 'Value does not satisfy predicate');
  }
}

// ============================================================================
// Warning Assertions
// ============================================================================

/**
 * Assert that execution result contains a specific warning.
 *
 * @param result - Execution result to check
 * @param warning - Warning string or regex to match
 * @throws {Error} If warning is not found
 *
 * @example
 * ```typescript
 * expectWarning(result, 'Token limit reached');
 * expectWarning(result, /token.*limit/i);
 * ```
 */
export function expectWarning(result: ExecutionResult<unknown>, warning: string | RegExp): void {
  if (!result.hasWarnings()) {
    throw new Error('Expected result to have warnings, but found none');
  }

  const found = result.warnings.some((w) => {
    if (typeof warning === 'string') {
      return w.includes(warning);
    }
    return warning.test(w);
  });

  if (!found) {
    throw new Error(
      `Expected warning matching ${warning.toString()} but found: ${result.warnings.join(', ')}`
    );
  }
}

/**
 * Assert that execution result has specific number of warnings.
 *
 * @param result - Execution result to check
 * @param count - Expected number of warnings
 * @throws {Error} If warning count doesn't match
 *
 * @example
 * ```typescript
 * expectWarnings(result, 2);
 * ```
 */
export function expectWarnings(result: ExecutionResult<unknown>, count: number): void {
  const actual = result.warnings.length;

  if (actual !== count) {
    throw new Error(
      `Expected ${count} warning(s) but got ${actual}: ${result.warnings.join(', ')}`
    );
  }
}

/**
 * Assert that execution result has no warnings.
 *
 * @param result - Execution result to check
 * @throws {Error} If warnings exist
 *
 * @example
 * ```typescript
 * expectNoWarnings(result);
 * ```
 */
export function expectNoWarnings(result: ExecutionResult<unknown>): void {
  if (result.hasWarnings()) {
    throw new Error(
      `Expected no warnings but found ${result.warnings.length}: ${result.warnings.join(', ')}`
    );
  }
}

// ============================================================================
// Metadata Assertions
// ============================================================================

/**
 * Assert that execution used a specific model.
 *
 * @param result - Execution result to check
 * @param model - Expected model identifier
 * @throws {Error} If model doesn't match
 *
 * @example
 * ```typescript
 * expectModel(result, 'gpt-4');
 * ```
 */
export function expectModel(result: ExecutionResult<unknown>, model: string): void {
  if (result.metadata.model !== model) {
    throw new Error(`Expected model '${model}' but got '${result.metadata.model}'`);
  }
}

/**
 * Assert that execution used tokens within a range.
 *
 * @param result - Execution result to check
 * @param min - Minimum expected tokens
 * @param max - Optional maximum expected tokens
 * @throws {Error} If token usage is outside range
 *
 * @example
 * ```typescript
 * expectTokensUsed(result, 100, 500);
 * expectTokensUsed(result, 100); // At least 100 tokens
 * ```
 */
export function expectTokensUsed(
  result: ExecutionResult<unknown>,
  min: number,
  max?: number
): void {
  const tokens = result.metadata.usage?.totalTokens;

  if (tokens === undefined) {
    throw new Error('Expected token usage metadata but none was found');
  }

  if (tokens < min) {
    throw new Error(`Expected at least ${min} tokens but used ${tokens}`);
  }

  if (max !== undefined && tokens > max) {
    throw new Error(`Expected at most ${max} tokens but used ${tokens}`);
  }
}

/**
 * Assert that execution cost is within budget.
 *
 * @param result - Execution result to check
 * @param budget - Maximum allowed cost in USD
 * @throws {Error} If cost exceeds budget
 *
 * @example
 * ```typescript
 * expectCostWithinBudget(result, 0.10); // Max $0.10
 * ```
 */
export function expectCostWithinBudget(
  result: ExecutionResult<unknown>,
  budget: number
): void {
  const cost = result.metadata.cost;

  if (cost === undefined) {
    throw new Error('Expected cost metadata but none was found');
  }

  if (cost > budget) {
    throw new Error(`Expected cost <= $${budget.toFixed(4)} but got $${cost.toFixed(4)}`);
  }
}

/**
 * Assert that execution completed within time limit.
 *
 * @param result - Execution result to check
 * @param maxMs - Maximum allowed duration in milliseconds
 * @throws {Error} If duration exceeds limit
 *
 * @example
 * ```typescript
 * expectDuration(result, 5000); // Max 5 seconds
 * ```
 */
export function expectDuration(result: ExecutionResult<unknown>, maxMs: number): void {
  const duration = result.metadata.durationMs;

  if (duration === undefined) {
    throw new Error('Expected duration metadata but none was found');
  }

  if (duration > maxMs) {
    throw new Error(`Expected duration <= ${maxMs}ms but got ${duration}ms`);
  }
}

// ============================================================================
// Error Assertions
// ============================================================================

/**
 * Assert that execution failed with a specific error type.
 *
 * @param result - Execution result to check
 * @param errorType - Expected error constructor
 * @throws {Error} If error type doesn't match
 *
 * @example
 * ```typescript
 * expectError(result, ValidationError);
 * ```
 */
export function expectError<T>(
  result: ExecutionResult<T>,
  errorType: new (...args: unknown[]) => Error
): void {
  expectFailure(result);

  // After expectFailure, result.error is guaranteed to exist
  const error: Error = result.error;
  if (!(error instanceof errorType)) {
    const actualType = Object.getPrototypeOf(error).constructor.name;
    throw new Error(
      `Expected error to be instance of ${errorType.name} but got ${actualType}`
    );
  }
}

/**
 * Assert that execution failed with specific error message.
 *
 * @param result - Execution result to check
 * @param message - Expected error message (string or regex)
 * @throws {Error} If error message doesn't match
 *
 * @example
 * ```typescript
 * expectErrorMessage(result, 'Validation failed');
 * expectErrorMessage(result, /validation.*failed/i);
 * ```
 */
export function expectErrorMessage<T>(
  result: ExecutionResult<T>,
  message: string | RegExp
): void {
  expectFailure(result);

  const matches = typeof message === 'string'
    ? result.error.message.includes(message)
    : message.test(result.error.message);

  if (!matches) {
    throw new Error(
      `Expected error message matching ${message.toString()} but got: ${result.error.message}`
    );
  }
}

// ============================================================================
// Combined Assertions
// ============================================================================

/**
 * Assert that execution succeeded with a specific value.
 * Convenience method combining expectSuccess and expectValue.
 *
 * @param result - Execution result to check
 * @param value - Expected value
 * @throws {Error} If not successful or value doesn't match
 *
 * @example
 * ```typescript
 * expectSuccessWithValue(result, { answer: 'Hello!' });
 * ```
 */
export function expectSuccessWithValue<T>(result: ExecutionResult<T>, value: T): void {
  expectSuccess(result);
  expectValue(result, value);
}

/**
 * Assert that execution is partial with a specific warning.
 * Convenience method combining expectPartial and expectWarning.
 *
 * @param result - Execution result to check
 * @param warning - Expected warning (string or regex)
 * @throws {Error} If not partial or warning doesn't match
 *
 * @example
 * ```typescript
 * expectPartialWithWarning(result, 'Response truncated');
 * ```
 */
export function expectPartialWithWarning<T>(
  result: ExecutionResult<T>,
  warning: string | RegExp
): void {
  expectPartial(result);
  expectWarning(result, warning);
}
