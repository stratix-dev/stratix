import { describe, it, expect, beforeEach } from 'vitest';
import { AnthropicProvider } from '../AnthropicProvider.js';

describe('AnthropicProvider', () => {
  describe('construction', () => {
    it('should create provider with API key', () => {
      const provider = new AnthropicProvider({
        apiKey: 'test-api-key',
        models: [
          { name: 'claude-opus-4-5-20251101', pricing: { input: 5, output: 25 } },
          { name: 'claude-sonnet-4-5-20250929', pricing: { input: 3, output: 15 } },
          { name: 'claude-haiku-4-5-20251001', pricing: { input: 1, output: 5 } },
        ],
      });

      expect(provider.name).toBe('anthropic');
      expect(provider.models).toContain('claude-opus-4-5-20251101');
      expect(provider.models).toContain('claude-sonnet-4-5-20250929');
      expect(provider.models).toContain('claude-haiku-4-5-20251001');
    });

    it('should have correct models list', () => {
      const provider = new AnthropicProvider({
        apiKey: 'test-api-key',
        models: [
          { name: 'claude-opus-4-5-20251101' },
          { name: 'claude-sonnet-4-5-20250929' },
          { name: 'claude-haiku-4-5-20251001' },
        ],
      });

      expect(provider.models).toEqual([
        'claude-opus-4-5-20251101',
        'claude-sonnet-4-5-20250929',
        'claude-haiku-4-5-20251001',
      ]);
    });

    it('should have correct capabilities', () => {
      const provider = new AnthropicProvider({
        apiKey: 'test-api-key',
        models: [{ name: 'claude-sonnet-4-5-20250929' }],
      });

      expect(provider.capabilities).toEqual({
        toolCalling: true,
        streaming: true,
        embeddings: false,
        vision: true,
        structuredOutput: false,
        maxContextTokens: 200000,
        maxOutputTokens: 4096,
      });
    });

    it('should throw error when no models configured', () => {
      expect(() => new AnthropicProvider({
        apiKey: 'test',
        models: []
      })).toThrow('AnthropicProvider requires at least one model to be configured');
    });
  });

  describe('supportsModel', () => {
    let provider: AnthropicProvider;

    beforeEach(() => {
      provider = new AnthropicProvider({
        apiKey: 'test-api-key',
        models: [
          { name: 'claude-opus-4-5-20251101' },
          { name: 'claude-sonnet-4-5-20250929' },
        ],
      });
    });

    it('should return true for configured models', () => {
      expect(provider.supportsModel('claude-opus-4-5-20251101')).toBe(true);
      expect(provider.supportsModel('claude-sonnet-4-5-20250929')).toBe(true);
    });

    it('should return false for unconfigured models', () => {
      expect(provider.supportsModel('claude-haiku-4-5-20251001')).toBe(false);
      expect(provider.supportsModel('unknown-model')).toBe(false);
    });
  });

  describe('getModelCapabilities', () => {
    let provider: AnthropicProvider;

    beforeEach(() => {
      provider = new AnthropicProvider({
        apiKey: 'test-api-key',
        models: [{ name: 'claude-sonnet-4-5-20250929' }],
      });
    });

    it('should return default capabilities for models without custom capabilities', () => {
      const capabilities = provider.getModelCapabilities('claude-sonnet-4-5-20250929');

      expect(capabilities).toEqual({
        toolCalling: true,
        streaming: true,
        embeddings: false,
        vision: true,
        structuredOutput: false,
        maxContextTokens: 200000,
        maxOutputTokens: 4096,
      });
    });

    it('should return custom capabilities when configured', () => {
      const providerWithCustomCaps = new AnthropicProvider({
        apiKey: 'test',
        models: [
          {
            name: 'claude-opus-4-5-20251101',
            pricing: { input: 5, output: 25 },
            capabilities: {
              maxContextTokens: 200000,
              maxOutputTokens: 8000,
            }
          }
        ]
      });

      const capabilities = providerWithCustomCaps.getModelCapabilities('claude-opus-4-5-20251101');

      expect(capabilities?.maxOutputTokens).toBe(8000);
      expect(capabilities?.toolCalling).toBe(true); // Inherited from default
    });
  });

  describe('estimateCost', () => {
    let provider: AnthropicProvider;

    beforeEach(() => {
      provider = new AnthropicProvider({
        apiKey: 'test-api-key',
        models: [
          { name: 'claude-opus-4-5-20251101', pricing: { input: 5, output: 25 } },
          { name: 'claude-sonnet-4-5-20250929', pricing: { input: 3, output: 15 } },
          { name: 'claude-haiku-4-5-20251001', pricing: { input: 1, output: 5 } },
        ],
      });
    });

    it('should estimate cost for Claude 4.5 Opus', () => {
      const cost = provider.estimateCost('claude-opus-4-5-20251101', 1000, 500);

      // 1000/1M * 5 + 500/1M * 25 = 0.005 + 0.0125 = 0.0175
      expect(cost).toBeCloseTo(0.0175, 6);
    });

    it('should estimate cost for Claude 4.5 Sonnet', () => {
      const cost = provider.estimateCost('claude-sonnet-4-5-20250929', 1000, 500);

      // 1000/1M * 3 + 500/1M * 15 = 0.003 + 0.0075 = 0.0105
      expect(cost).toBeCloseTo(0.0105, 6);
    });

    it('should estimate cost for Claude 4.5 Haiku', () => {
      const cost = provider.estimateCost('claude-haiku-4-5-20251001', 1000, 500);

      // 1000/1M * 1 + 500/1M * 5 = 0.001 + 0.0025 = 0.0035
      expect(cost).toBeCloseTo(0.0035, 6);
    });

    it('should return zero for unknown model', () => {
      const cost = provider.estimateCost('unknown-model', 1000, 500);

      expect(cost).toBe(0);
    });

    it('should handle zero tokens', () => {
      const cost = provider.estimateCost('claude-sonnet-4-5-20250929', 0, 0);

      expect(cost).toBe(0);
    });
  });

  describe('Real-world usage patterns', () => {
    it('should estimate realistic conversation costs', () => {
      const provider = new AnthropicProvider({
        apiKey: 'test-key',
        models: [
          { name: 'claude-opus-4-5-20251101', pricing: { input: 5, output: 25 } },
          { name: 'claude-haiku-4-5-20251001', pricing: { input: 1, output: 5 } },
        ],
      });

      // Small query with Haiku
      const smallCost = provider.estimateCost('claude-haiku-4-5-20251001', 50, 100);

      // Should be very cheap (0.00055)
      expect(smallCost).toBeLessThan(0.001);

      // Large query with Opus
      const largeCost = provider.estimateCost('claude-opus-4-5-20251101', 3000, 1000);

      // Should be around $0.04 (3000/1M*5 + 1000/1M*25 = 0.015 + 0.025 = 0.04)
      expect(largeCost).toBeGreaterThan(0.03);
      expect(largeCost).toBeLessThan(0.05);
    });

    it('should show cost differences between models', () => {
      const provider = new AnthropicProvider({
        apiKey: 'test-key',
        models: [
          { name: 'claude-opus-4-5-20251101', pricing: { input: 5, output: 25 } },
          { name: 'claude-sonnet-4-5-20250929', pricing: { input: 3, output: 15 } },
          { name: 'claude-haiku-4-5-20251001', pricing: { input: 1, output: 5 } },
        ],
      });

      const opusCost = provider.estimateCost('claude-opus-4-5-20251101', 1000, 500);
      const sonnetCost = provider.estimateCost('claude-sonnet-4-5-20250929', 1000, 500);
      const haikuCost = provider.estimateCost('claude-haiku-4-5-20251001', 1000, 500);

      // Opus should be most expensive
      expect(opusCost).toBeGreaterThan(sonnetCost);
      expect(sonnetCost).toBeGreaterThan(haikuCost);

      // Opus is ~1.67x more expensive than Sonnet (0.0175 / 0.0105)
      expect(opusCost / sonnetCost).toBeCloseTo(1.67, 1);

      // Sonnet is ~3x more expensive than Haiku (0.0105 / 0.0035)
      expect(sonnetCost / haikuCost).toBeCloseTo(3, 0);
    });

    it('should show Haiku is cheapest for high-volume', () => {
      const provider = new AnthropicProvider({
        apiKey: 'test-key',
        models: [
          { name: 'claude-sonnet-4-5-20250929', pricing: { input: 3, output: 15 } },
          { name: 'claude-haiku-4-5-20251001', pricing: { input: 1, output: 5 } },
        ],
      });

      // 10,000 queries with average tokens
      const queries = 10000;
      const avgPromptTokens = 100;
      const avgCompletionTokens = 200;

      const haikuCostPerQuery = provider.estimateCost('claude-haiku-4-5-20251001', avgPromptTokens, avgCompletionTokens);
      const sonnetCostPerQuery = provider.estimateCost('claude-sonnet-4-5-20250929', avgPromptTokens, avgCompletionTokens);

      const haikuTotal = haikuCostPerQuery * queries;
      const sonnetTotal = sonnetCostPerQuery * queries;

      // Haiku total should be under $15 (100/1M*1 + 200/1M*5)*10000 = 0.0011*10000 = $11
      expect(haikuTotal).toBeLessThan(15);

      // Sonnet would be ~3x more
      expect(sonnetTotal).toBeGreaterThan(haikuTotal * 2.5);
    });

    it('should estimate monthly costs for different tiers', () => {
      const provider = new AnthropicProvider({
        apiKey: 'test-key',
        models: [
          { name: 'claude-opus-4-5-20251101', pricing: { input: 5, output: 25 } },
          { name: 'claude-sonnet-4-5-20250929', pricing: { input: 3, output: 15 } },
          { name: 'claude-haiku-4-5-20251001', pricing: { input: 1, output: 5 } },
        ],
      });

      const dailyQueries = 1000;
      const avgPromptTokens = 150;
      const avgCompletionTokens = 300;

      // Haiku tier (fast, simple responses)
      const haikuDailyCost = provider.estimateCost('claude-haiku-4-5-20251001', avgPromptTokens, avgCompletionTokens) * dailyQueries;
      const haikuMonthlyCost = haikuDailyCost * 30;

      // Sonnet tier (balanced)
      const sonnetDailyCost = provider.estimateCost('claude-sonnet-4-5-20250929', avgPromptTokens, avgCompletionTokens) * dailyQueries;
      const sonnetMonthlyCost = sonnetDailyCost * 30;

      // Opus tier (complex reasoning)
      const opusDailyCost = provider.estimateCost('claude-opus-4-5-20251101', avgPromptTokens, avgCompletionTokens) * dailyQueries;
      const opusMonthlyCost = opusDailyCost * 30;

      // Haiku: Very affordable for high volume (150/1M*1 + 300/1M*5)*1000*30 = 0.00165*1000*30 = $49.5
      expect(haikuMonthlyCost).toBeLessThan(60);

      // Sonnet: Moderate cost (150/1M*3 + 300/1M*15)*1000*30 = 0.0049*1000*30 = $147
      expect(sonnetMonthlyCost).toBeGreaterThan(130);
      expect(sonnetMonthlyCost).toBeLessThan(160);

      // Opus: Higher pricing (150/1M*5 + 300/1M*25)*1000*30 = 0.0082*1000*30 = $246
      expect(opusMonthlyCost).toBeGreaterThan(230);
      expect(opusMonthlyCost).toBeLessThan(260);
    });

    it('should compare with GPT-4 equivalent pricing', () => {
      const provider = new AnthropicProvider({
        apiKey: 'test-key',
        models: [
          { name: 'claude-opus-4-5-20251101', pricing: { input: 5, output: 25 } },
        ],
      });

      // Claude 4.5 Opus (comparable to GPT-4)
      const opusCost = provider.estimateCost('claude-opus-4-5-20251101', 1000, 500);

      // GPT-4 would be: 1000/1M * 30 + 500/1M * 60 = 0.03 + 0.03 = 0.06
      const gpt4Cost = 0.06;

      // Claude 4.5 Opus is much cheaper than GPT-4 (0.0175 vs 0.06)
      expect(opusCost).toBeLessThan(gpt4Cost);
    });
  });

  describe('provider metadata', () => {
    it('should have correct provider name', () => {
      const provider = new AnthropicProvider({
        apiKey: 'test-key',
        models: [
          { name: 'claude-sonnet-4-5-20250929' },
        ],
      });

      expect(provider.name).toBe('anthropic');
    });

    it('should list available models', () => {
      const provider = new AnthropicProvider({
        apiKey: 'test-key',
        models: [
          { name: 'claude-opus-4-5-20251101' },
          { name: 'claude-sonnet-4-5-20250929' },
          { name: 'claude-haiku-4-5-20251001' },
        ],
      });

      expect(provider.models.length).toBe(3);
      expect(provider.models).toContain('claude-opus-4-5-20251101');
      expect(provider.models).toContain('claude-sonnet-4-5-20250929');
      expect(provider.models).toContain('claude-haiku-4-5-20251001');
    });
  });

  describe('embeddings', () => {
    it('should throw error for embeddings', async () => {
      const provider = new AnthropicProvider({
        apiKey: 'test-key',
        models: [
          { name: 'claude-sonnet-4-5-20250929' },
        ],
      });

      await expect(
        provider.embeddings({
          model: 'any-model',
          input: ['test'],
        })
      ).rejects.toThrow('Anthropic does not support embeddings');
    });
  });
});
