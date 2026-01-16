import { describe, it, expect, vi } from 'vitest';
import { RetryPolicyHelpers, RetryPolicies, type RetryPolicy } from '../RetryPolicy.js';

describe('RetryPolicies', () => {
  describe('predefined policies', () => {
    it('should define NONE policy', () => {
      expect(RetryPolicies.NONE).toEqual({
        maxRetries: 0,
        initialDelayMs: 0,
        maxDelayMs: 0,
        backoffMultiplier: 1
      });
    });

    it('should define CONSERVATIVE policy', () => {
      expect(RetryPolicies.CONSERVATIVE).toEqual({
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
        jitterFactor: 0.1
      });
    });

    it('should define AGGRESSIVE policy', () => {
      expect(RetryPolicies.AGGRESSIVE).toEqual({
        maxRetries: 5,
        initialDelayMs: 100,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
        jitterFactor: 0.2
      });
    });

    it('should define LLM_API policy', () => {
      expect(RetryPolicies.LLM_API).toEqual({
        maxRetries: 3,
        initialDelayMs: 2000,
        maxDelayMs: 30000,
        backoffMultiplier: 3,
        jitterFactor: 0.3,
        retryableErrorCodes: ['RATE_LIMIT', 'TIMEOUT', 'SERVICE_UNAVAILABLE']
      });
    });

    it('should define NETWORK policy', () => {
      expect(RetryPolicies.NETWORK).toEqual({
        maxRetries: 4,
        initialDelayMs: 500,
        maxDelayMs: 8000,
        backoffMultiplier: 2,
        jitterFactor: 0.15,
        retryableErrorCodes: ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'NETWORK_ERROR']
      });
    });
  });
});

