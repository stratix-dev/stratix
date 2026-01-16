import { describe, it, expect } from 'vitest';
import { ExecutionMetadataHelpers, type ExecutionMetadata } from '../ExecutionMetadata.js';
import { TokenUsageHelpers } from '../TokenUsage.js';

describe('ExecutionMetadataHelpers', () => {
  describe('create', () => {
    it('should create minimal metadata with model only', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');

      expect(metadata).toEqual({
        model: 'gpt-4'
      });
    });

    it('should create metadata with additional fields', () => {
      const usage = TokenUsageHelpers.create(100, 50);
      const metadata = ExecutionMetadataHelpers.create('gpt-4', {
        usage,
        cost: 0.0075,
        durationMs: 1234,
        stage: 'completion'
      });

      expect(metadata).toEqual({
        model: 'gpt-4',
        usage,
        cost: 0.0075,
        durationMs: 1234,
        stage: 'completion'
      });
    });

    it('should support arbitrary additional properties', () => {
      const metadata = ExecutionMetadataHelpers.create('claude-3-opus', {
        customField: 'custom value',
        temperature: 0.7,
        provider: 'anthropic'
      });

      expect(metadata.model).toBe('claude-3-opus');
      expect((metadata as any).customField).toBe('custom value');
      expect((metadata as any).temperature).toBe(0.7);
      expect((metadata as any).provider).toBe('anthropic');
    });

    it('should handle undefined additional fields', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4', undefined);

      expect(metadata).toEqual({
        model: 'gpt-4'
      });
    });

    it('should handle empty additional object', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4', {});

      expect(metadata).toEqual({
        model: 'gpt-4'
      });
    });
  });

  describe('merge', () => {
    it('should merge multiple metadata objects', () => {
      const meta1: ExecutionMetadata = {
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(100, 50),
        cost: 0.005,
        durationMs: 1000
      };

      const meta2: ExecutionMetadata = {
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(200, 75),
        cost: 0.01,
        durationMs: 1500,
        stage: 'completion'
      };

      const merged = ExecutionMetadataHelpers.merge(meta1, meta2);

      expect(merged).toEqual({
        model: 'gpt-4',
        usage: {
          promptTokens: 300,
          completionTokens: 125,
          totalTokens: 425
        },
        cost: 0.015,
        durationMs: 2500,
        stage: 'completion'
      });
    });

    it('should handle single metadata', () => {
      const meta: ExecutionMetadata = {
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(100, 50)
      };

      const merged = ExecutionMetadataHelpers.merge(meta);

      // Merge adds default cost and durationMs when summing
      expect(merged).toEqual({
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(100, 50),
        cost: 0,
        durationMs: 0
      });
    });

    it('should handle empty merge', () => {
      const merged = ExecutionMetadataHelpers.merge();

      expect(merged).toEqual({});
    });

    it('should override model with later metadata', () => {
      const meta1: ExecutionMetadata = { model: 'gpt-3.5' };
      const meta2: ExecutionMetadata = { model: 'gpt-4' };

      const merged = ExecutionMetadataHelpers.merge(meta1, meta2);

      expect(merged.model).toBe('gpt-4');
    });

    it('should combine usage from all metadata', () => {
      const meta1: ExecutionMetadata = {
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(100, 50)
      };

      const meta2: ExecutionMetadata = {
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(200, 100)
      };

      const meta3: ExecutionMetadata = {
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(50, 25)
      };

      const merged = ExecutionMetadataHelpers.merge(meta1, meta2, meta3);

      expect(merged.usage).toEqual({
        promptTokens: 350,
        completionTokens: 175,
        totalTokens: 525
      });
    });

    it('should sum costs from all metadata', () => {
      const meta1: ExecutionMetadata = { model: 'gpt-4', cost: 0.005 };
      const meta2: ExecutionMetadata = { model: 'gpt-4', cost: 0.01 };
      const meta3: ExecutionMetadata = { model: 'gpt-4', cost: 0.003 };

      const merged = ExecutionMetadataHelpers.merge(meta1, meta2, meta3);

      expect(merged.cost).toBeCloseTo(0.018, 3);
    });

    it('should sum durations from all metadata', () => {
      const meta1: ExecutionMetadata = { model: 'gpt-4', durationMs: 1000 };
      const meta2: ExecutionMetadata = { model: 'gpt-4', durationMs: 1500 };
      const meta3: ExecutionMetadata = { model: 'gpt-4', durationMs: 500 };

      const merged = ExecutionMetadataHelpers.merge(meta1, meta2, meta3);

      expect(merged.durationMs).toBe(3000);
    });

    it('should handle partial usage (only some metadata have usage)', () => {
      const meta1: ExecutionMetadata = {
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(100, 50)
      };

      const meta2: ExecutionMetadata = {
        model: 'gpt-4',
        cost: 0.005
      };

      const meta3: ExecutionMetadata = {
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(200, 100)
      };

      const merged = ExecutionMetadataHelpers.merge(meta1, meta2, meta3);

      expect(merged.usage).toEqual({
        promptTokens: 300,
        completionTokens: 150,
        totalTokens: 450
      });
    });

    it('should handle partial cost (only some metadata have cost)', () => {
      const meta1: ExecutionMetadata = { model: 'gpt-4', cost: 0.005 };
      const meta2: ExecutionMetadata = { model: 'gpt-4' };
      const meta3: ExecutionMetadata = { model: 'gpt-4', cost: 0.003 };

      const merged = ExecutionMetadataHelpers.merge(meta1, meta2, meta3);

      expect(merged.cost).toBeCloseTo(0.008, 3);
    });

    it('should merge arbitrary additional properties', () => {
      const meta1: ExecutionMetadata = {
        model: 'gpt-4',
        customField1: 'value1'
      };

      const meta2: ExecutionMetadata = {
        model: 'gpt-4',
        customField2: 'value2'
      };

      const merged = ExecutionMetadataHelpers.merge(meta1, meta2);

      expect((merged as any).customField1).toBe('value1');
      expect((merged as any).customField2).toBe('value2');
    });

    it('should override arbitrary properties with later values', () => {
      const meta1: ExecutionMetadata = {
        model: 'gpt-4',
        temperature: 0.5
      };

      const meta2: ExecutionMetadata = {
        model: 'gpt-4',
        temperature: 0.7
      };

      const merged = ExecutionMetadataHelpers.merge(meta1, meta2);

      expect((merged as any).temperature).toBe(0.7);
    });
  });

  describe('summarize', () => {
    it('should extract summary statistics', () => {
      const metadata: ExecutionMetadata = {
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(100, 50),
        cost: 0.0075,
        durationMs: 1234,
        stage: 'completion'
      };

      const summary = ExecutionMetadataHelpers.summarize(metadata);

      expect(summary).toEqual({
        model: 'gpt-4',
        totalTokens: 150,
        totalCost: 0.0075,
        durationMs: 1234
      });
    });

    it('should handle missing usage', () => {
      const metadata: ExecutionMetadata = {
        model: 'gpt-4',
        cost: 0.0075,
        durationMs: 1234
      };

      const summary = ExecutionMetadataHelpers.summarize(metadata);

      expect(summary).toEqual({
        model: 'gpt-4',
        totalTokens: 0,
        totalCost: 0.0075,
        durationMs: 1234
      });
    });

    it('should handle missing cost', () => {
      const metadata: ExecutionMetadata = {
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(100, 50),
        durationMs: 1234
      };

      const summary = ExecutionMetadataHelpers.summarize(metadata);

      expect(summary).toEqual({
        model: 'gpt-4',
        totalTokens: 150,
        totalCost: 0,
        durationMs: 1234
      });
    });

    it('should handle missing duration', () => {
      const metadata: ExecutionMetadata = {
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(100, 50),
        cost: 0.0075
      };

      const summary = ExecutionMetadataHelpers.summarize(metadata);

      expect(summary).toEqual({
        model: 'gpt-4',
        totalTokens: 150,
        totalCost: 0.0075,
        durationMs: 0
      });
    });

    it('should handle minimal metadata (model only)', () => {
      const metadata: ExecutionMetadata = {
        model: 'gpt-4'
      };

      const summary = ExecutionMetadataHelpers.summarize(metadata);

      expect(summary).toEqual({
        model: 'gpt-4',
        totalTokens: 0,
        totalCost: 0,
        durationMs: 0
      });
    });

    it('should ignore arbitrary additional properties', () => {
      const metadata: ExecutionMetadata = {
        model: 'gpt-4',
        usage: TokenUsageHelpers.create(100, 50),
        cost: 0.0075,
        durationMs: 1234,
        stage: 'completion',
        temperature: 0.7,
        customField: 'ignored'
      };

      const summary = ExecutionMetadataHelpers.summarize(metadata);

      expect(summary).toEqual({
        model: 'gpt-4',
        totalTokens: 150,
        totalCost: 0.0075,
        durationMs: 1234
      });
      expect((summary as any).stage).toBeUndefined();
      expect((summary as any).temperature).toBeUndefined();
      expect((summary as any).customField).toBeUndefined();
    });
  });

  describe('integration', () => {
    it('should support create -> merge -> summarize workflow', () => {
      const meta1 = ExecutionMetadataHelpers.create('gpt-4', {
        usage: TokenUsageHelpers.create(100, 50),
        cost: 0.005,
        durationMs: 1000,
        stage: 'retrieval'
      });

      const meta2 = ExecutionMetadataHelpers.create('gpt-4', {
        usage: TokenUsageHelpers.create(200, 100),
        cost: 0.01,
        durationMs: 1500,
        stage: 'generation'
      });

      const merged = ExecutionMetadataHelpers.merge(meta1, meta2);
      const summary = ExecutionMetadataHelpers.summarize(merged);

      expect(summary).toEqual({
        model: 'gpt-4',
        totalTokens: 450,
        totalCost: 0.015,
        durationMs: 2500
      });
    });

    it('should handle real-world multi-stage execution', () => {
      const stages: ExecutionMetadata[] = [
        {
          model: 'gpt-4',
          usage: TokenUsageHelpers.create(50, 20),
          cost: 0.0035,
          durationMs: 500,
          stage: 'classification'
        },
        {
          model: 'gpt-4',
          usage: TokenUsageHelpers.create(200, 150),
          cost: 0.0175,
          durationMs: 2000,
          stage: 'retrieval'
        },
        {
          model: 'gpt-4',
          usage: TokenUsageHelpers.create(500, 300),
          cost: 0.04,
          durationMs: 3000,
          stage: 'generation'
        },
        {
          model: 'gpt-4',
          usage: TokenUsageHelpers.create(100, 50),
          cost: 0.0075,
          durationMs: 800,
          stage: 'validation'
        }
      ];

      const total = ExecutionMetadataHelpers.merge(...stages);
      const summary = ExecutionMetadataHelpers.summarize(total);

      expect(summary.totalTokens).toBe(1370);
      expect(summary.totalCost).toBeCloseTo(0.0685, 4);
      expect(summary.durationMs).toBe(6300);
      expect(total.stage).toBe('validation'); // Last stage wins
    });
  });
});
