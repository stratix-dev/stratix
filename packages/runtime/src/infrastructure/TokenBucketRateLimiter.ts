import type {
  RateLimiter,
  RateLimitResult,
  RateLimitConfig,
} from '@stratix/core';
import { RateLimitExceededError } from '@stratix/core';

/**
 * Bucket state for a specific key
 */
interface BucketState {
  tokens: number;
  lastRefill: number;
  blockedUntil?: number;
}

/**
 * Token bucket rate limiter implementation.
 *
 * Uses the token bucket algorithm to provide smooth rate limiting.
 * Tokens are added at a constant rate, and each request consumes tokens.
 *
 * Features:
 * - Automatic token refill based on elapsed time
 * - Burst support (can consume multiple tokens at once)
 * - Per-key rate limiting
 * - Blocking mechanism for abuse prevention
 * - In-memory storage (suitable for single-instance deployments)
 * @category Infrastructure
 *
 * @example
 * ```typescript
 * const limiter = new TokenBucketRateLimiter({
 *   maxRequests: 100,
 *   windowMs: 60000, // 100 requests per minute
 *   keyPrefix: 'api'
 * });
 *
 * // Check and consume
 * try {
 *   const result = await limiter.consume('user:123');
 *   console.log(`Remaining: ${result.remaining}`);
 * } catch (error) {
 *   if (error instanceof RateLimitExceededError) {
 *     console.log(`Rate limit exceeded. Retry after ${error.result.retryAfter}ms`);
 *   }
 * }
 *
 * // Block abusive key
 * await limiter.block('user:456', 300000); // Block for 5 minutes
 * ```
 */
export class TokenBucketRateLimiter implements RateLimiter {
  private buckets: Map<string, BucketState> = new Map();
  private readonly config: Required<RateLimitConfig>;
  private readonly refillRate: number; // tokens per millisecond

  constructor(config: RateLimitConfig) {
    this.config = {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      keyPrefix: config.keyPrefix ?? '',
    };

    // Calculate how many tokens to add per millisecond
    this.refillRate = this.config.maxRequests / this.config.windowMs;
  }

  /**
   * Get the full key with prefix
   */
  private getKey(key: string): string {
    return this.config.keyPrefix ? `${this.config.keyPrefix}:${key}` : key;
  }

  /**
   * Get or create bucket for a key
   */
  private getBucket(key: string): BucketState {
    const fullKey = this.getKey(key);
    let bucket = this.buckets.get(fullKey);

    if (!bucket) {
      bucket = {
        tokens: this.config.maxRequests,
        lastRefill: Date.now(),
      };
      this.buckets.set(fullKey, bucket);
    }

    return bucket;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(bucket: BucketState): void {
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;

    if (elapsed > 0) {
      const tokensToAdd = elapsed * this.refillRate;
      bucket.tokens = Math.min(
        this.config.maxRequests,
        bucket.tokens + tokensToAdd
      );
      bucket.lastRefill = now;
    }
  }

  /**
   * Create rate limit result from bucket state
   */
  private createResult(bucket: BucketState, allowed: boolean): RateLimitResult {
    const now = Date.now();
    const tokensNeeded = this.config.maxRequests - bucket.tokens;
    const timeToRefill = Math.ceil(tokensNeeded / this.refillRate);

    return {
      allowed,
      remaining: Math.floor(bucket.tokens),
      limit: this.config.maxRequests,
      resetIn: timeToRefill,
      resetAt: new Date(now + timeToRefill),
      retryAfter: allowed ? undefined : Math.ceil(1 / this.refillRate),
    };
  }

  async check(key: string): Promise<RateLimitResult> {
    const bucket = this.getBucket(key);

    // Check if blocked
    if (bucket.blockedUntil && Date.now() < bucket.blockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        limit: this.config.maxRequests,
        resetIn: bucket.blockedUntil - Date.now(),
        resetAt: new Date(bucket.blockedUntil),
        retryAfter: bucket.blockedUntil - Date.now(),
      };
    }

    // Refill tokens
    this.refillTokens(bucket);

    // Check if we have enough tokens
    const allowed = bucket.tokens >= 1;
    return this.createResult(bucket, allowed);
  }

  async consume(key: string, tokens: number = 1): Promise<RateLimitResult> {
    if (tokens < 0) {
      throw new Error('Tokens must be positive');
    }

    const bucket = this.getBucket(key);

    // Check if blocked
    if (bucket.blockedUntil && Date.now() < bucket.blockedUntil) {
      const result: RateLimitResult = {
        allowed: false,
        remaining: 0,
        limit: this.config.maxRequests,
        resetIn: bucket.blockedUntil - Date.now(),
        resetAt: new Date(bucket.blockedUntil),
        retryAfter: bucket.blockedUntil - Date.now(),
      };
      throw new RateLimitExceededError('Rate limit exceeded (blocked)', result);
    }

    // Refill tokens
    this.refillTokens(bucket);

    // Check if we have enough tokens
    if (bucket.tokens < tokens) {
      const result = this.createResult(bucket, false);
      throw new RateLimitExceededError('Rate limit exceeded', result);
    }

    // Consume tokens
    bucket.tokens -= tokens;

    return this.createResult(bucket, true);
  }

  async reset(key: string): Promise<void> {
    const fullKey = this.getKey(key);
    const bucket = this.buckets.get(fullKey);

    if (bucket) {
      bucket.tokens = this.config.maxRequests;
      bucket.lastRefill = Date.now();
      delete bucket.blockedUntil;
    }
  }

  async get(key: string): Promise<RateLimitResult | null> {
    const fullKey = this.getKey(key);
    const bucket = this.buckets.get(fullKey);

    if (!bucket) {
      return null;
    }

    // Don't modify the bucket, just return current state
    const tempBucket = { ...bucket };
    this.refillTokens(tempBucket);

    return this.createResult(tempBucket, tempBucket.tokens >= 1);
  }

  async block(key: string, durationMs: number): Promise<void> {
    const bucket = this.getBucket(key);
    bucket.blockedUntil = Date.now() + durationMs;
    bucket.tokens = 0;
  }

  async unblock(key: string): Promise<void> {
    const fullKey = this.getKey(key);
    const bucket = this.buckets.get(fullKey);

    if (bucket) {
      delete bucket.blockedUntil;
      // Reset tokens when unblocking (forgive the user)
      bucket.tokens = this.config.maxRequests;
      bucket.lastRefill = Date.now();
    }
  }

  async isBlocked(key: string): Promise<boolean> {
    const fullKey = this.getKey(key);
    const bucket = this.buckets.get(fullKey);

    if (!bucket || !bucket.blockedUntil) {
      return false;
    }

    return Date.now() < bucket.blockedUntil;
  }

  /**
   * Clear all buckets (useful for testing)
   */
  clearAll(): void {
    this.buckets.clear();
  }

  /**
   * Get number of tracked keys
   */
  size(): number {
    return this.buckets.size;
  }
}
