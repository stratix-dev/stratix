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

    it('should have correct capabilities', () => {
      const provider = new OpenAIProvider(testConfig);

      expect(provider.capabilities).toEqual({
        toolCalling: true,
        streaming: true,
        embeddings: true,
        vision: true,
        structuredOutput: true,
        maxContextTokens: 128000,
        maxOutputTokens: 4096,
      });
    });

    it('should throw error when no models configured', () => {
      expect(() => new OpenAIProvider({
        apiKey: 'test',
        models: []
      })).toThrow('OpenAIProvider requires at least one model to be configured');
    });
  });

  describe('supportsModel', () => {
    let provider: OpenAIProvider;

    beforeEach(() => {
      provider = new OpenAIProvider(testConfig);
    });

    it('should return true for configured models', () => {
      expect(provider.supportsModel('gpt-5.2')).toBe(true);
      expect(provider.supportsModel('gpt-5.1')).toBe(true);
    });

    it('should return false for unconfigured models', () => {
      expect(provider.supportsModel('gpt-4')).toBe(false);
      expect(provider.supportsModel('unknown-model')).toBe(false);
    });
  });

  describe('getModelCapabilities', () => {
    let provider: OpenAIProvider;

    beforeEach(() => {
      provider = new OpenAIProvider(testConfig);
    });

    it('should return default capabilities for models without custom capabilities', () => {
      const capabilities = provider.getModelCapabilities('gpt-5.2');

      expect(capabilities).toEqual({
        toolCalling: true,
        streaming: true,
        embeddings: true,
        vision: true,
        structuredOutput: true,
        maxContextTokens: 128000,
        maxOutputTokens: 4096,
      });
    });

    it('should return custom capabilities when configured', () => {
      const providerWithCustomCaps = new OpenAIProvider({
        apiKey: 'test',
        models: [
          {
            name: 'gpt-4o-mini',
            pricing: { input: 0.15, output: 0.60 },
            capabilities: {
              maxContextTokens: 128000,
              maxOutputTokens: 16000,
            }
          }
        ]
      });

      const capabilities = providerWithCustomCaps.getModelCapabilities('gpt-4o-mini');

      expect(capabilities?.maxOutputTokens).toBe(16000);
      expect(capabilities?.toolCalling).toBe(true); // Inherited from default
    });
  });

  describe('estimateCost', () => {
    let provider: OpenAIProvider;

    beforeEach(() => {
      provider = new OpenAIProvider(testConfig);
    });

    it('should estimate cost for GPT-5.2', () => {
      const cost = provider.estimateCost('gpt-5.2', 1000, 500);

      // 1000/1M * 1.75 + 500/1M * 14.0 = 0.00175 + 0.007 = 0.00875
      expect(cost).toBeCloseTo(0.00875, 6);
    });

    it('should estimate cost for GPT-5.1', () => {
      const cost = provider.estimateCost('gpt-5.1', 1000, 500);

      // 1000/1M * 1.25 + 500/1M * 10.0 = 0.00125 + 0.005 = 0.00625
      expect(cost).toBeCloseTo(0.00625, 6);
    });

    it('should return zero for unknown model', () => {
      const cost = provider.estimateCost('unknown-model', 1000, 500);

      expect(cost).toBe(0);
    });

    it('should handle zero tokens', () => {
      const cost = provider.estimateCost('gpt-4', 0, 0);

      expect(cost).toBe(0);
    });

    it('should estimate cost for different token amounts', () => {
      const cost1 = provider.estimateCost('gpt-5.2', 100, 50);
      const cost2 = provider.estimateCost('gpt-5.2', 10000, 5000);

      expect(cost2).toBeCloseTo(cost1 * 100, 5);
    });
  });

  describe('Real-world usage patterns', () => {
    it('should estimate realistic conversation costs', () => {
      const provider = new OpenAIProvider(testConfig);

      // Small query
      const smallCost = provider.estimateCost('gpt-5.2', 50, 100);

      // Should be under $0.01
      expect(smallCost).toBeLessThan(0.01);

      // Large query
      const largeCost = provider.estimateCost('gpt-5.2', 3000, 1000);

      // Should be around $0.019: 3000/1M * 1.75 + 1000/1M * 14.0 = 0.00525 + 0.014 = 0.01925
      expect(largeCost).toBeGreaterThan(0.01);
      expect(largeCost).toBeLessThan(0.03);
    });

    it('should show GPT-5.1 is cheaper than GPT-5.2', () => {
      const provider = new OpenAIProvider(testConfig);

      const gpt52Cost = provider.estimateCost('gpt-5.2', 1000, 500);
      const gpt51Cost = provider.estimateCost('gpt-5.1', 1000, 500);

      expect(gpt51Cost).toBeLessThan(gpt52Cost);
      expect(gpt52Cost / gpt51Cost).toBeCloseTo(1.4, 1); // GPT-5.2 is ~1.4x more expensive
    });

    it('should return zero for model without pricing', () => {
      const provider = new OpenAIProvider(testConfig);

      const cost = provider.estimateCost('text-embedding-3-small', 1000, 0);

      // Should return 0 because model is not in configuration
      expect(cost).toBe(0);
    });

    it('should estimate monthly costs', () => {
      const provider = new OpenAIProvider(testConfig);

      // Assume 1000 queries per day, average 100 prompt + 200 completion tokens
      const dailyQueries = 1000;
      const avgPromptTokens = 100;
      const avgCompletionTokens = 200;

      const costPerQuery = provider.estimateCost('gpt-5.1', avgPromptTokens, avgCompletionTokens);

      const dailyCost = costPerQuery * dailyQueries;
      const monthlyCost = dailyCost * 30;

      // Should be manageable for GPT-5.1: 100/1M * 1.25 + 200/1M * 10 = 0.000125 + 0.002 = 0.002125 per query
      // Monthly: 0.002125 * 1000 * 30 = $63.75
      expect(monthlyCost).toBeLessThan(100); // Under $100/month
      expect(monthlyCost).toBeGreaterThan(50); // Around $63.75
    });
  });
});
