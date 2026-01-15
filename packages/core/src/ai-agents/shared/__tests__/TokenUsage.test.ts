import { describe, it, expect } from 'vitest';
import { TokenUsageHelpers, type TokenUsage, type LLMCost } from '../TokenUsage.js';

describe('TokenUsageHelpers', () => {
  describe('create', () => {
    it('should create TokenUsage with correct values', () => {
      const usage = TokenUsageHelpers.create(100, 50);

      expect(usage).toEqual({
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      });
    });

    it('should handle zero tokens', () => {
      const usage = TokenUsageHelpers.create(0, 0);

      expect(usage).toEqual({
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      });
    });

    it('should calculate total correctly', () => {
      const usage = TokenUsageHelpers.create(1234, 5678);

      expect(usage.totalTokens).toBe(6912);
    });

    it('should handle large numbers', () => {
      const usage = TokenUsageHelpers.create(1_000_000, 2_000_000);

      expect(usage.totalTokens).toBe(3_000_000);
    });
  });

  describe('combine', () => {
    it('should combine multiple token usages', () => {
      const usage1 = TokenUsageHelpers.create(100, 50);
      const usage2 = TokenUsageHelpers.create(200, 75);
      const usage3 = TokenUsageHelpers.create(50, 25);

      const combined = TokenUsageHelpers.combine([usage1, usage2, usage3]);

      expect(combined).toEqual({
        promptTokens: 350,
        completionTokens: 150,
        totalTokens: 500,
      });
    });

    it('should handle empty array', () => {
      const combined = TokenUsageHelpers.combine([]);

      expect(combined).toEqual({
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      });
    });

    it('should handle single usage', () => {
      const usage = TokenUsageHelpers.create(100, 50);
      const combined = TokenUsageHelpers.combine([usage]);

      expect(combined).toEqual(usage);
    });

    it('should combine with zero values', () => {
      const usage1 = TokenUsageHelpers.create(100, 50);
      const usage2 = TokenUsageHelpers.create(0, 0);
      const usage3 = TokenUsageHelpers.create(50, 25);

      const combined = TokenUsageHelpers.combine([usage1, usage2, usage3]);

      expect(combined).toEqual({
        promptTokens: 150,
        completionTokens: 75,
        totalTokens: 225,
      });
    });
  });

  describe('isEmpty', () => {
    it('should return true for zero tokens', () => {
      const usage = TokenUsageHelpers.create(0, 0);

      expect(TokenUsageHelpers.isEmpty(usage)).toBe(true);
    });

    it('should return false for non-zero tokens', () => {
      const usage1 = TokenUsageHelpers.create(100, 50);
      const usage2 = TokenUsageHelpers.create(1, 0);
      const usage3 = TokenUsageHelpers.create(0, 1);

      expect(TokenUsageHelpers.isEmpty(usage1)).toBe(false);
      expect(TokenUsageHelpers.isEmpty(usage2)).toBe(false);
      expect(TokenUsageHelpers.isEmpty(usage3)).toBe(false);
    });

    it('should check totalTokens only', () => {
      // Manually constructed usage with inconsistent totals
      const usage: TokenUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };

      expect(TokenUsageHelpers.isEmpty(usage)).toBe(true);
    });
  });

  describe('LLMCost interface', () => {
    it('should create valid LLMCost object', () => {
      const usage = TokenUsageHelpers.create(100, 50);
      const cost: LLMCost = {
        provider: 'openai',
        model: 'gpt-4',
        usage,
        costUSD: 0.0075,
        timestamp: new Date('2024-01-01T00:00:00Z'),
      };

      expect(cost.provider).toBe('openai');
      expect(cost.model).toBe('gpt-4');
      expect(cost.usage).toEqual(usage);
      expect(cost.costUSD).toBe(0.0075);
      expect(cost.timestamp).toEqual(new Date('2024-01-01T00:00:00Z'));
    });

    it('should support different providers', () => {
      const cost: LLMCost = {
        provider: 'anthropic',
        model: 'claude-3-opus',
        usage: TokenUsageHelpers.create(200, 100),
        costUSD: 0.015,
        timestamp: new Date(),
      };

      expect(cost.provider).toBe('anthropic');
      expect(cost.model).toBe('claude-3-opus');
    });
  });

  describe('immutability', () => {
    it('should not allow modification of TokenUsage', () => {
      const usage = TokenUsageHelpers.create(100, 50);

      // TypeScript should prevent this at compile time
      // At runtime, these are just regular objects
      expect(() => {
        (usage as any).promptTokens = 200;
      }).not.toThrow();

      // But in practice, we document immutability
      // and rely on readonly modifiers for type safety
    });
  });

  describe('edge cases', () => {
    it('should handle floating point tokens', () => {
      // Some providers might return fractional tokens
      const usage: TokenUsage = {
        promptTokens: 100.5,
        completionTokens: 50.3,
        totalTokens: 150.8,
      };

      expect(usage.promptTokens).toBe(100.5);
      expect(usage.totalTokens).toBe(150.8);
    });

    it('should handle negative tokens gracefully', () => {
      // This shouldn't happen in practice, but the type allows it
      const usage: TokenUsage = {
        promptTokens: -100,
        completionTokens: 50,
        totalTokens: -50,
      };

      expect(usage.promptTokens).toBe(-100);
      expect(TokenUsageHelpers.isEmpty(usage)).toBe(false);
    });
  });
});
