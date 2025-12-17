import { describe, it, expect, beforeEach } from 'vitest';
import { OpenAIProvider } from '../OpenAIProvider.js';
import type { OpenAIConfig } from '../OpenAIProvider.js';

const testConfig: OpenAIConfig = {
  apiKey: 'test-api-key',
  models: [
    { name: 'gpt-5.2', pricing: { input: 1.75, output: 14.0 } },
    { name: 'gpt-5.1', pricing: { input: 1.25, output: 10.0 } },
  ],
};

describe('OpenAIProvider', () => {
  describe('construction', () => {
    it('should create provider with API key', () => {
      const provider = new OpenAIProvider(testConfig);

      expect(provider.name).toBe('openai');
      expect(provider.models).toContain('gpt-5.2');
      expect(provider.models).toContain('gpt-5.1');
    });

    it('should have correct models list', () => {
      const provider = new OpenAIProvider(testConfig);

      expect(provider.models).toEqual([
        'gpt-5.2',
        'gpt-5.1'
      ]);
    });
  });

  describe('cost calculation', () => {
    let provider: OpenAIProvider;

    beforeEach(() => {
      provider = new OpenAIProvider(testConfig);
    });

    it('should calculate cost for GPT-5.2', () => {
      const cost = provider.calculateCost('gpt-5.2', {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      });

      // 1000/1M * 1.75 + 500/1M * 14.0 = 0.00175 + 0.007 = 0.00875
      expect(cost).toBeCloseTo(0.00875, 6);
    });

    it('should calculate cost for GPT-5.1', () => {
      const cost = provider.calculateCost('gpt-5.1', {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      });

      // 1000/1M * 1.25 + 500/1M * 10.0 = 0.00125 + 0.005 = 0.00625
      expect(cost).toBeCloseTo(0.00625, 6);
    });

    it('should return zero for unknown model', () => {
      const cost = provider.calculateCost('unknown-model', {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      });

      expect(cost).toBe(0);
    });

    it('should handle zero tokens', () => {
      const cost = provider.calculateCost('gpt-4', {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      });

      expect(cost).toBe(0);
    });

    it('should calculate cost for different token amounts', () => {
      const cost1 = provider.calculateCost('gpt-5.2', {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      });

      const cost2 = provider.calculateCost('gpt-5.2', {
        promptTokens: 10000,
        completionTokens: 5000,
        totalTokens: 15000,
      });

      expect(cost2).toBeCloseTo(cost1 * 100, 5);
    });
  });

  describe('Real-world usage patterns', () => {
    it('should calculate realistic conversation costs', () => {
      const provider = new OpenAIProvider(testConfig);

      // Small query
      const smallCost = provider.calculateCost('gpt-5.2', {
        promptTokens: 50,
        completionTokens: 100,
        totalTokens: 150,
      });

      // Should be under $0.01
      expect(smallCost).toBeLessThan(0.01);

      // Large query
      const largeCost = provider.calculateCost('gpt-5.2', {
        promptTokens: 3000,
        completionTokens: 1000,
        totalTokens: 4000,
      });

      // Should be around $0.019: 3000/1M * 1.75 + 1000/1M * 14.0 = 0.00525 + 0.014 = 0.01925
      expect(largeCost).toBeGreaterThan(0.01);
      expect(largeCost).toBeLessThan(0.03);
    });

    it('should show GPT-5.1 is cheaper than GPT-5.2', () => {
      const provider = new OpenAIProvider(testConfig);

      const usage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const gpt52Cost = provider.calculateCost('gpt-5.2', usage);
      const gpt51Cost = provider.calculateCost('gpt-5.1', usage);

      expect(gpt51Cost).toBeLessThan(gpt52Cost);
      expect(gpt52Cost / gpt51Cost).toBeCloseTo(1.4, 1); // GPT-5.2 is ~1.4x more expensive
    });

    it('should return zero for model without pricing', () => {
      const provider = new OpenAIProvider(testConfig);

      const cost = provider.calculateCost('text-embedding-3-small', {
        promptTokens: 1000,
        completionTokens: 0,
        totalTokens: 1000,
      });

      // Should return 0 because model is not in configuration
      expect(cost).toBe(0);
    });

    it('should estimate monthly costs', () => {
      const provider = new OpenAIProvider(testConfig);

      // Assume 1000 queries per day, average 100 prompt + 200 completion tokens
      const dailyQueries = 1000;
      const avgPromptTokens = 100;
      const avgCompletionTokens = 200;

      const costPerQuery = provider.calculateCost('gpt-5.1', {
        promptTokens: avgPromptTokens,
        completionTokens: avgCompletionTokens,
        totalTokens: avgPromptTokens + avgCompletionTokens,
      });

      const dailyCost = costPerQuery * dailyQueries;
      const monthlyCost = dailyCost * 30;

      // Should be manageable for GPT-5.1: 100/1M * 1.25 + 200/1M * 10 = 0.000125 + 0.002 = 0.002125 per query
      // Monthly: 0.002125 * 1000 * 30 = $63.75
      expect(monthlyCost).toBeLessThan(100); // Under $100/month
      expect(monthlyCost).toBeGreaterThan(50); // Around $63.75
    });
  });
});
