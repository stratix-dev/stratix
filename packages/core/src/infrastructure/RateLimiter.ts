/**
 * Result of a rate limit check
 * @category Infrastructure
 */
export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  readonly allowed: boolean;

  /**
   * Number of remaining requests in the current window
   */
  readonly remaining: number;

  /**
   * Maximum requests allowed per window
   */
  readonly limit: number;

  /**
   * Time in milliseconds until the limit resets
   */
  readonly resetIn: number;

  /**
   * ISO timestamp when the limit resets
   */
  readonly resetAt: Date;

  /**
   * Time to wait before retrying (if not allowed), in milliseconds
   */
  readonly retryAfter?: number;
}

/**
 * Configuration for rate limiting
 */
export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  readonly maxRequests: number;

  /**
   * Time window in milliseconds
   */
  readonly windowMs: number;

  /**
   * Optional key prefix for namespacing
   */
  readonly keyPrefix?: string;
}

/**
 * Rate limiter interface for controlling request rates.
 *
 * Implements token bucket or similar algorithms to prevent abuse
 * and ensure fair resource usage across agents and operations.
 *
 * @example
 * ```typescript
 * const limiter = new TokenBucketRateLimiter({
 *   maxRequests: 100,
 *   windowMs: 60000 // 100 requests per minute
 * });
 *
 * // Check if request is allowed
 * const result = await limiter.check('user:123');
 * if (!result.allowed) {
 *   throw new Error(`Rate limit exceeded. Retry after ${result.retryAfter}ms`);
 * }
 *
 * // Consume a token
 * await limiter.consume('user:123');
 *
 * // Consume multiple tokens
 * await limiter.consume('user:123', 5);
 * ```
 */
export interface RateLimiter {
  /**
   * Check if a request is allowed without consuming tokens
   *
   * @param key - Unique identifier for the rate limit (e.g., user ID, agent ID)
   * @returns Rate limit result
   */
  check(key: string): Promise<RateLimitResult>;

  /**
   * Consume tokens from the rate limit
   *
   * @param key - Unique identifier for the rate limit
   * @param tokens - Number of tokens to consume (default: 1)
   * @returns Rate limit result after consumption
   * @throws {Error} If rate limit is exceeded
   */
  consume(key: string, tokens?: number): Promise<RateLimitResult>;

  /**
   * Reset the rate limit for a specific key
   *
   * @param key - Unique identifier for the rate limit
   */
  reset(key: string): Promise<void>;

  /**
   * Get current state for a key without modifying it
   *
   * @param key - Unique identifier for the rate limit
   * @returns Current rate limit state, or null if no state exists
   */
  get(key: string): Promise<RateLimitResult | null>;

  /**
   * Block a key from making requests for a duration
   *
   * @param key - Unique identifier to block
   * @param durationMs - Duration to block in milliseconds
   */
  block(key: string, durationMs: number): Promise<void>;

  /**
   * Unblock a previously blocked key
   *
   * @param key - Unique identifier to unblock
   */
  unblock(key: string): Promise<void>;

  /**
   * Check if a key is currently blocked
   *
   * @param key - Unique identifier to check
   * @returns true if blocked
   */
  isBlocked(key: string): Promise<boolean>;
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitExceededError extends Error {
  constructor(
    message: string,
    public readonly result: RateLimitResult
  ) {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}