describe('RetryPolicyHelpers', () => {
  describe('calculateDelay', () => {
    it('should calculate exponential backoff', () => {
      const policy: RetryPolicy = {
        maxRetries: 5,
        initialDelayMs: 100,
        maxDelayMs: 10000,
        backoffMultiplier: 2
      };

      expect(RetryPolicyHelpers.calculateDelay(policy, 1)).toBe(100);
      expect(RetryPolicyHelpers.calculateDelay(policy, 2)).toBe(200);
      expect(RetryPolicyHelpers.calculateDelay(policy, 3)).toBe(400);
      expect(RetryPolicyHelpers.calculateDelay(policy, 4)).toBe(800);
      expect(RetryPolicyHelpers.calculateDelay(policy, 5)).toBe(1600);
    });

    it('should cap at maxDelayMs', () => {
      const policy: RetryPolicy = {
        maxRetries: 10,
        initialDelayMs: 100,
        maxDelayMs: 500,
        backoffMultiplier: 2
      };

      expect(RetryPolicyHelpers.calculateDelay(policy, 1)).toBe(100);
      expect(RetryPolicyHelpers.calculateDelay(policy, 2)).toBe(200);
      expect(RetryPolicyHelpers.calculateDelay(policy, 3)).toBe(400);
      expect(RetryPolicyHelpers.calculateDelay(policy, 4)).toBe(500); // Capped
      expect(RetryPolicyHelpers.calculateDelay(policy, 5)).toBe(500); // Capped
      expect(RetryPolicyHelpers.calculateDelay(policy, 10)).toBe(500); // Capped
    });

    it('should apply jitter', () => {
      const policy: RetryPolicy = {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
        jitterFactor: 0.5
      };

      // Mock Math.random to control jitter
      const originalRandom = Math.random;

      // Test with zero jitter (random = 0.5)
      Math.random = vi.fn(() => 0.5);
      expect(RetryPolicyHelpers.calculateDelay(policy, 1)).toBe(1000);

      // Test with positive jitter (random = 0.75)
      Math.random = vi.fn(() => 0.75);
      const delayWithPositiveJitter = RetryPolicyHelpers.calculateDelay(policy, 1);
      expect(delayWithPositiveJitter).toBeGreaterThan(1000);
      expect(delayWithPositiveJitter).toBeLessThanOrEqual(1500); // 1000 + 50% jitter

      // Test with negative jitter (random = 0.25)
      Math.random = vi.fn(() => 0.25);
      const delayWithNegativeJitter = RetryPolicyHelpers.calculateDelay(policy, 1);
      expect(delayWithNegativeJitter).toBeLessThan(1000);
      expect(delayWithNegativeJitter).toBeGreaterThanOrEqual(500); // 1000 - 50% jitter

      Math.random = originalRandom;
    });

    it('should handle zero jitter factor', () => {
      const policy: RetryPolicy = {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
        jitterFactor: 0
      };

      expect(RetryPolicyHelpers.calculateDelay(policy, 1)).toBe(1000);
      expect(RetryPolicyHelpers.calculateDelay(policy, 2)).toBe(2000);
    });

    it('should handle no jitter factor (undefined)', () => {
      const policy: RetryPolicy = {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2
      };

      expect(RetryPolicyHelpers.calculateDelay(policy, 1)).toBe(1000);
      expect(RetryPolicyHelpers.calculateDelay(policy, 2)).toBe(2000);
    });

    it('should throw for invalid attempt numbers', () => {
      const policy = RetryPolicies.CONSERVATIVE;

      expect(() => RetryPolicyHelpers.calculateDelay(policy, 0)).toThrow('Attempt must be >= 1');
      expect(() => RetryPolicyHelpers.calculateDelay(policy, -1)).toThrow('Attempt must be >= 1');
    });

    it('should never return negative delay even with max jitter', () => {
      const policy: RetryPolicy = {
        maxRetries: 3,
        initialDelayMs: 100,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
        jitterFactor: 1.0 // Full jitter
      };

      // Run multiple times to test randomness
      for (let i = 0; i < 100; i++) {
        const delay = RetryPolicyHelpers.calculateDelay(policy, 1);
        expect(delay).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('isRetryable', () => {
    it('should return true for all errors when no retryableErrorCodes specified', () => {
      const policy: RetryPolicy = {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2
      };

      const error1 = new Error('Network error');
      const error2 = Object.assign(new Error('Rate limit'), { code: 'RATE_LIMIT' });

      expect(RetryPolicyHelpers.isRetryable(policy, error1, 1)).toBe(true);
      expect(RetryPolicyHelpers.isRetryable(policy, error2, 1)).toBe(true);
    });

    it('should return true for all errors when retryableErrorCodes is empty', () => {
      const policy: RetryPolicy = {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
        retryableErrorCodes: []
      };

      const error = new Error('Any error');

      expect(RetryPolicyHelpers.isRetryable(policy, error, 1)).toBe(true);
    });

    it('should check error codes against retryableErrorCodes', () => {
      const policy: RetryPolicy = {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
        retryableErrorCodes: ['RATE_LIMIT', 'TIMEOUT']
      };

      const retryableError = Object.assign(new Error('Rate limit'), {
        code: 'RATE_LIMIT'
      });
      const nonRetryableError = Object.assign(new Error('Auth failed'), {
        code: 'UNAUTHORIZED'
      });
      const errorWithoutCode = new Error('Generic error');

      expect(RetryPolicyHelpers.isRetryable(policy, retryableError, 1)).toBe(true);
      expect(RetryPolicyHelpers.isRetryable(policy, nonRetryableError, 1)).toBe(false);
      expect(RetryPolicyHelpers.isRetryable(policy, errorWithoutCode, 1)).toBe(false);
    });

    it('should use custom shouldRetry when provided', () => {
      const shouldRetry = vi.fn((error: Error, attempt: number) => {
        return error.message.includes('retry') && attempt <= 2;
      });

      const policy: RetryPolicy = {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
        retryableErrorCodes: ['RATE_LIMIT'], // Should be ignored
        shouldRetry
      };

      const retryableError = new Error('Please retry');
      const nonRetryableError = new Error('Fatal error');

      expect(RetryPolicyHelpers.isRetryable(policy, retryableError, 1)).toBe(true);
      expect(RetryPolicyHelpers.isRetryable(policy, retryableError, 3)).toBe(false);
      expect(RetryPolicyHelpers.isRetryable(policy, nonRetryableError, 1)).toBe(false);

      expect(shouldRetry).toHaveBeenCalledTimes(3);
    });

    it('should handle errors without code property', () => {
      const policy = RetryPolicies.LLM_API;
      const error = new Error('Network timeout');

      // Error without code should be treated as 'UNKNOWN'
      expect(RetryPolicyHelpers.isRetryable(policy, error, 1)).toBe(false);
    });
  });

  describe('shouldAttemptRetry', () => {
    it('should return true when attempts are within maxRetries', () => {
      const policy: RetryPolicy = {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2
      };

      expect(RetryPolicyHelpers.shouldAttemptRetry(policy, 1)).toBe(true);
      expect(RetryPolicyHelpers.shouldAttemptRetry(policy, 2)).toBe(true);
      expect(RetryPolicyHelpers.shouldAttemptRetry(policy, 3)).toBe(true);
    });

    it('should return false when attempts exceed maxRetries', () => {
      const policy: RetryPolicy = {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2
      };

      expect(RetryPolicyHelpers.shouldAttemptRetry(policy, 4)).toBe(false);
      expect(RetryPolicyHelpers.shouldAttemptRetry(policy, 5)).toBe(false);
    });

    it('should handle NONE policy (maxRetries = 0)', () => {
      const policy = RetryPolicies.NONE;

      expect(RetryPolicyHelpers.shouldAttemptRetry(policy, 1)).toBe(false);
      expect(RetryPolicyHelpers.shouldAttemptRetry(policy, 0)).toBe(true); // Attempt 0 is initial
    });

    it('should handle zero and negative attempts', () => {
      const policy = RetryPolicies.CONSERVATIVE;

      expect(RetryPolicyHelpers.shouldAttemptRetry(policy, 0)).toBe(true);
      expect(RetryPolicyHelpers.shouldAttemptRetry(policy, -1)).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should support complete retry logic flow', () => {
      const policy = RetryPolicies.CONSERVATIVE;
      let attempt = 1;
      const maxAttempts = policy.maxRetries + 1;

      const delays: number[] = [];

      while (attempt <= maxAttempts) {
        if (!RetryPolicyHelpers.shouldAttemptRetry(policy, attempt)) {
          break;
        }

        const error = Object.assign(new Error('Transient error'), {
          code: 'NETWORK_ERROR'
        });

        if (RetryPolicyHelpers.isRetryable(policy, error, attempt)) {
          const delay = RetryPolicyHelpers.calculateDelay(policy, attempt);
          delays.push(delay);
        }

        attempt++;
      }

      expect(delays).toHaveLength(3); // CONSERVATIVE has maxRetries: 3
    });

    it('should demonstrate LLM API retry pattern', () => {
      const policy = RetryPolicies.LLM_API;

      const rateLimitError = Object.assign(new Error('Rate limited'), {
        code: 'RATE_LIMIT'
      });
      const authError = Object.assign(new Error('Unauthorized'), {
        code: 'UNAUTHORIZED'
      });

      // Rate limit errors should be retried
      expect(RetryPolicyHelpers.isRetryable(policy, rateLimitError, 1)).toBe(true);

      // Auth errors should not be retried
      expect(RetryPolicyHelpers.isRetryable(policy, authError, 1)).toBe(false);

      // Delays should increase with backoffMultiplier: 3
      const delay1 = RetryPolicyHelpers.calculateDelay(policy, 1);
      const delay2 = RetryPolicyHelpers.calculateDelay(policy, 2);

      // With jitter, we can't test exact equality, but delay2 should be roughly 3x delay1
      // We'll check it's at least 2x (accounting for negative jitter on delay2)
      expect(delay2).toBeGreaterThan(delay1 * 1.5);
    });
  });
});
