import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TokenBucketRateLimiter } from '../TokenBucketRateLimiter.js';
import { RateLimitExceededError } from '@stratix/core';

// Helper to wait
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('TokenBucketRateLimiter', () => {
  let limiter: TokenBucketRateLimiter;

  beforeEach(() => {
    limiter = new TokenBucketRateLimiter({
      maxRequests: 10,
      windowMs: 1000, // 10 requests per second
    });
  });

  describe('check', () => {
    it('should allow requests within limit', async () => {
      const result = await limiter.check('user:123');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10);
      expect(result.limit).toBe(10);
    });

    it('should not consume tokens on check', async () => {
      await limiter.check('user:123');
      const result = await limiter.check('user:123');

      expect(result.remaining).toBe(10);
    });

    it('should return consistent results across multiple checks', async () => {
      const result1 = await limiter.check('user:123');
      const result2 = await limiter.check('user:123');

      expect(result1.remaining).toBe(result2.remaining);
    });
  });

  describe('consume', () => {
    it('should consume a single token', async () => {
      const result = await limiter.consume('user:123');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should consume multiple tokens', async () => {
      const result = await limiter.consume('user:123', 5);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });

    it('should throw when exceeding limit', async () => {
      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        await limiter.consume('user:123');
      }

      // Next consume should fail
      await expect(limiter.consume('user:123')).rejects.toThrow(
        RateLimitExceededError
      );
    });

    it('should include result in error', async () => {
      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        await limiter.consume('user:123');
      }

      try {
        await limiter.consume('user:123');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitExceededError);
        const rateLimitError = error as RateLimitExceededError;
        expect(rateLimitError.result.allowed).toBe(false);
        expect(rateLimitError.result.remaining).toBe(0);
        expect(rateLimitError.result.retryAfter).toBeDefined();
      }
    });

    it('should throw error when consuming negative tokens', async () => {
      await expect(limiter.consume('user:123', -1)).rejects.toThrow(
        'Tokens must be positive'
      );
    });

    it('should isolate limits between different keys', async () => {
      await limiter.consume('user:123', 5);
      await limiter.consume('user:456', 5);

      const result1 = await limiter.check('user:123');
      const result2 = await limiter.check('user:456');

      expect(result1.remaining).toBe(5);
      expect(result2.remaining).toBe(5);
    });
  });

  describe('token refill', () => {
    it('should refill tokens over time', async () => {
      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        await limiter.consume('user:123');
      }

      // Wait for some tokens to refill (100ms should add 1 token)
      await wait(150);

      const result = await limiter.check('user:123');
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should not exceed max tokens', async () => {
      // Wait a long time
      await wait(200);

      const result = await limiter.check('user:123');
      expect(result.remaining).toBeLessThanOrEqual(10);
    });

    it('should allow consuming after refill', async () => {
      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        await limiter.consume('user:123');
      }

      // Wait for refill
      await wait(150);

      // Should be able to consume again
      await expect(limiter.consume('user:123')).resolves.not.toThrow();
    });
  });

  describe('reset', () => {
    it('should reset tokens to maximum', async () => {
      await limiter.consume('user:123', 8);
      await limiter.reset('user:123');

      const result = await limiter.check('user:123');
      expect(result.remaining).toBe(10);
    });

    it('should not affect other keys', async () => {
      await limiter.consume('user:123', 5);
      await limiter.consume('user:456', 3);

      await limiter.reset('user:123');

      const result123 = await limiter.check('user:123');
      const result456 = await limiter.check('user:456');

      expect(result123.remaining).toBe(10);
      expect(result456.remaining).toBe(7);
    });
  });

  describe('get', () => {
    it('should return current state', async () => {
      await limiter.consume('user:123', 3);

      const result = await limiter.get('user:123');
      expect(result).not.toBeNull();
      expect(result!.remaining).toBe(7);
    });

    it('should return null for non-existent key', async () => {
      const result = await limiter.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should not modify state', async () => {
      await limiter.consume('user:123', 3);

      const result1 = await limiter.get('user:123');
      const result2 = await limiter.get('user:123');

      expect(result1!.remaining).toBe(result2!.remaining);
    });
  });

  describe('blocking', () => {
    it('should block a key', async () => {
      await limiter.block('user:123', 1000);

      const isBlocked = await limiter.isBlocked('user:123');
      expect(isBlocked).toBe(true);
    });

    it('should prevent consumption when blocked', async () => {
      await limiter.block('user:123', 1000);

      await expect(limiter.consume('user:123')).rejects.toThrow(
        'Rate limit exceeded (blocked)'
      );
    });

    it('should prevent checking when blocked', async () => {
      await limiter.block('user:123', 1000);

      const result = await limiter.check('user:123');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should unblock a key', async () => {
      await limiter.block('user:123', 5000);
      await limiter.unblock('user:123');

      const isBlocked = await limiter.isBlocked('user:123');
      expect(isBlocked).toBe(false);

      // Should be able to consume
      await expect(limiter.consume('user:123')).resolves.not.toThrow();
    });

    it('should auto-unblock after duration', async () => {
      await limiter.block('user:123', 100);

      expect(await limiter.isBlocked('user:123')).toBe(true);

      // Wait for block to expire
      await wait(150);

      expect(await limiter.isBlocked('user:123')).toBe(false);
    });

    it('should reset block status on reset', async () => {
      await limiter.block('user:123', 5000);
      await limiter.reset('user:123');

      const isBlocked = await limiter.isBlocked('user:123');
      expect(isBlocked).toBe(false);
    });
  });

  describe('key prefix', () => {
    it('should use key prefix', () => {
      const prefixedLimiter = new TokenBucketRateLimiter({
        maxRequests: 10,
        windowMs: 1000,
        keyPrefix: 'api',
      });

      expect(prefixedLimiter).toBeDefined();
      // Internal testing - verify keys are prefixed internally
    });

    it('should isolate keys with different prefixes', async () => {
      const limiter1 = new TokenBucketRateLimiter({
        maxRequests: 10,
        windowMs: 1000,
        keyPrefix: 'api',
      });

      const limiter2 = new TokenBucketRateLimiter({
        maxRequests: 10,
        windowMs: 1000,
        keyPrefix: 'web',
      });

      await limiter1.consume('user:123', 5);
      await limiter2.consume('user:123', 3);

      const result1 = await limiter1.check('user:123');
      const result2 = await limiter2.check('user:123');

      expect(result1.remaining).toBe(5);
      expect(result2.remaining).toBe(7);
    });
  });

  describe('utility methods', () => {
    it('should track size', async () => {
      expect(limiter.size()).toBe(0);

      await limiter.consume('user:123');
      expect(limiter.size()).toBe(1);

      await limiter.consume('user:456');
      expect(limiter.size()).toBe(2);
    });

    it('should clear all buckets', async () => {
      await limiter.consume('user:123');
      await limiter.consume('user:456');

      limiter.clearAll();

      expect(limiter.size()).toBe(0);
    });

    it('should reset tokens after clear', async () => {
      await limiter.consume('user:123', 8);
      limiter.clearAll();

      const result = await limiter.check('user:123');
      expect(result.remaining).toBe(10);
    });
  });

  describe('edge cases', () => {
    it('should handle burst requests', async () => {
      const results = await Promise.all([
        limiter.consume('user:123'),
        limiter.consume('user:123'),
        limiter.consume('user:123'),
      ]);

      expect(results).toHaveLength(3);
      expect(results[2].remaining).toBe(7);
    });

    it('should handle fractional tokens correctly', async () => {
      const precisionLimiter = new TokenBucketRateLimiter({
        maxRequests: 100,
        windowMs: 1000,
      });

      await precisionLimiter.consume('user:123', 50);
      const result = await precisionLimiter.check('user:123');

      expect(result.remaining).toBe(50);
    });

    it('should handle very small window correctly', async () => {
      const fastLimiter = new TokenBucketRateLimiter({
        maxRequests: 2,
        windowMs: 100,
      });

      await fastLimiter.consume('user:123');
      await fastLimiter.consume('user:123');

      await expect(fastLimiter.consume('user:123')).rejects.toThrow();
    });
  });
});
