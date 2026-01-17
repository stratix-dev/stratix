/**
 * Retry config for operations that may fail transiently.
 *
 * Used by:
 * - Agent execution
 * - Tool execution
 * - Workflow steps
 * - LLM API calls
 *
 * Supports exponential backoff with jitter to prevent thundering herd problems.
 *
 * @example
 * ```typescript
 * const policy: RetryPolicy = {
 *   maxRetries: 3,
 *   initialDelayMs: 1000,
 *   maxDelayMs: 10000,
 *   backoffMultiplier: 2,
 *   jitterFactor: 0.1,
 *   retryableErrorCodes: ['RATE_LIMIT', 'TIMEOUT']
 * };
 * ```
 */
export interface RetryPolicy {
  /**
   * Maximum number of retry attempts.
   * 0 = no retries, 1 = one retry, etc.
   */
  readonly maxRetries: number;

  /**
   * Initial delay in milliseconds before first retry.
   */
  readonly initialDelayMs: number;

  /**
   * Maximum delay in milliseconds between retries.
   * Prevents exponential backoff from growing too large.
   */
  readonly maxDelayMs: number;

  /**
   * Multiplier for exponential backoff.
   *
   * @example
   * ```
   * initialDelay = 100ms, backoffMultiplier = 2
   * Retry 1: 100ms
   * Retry 2: 200ms
   * Retry 3: 400ms
   * Retry 4: 800ms
   * ```
   */
  readonly backoffMultiplier: number;

  /**
   * Jitter factor to add randomness to retry delays.
   * Prevents thundering herd problem when many clients retry simultaneously.
   *
   * Value between 0 (no jitter) and 1 (full jitter).
   * - 0.1 = ±10% randomness
   * - 0.5 = ±50% randomness
   * - 1.0 = ±100% randomness (full jitter)
   *
   * @default 0
   */
  readonly jitterFactor?: number;

  /**
   * Error codes that should trigger a retry.
   * If undefined, all errors are considered retryable.
   *
   * @example ['RATE_LIMIT', 'TIMEOUT', 'SERVICE_UNAVAILABLE']
   */
  readonly retryableErrorCodes?: string[];

  /**
   * Custom predicate to determine if an error is retryable.
   * Overrides retryableErrorCodes if provided.
   *
   * @param error - The error that occurred
   * @param attempt - Current attempt number (1-based)
   * @returns true if the operation should be retried
   */
  readonly shouldRetry?: (error: Error, attempt: number) => boolean;
}

/**
 * Predefined retry policies for common scenarios.
 */
export const RetryPolicies = {
  /**
   * No retries - fail immediately on error.
   */
  NONE: {
    maxRetries: 0,
    initialDelayMs: 0,
    maxDelayMs: 0,
    backoffMultiplier: 1
  } as const satisfies RetryPolicy,

  /**
   * Conservative retry policy.
   * Good for user-facing operations where latency matters.
   * - 3 retries
   * - 1 second initial delay
   * - Up to 10 seconds max delay
   * - 10% jitter
   */
  CONSERVATIVE: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    jitterFactor: 0.1
  } as const satisfies RetryPolicy,

  /**
   * Aggressive retry policy.
   * Good for background tasks where success rate matters more than latency.
   * - 5 retries
   * - 100ms initial delay
   * - Up to 5 seconds max delay
   * - 20% jitter
   */
  AGGRESSIVE: {
    maxRetries: 5,
    initialDelayMs: 100,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
    jitterFactor: 0.2
  } as const satisfies RetryPolicy,

  /**
   * LLM API retry policy.
   * Specifically tuned for rate limits and transient failures.
   * - 3 retries
   * - 2 seconds initial delay (rate limits often have 1s windows)
   * - Up to 30 seconds max delay
   * - 30% jitter (high variance in rate limit windows)
   * - Only retry specific error codes
   */
  LLM_API: {
    maxRetries: 3,
    initialDelayMs: 2000,
    maxDelayMs: 30000,
    backoffMultiplier: 3,
    jitterFactor: 0.3,
    retryableErrorCodes: ['RATE_LIMIT', 'TIMEOUT', 'SERVICE_UNAVAILABLE']
  } as const satisfies RetryPolicy,

  /**
   * Network retry policy.
   * For network-related failures with quick recovery.
   * - 4 retries
   * - 500ms initial delay
   * - Up to 8 seconds max delay
   * - 15% jitter
   */
  NETWORK: {
    maxRetries: 4,
    initialDelayMs: 500,
    maxDelayMs: 8000,
    backoffMultiplier: 2,
    jitterFactor: 0.15,
    retryableErrorCodes: ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'NETWORK_ERROR']
  } as const satisfies RetryPolicy
} as const;

/**
 * Helper functions for working with retry policies
 */
export const RetryPolicyHelpers = {
  /**
   * Calculate the delay for a given attempt number.
   *
   * @param policy - The retry policy
   * @param attempt - Attempt number (1-based)
   * @returns Delay in milliseconds, with jitter applied
   */
  calculateDelay(policy: RetryPolicy, attempt: number): number {
    if (attempt <= 0) {
      throw new Error('Attempt must be >= 1');
    }

    // Calculate base delay with exponential backoff
    const exponentialDelay =
      policy.initialDelayMs * Math.pow(policy.backoffMultiplier, attempt - 1);

    // Cap at max delay
    const cappedDelay = Math.min(exponentialDelay, policy.maxDelayMs);

    // Apply jitter if configured
    if (policy.jitterFactor && policy.jitterFactor > 0) {
      const jitterRange = cappedDelay * policy.jitterFactor;
      const jitter = (Math.random() * 2 - 1) * jitterRange; // Random between -jitterRange and +jitterRange
      return Math.max(0, cappedDelay + jitter);
    }

    return cappedDelay;
  },

  /**
   * Check if an error is retryable according to the policy.
   *
   * @param policy - The retry policy
   * @param error - The error to check
   * @param attempt - Current attempt number (1-based)
   * @returns true if the error should trigger a retry
   */
  isRetryable(policy: RetryPolicy, error: Error, attempt: number): boolean {
    // If custom shouldRetry is provided, use it
    if (policy.shouldRetry) {
      return policy.shouldRetry(error, attempt);
    }

    // If no error codes specified, all errors are retryable
    if (!policy.retryableErrorCodes || policy.retryableErrorCodes.length === 0) {
      return true;
    }

    // Check if error code matches
    const errorWithCode = error as Error & { code?: string };
    const errorCode = errorWithCode.code ?? 'UNKNOWN';
    return policy.retryableErrorCodes.includes(errorCode);
  },

  /**
   * Check if we should attempt another retry.
   *
   * @param policy - The retry policy
   * @param attempt - Current attempt number (1-based)
   * @returns true if we haven't exceeded max retries
   */
  shouldAttemptRetry(policy: RetryPolicy, attempt: number): boolean {
    return attempt <= policy.maxRetries;
  }
};
