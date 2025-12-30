import { describe, it, expect } from 'vitest';
import { ModelConfigHelpers, type ModelConfig } from '../ModelConfig.js';

describe('ModelConfigHelpers', () => {
  describe('create', () => {
    it('should create config with defaults', () => {
      const config = ModelConfigHelpers.create('openai', 'gpt-4');

      expect(config).toEqual({
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        topP: 1.0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
      });
    });

    it('should apply overrides', () => {
      const config = ModelConfigHelpers.create('openai', 'gpt-4', {
        temperature: 0.9,
        maxTokens: 2000,
        topP: 0.95,
      });

      expect(config).toEqual({
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.9,
        maxTokens: 2000,
        topP: 0.95,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
      });
    });

    it('should support custom parameters', () => {
      const config = ModelConfigHelpers.create('openai', 'gpt-4', {
        customParam: 'value',
        temperature: 0.5,
      });

      expect((config as any).customParam).toBe('value');
      expect(config.temperature).toBe(0.5);
    });

    it('should create config for different providers', () => {
      const openai = ModelConfigHelpers.create('openai', 'gpt-4');
      const anthropic = ModelConfigHelpers.create('anthropic', 'claude-3-opus');
      const local = ModelConfigHelpers.create('local', 'llama-2-70b');

      expect(openai.provider).toBe('openai');
      expect(anthropic.provider).toBe('anthropic');
      expect(local.provider).toBe('local');
    });
  });

  describe('validate', () => {
    it('should accept valid config', () => {
      const config: ModelConfig = {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
        topP: 0.9,
        frequencyPenalty: 0.5,
        presencePenalty: 0.5,
      };

      const errors = ModelConfigHelpers.validate(config);

      expect(errors).toEqual([]);
    });

    it('should reject empty provider', () => {
      const config: ModelConfig = {
        provider: '',
        model: 'gpt-4',
      };

      const errors = ModelConfigHelpers.validate(config);

      expect(errors).toContain('Provider cannot be empty');
    });

    it('should reject whitespace-only provider', () => {
      const config: ModelConfig = {
        provider: '   ',
        model: 'gpt-4',
      };

      const errors = ModelConfigHelpers.validate(config);

      expect(errors).toContain('Provider cannot be empty');
    });

    it('should reject empty model', () => {
      const config: ModelConfig = {
        provider: 'openai',
        model: '',
      };

      const errors = ModelConfigHelpers.validate(config);

      expect(errors).toContain('Model cannot be empty');
    });

    it('should reject temperature out of range', () => {
      const config1: ModelConfig = {
        provider: 'openai',
        model: 'gpt-4',
        temperature: -0.1,
      };
      const config2: ModelConfig = {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 2.1,
      };

      expect(ModelConfigHelpers.validate(config1)).toContain(
        'Temperature must be between 0 and 2'
      );
      expect(ModelConfigHelpers.validate(config2)).toContain(
        'Temperature must be between 0 and 2'
      );
    });

    it('should accept temperature at boundaries', () => {
      const config1: ModelConfig = {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0,
      };
      const config2: ModelConfig = {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 2,
      };

      expect(ModelConfigHelpers.validate(config1)).toEqual([]);
      expect(ModelConfigHelpers.validate(config2)).toEqual([]);
    });

    it('should reject negative maxTokens', () => {
      const config: ModelConfig = {
        provider: 'openai',
        model: 'gpt-4',
        maxTokens: -100,
      };

      const errors = ModelConfigHelpers.validate(config);

      expect(errors).toContain('Max tokens must be positive');
    });

    it('should reject zero maxTokens', () => {
      const config: ModelConfig = {
        provider: 'openai',
        model: 'gpt-4',
        maxTokens: 0,
      };

      const errors = ModelConfigHelpers.validate(config);

      expect(errors).toContain('Max tokens must be positive');
    });

    it('should reject topP out of range', () => {
      const config1: ModelConfig = {
        provider: 'openai',
        model: 'gpt-4',
        topP: -0.1,
      };
      const config2: ModelConfig = {
        provider: 'openai',
        model: 'gpt-4',
        topP: 1.1,
      };

      expect(ModelConfigHelpers.validate(config1)).toContain(
        'Top P must be between 0 and 1'
      );
      expect(ModelConfigHelpers.validate(config2)).toContain(
        'Top P must be between 0 and 1'
      );
    });

    it('should reject frequencyPenalty out of range', () => {
      const config1: ModelConfig = {
        provider: 'openai',
        model: 'gpt-4',
        frequencyPenalty: -2.1,
      };
      const config2: ModelConfig = {
        provider: 'openai',
        model: 'gpt-4',
        frequencyPenalty: 2.1,
      };

      expect(ModelConfigHelpers.validate(config1)).toContain(
        'Frequency penalty must be between -2 and 2'
      );
      expect(ModelConfigHelpers.validate(config2)).toContain(
        'Frequency penalty must be between -2 and 2'
      );
    });

    it('should reject presencePenalty out of range', () => {
      const config1: ModelConfig = {
        provider: 'openai',
        model: 'gpt-4',
        presencePenalty: -2.1,
      };
      const config2: ModelConfig = {
        provider: 'openai',
        model: 'gpt-4',
        presencePenalty: 2.1,
      };

      expect(ModelConfigHelpers.validate(config1)).toContain(
        'Presence penalty must be between -2 and 2'
      );
      expect(ModelConfigHelpers.validate(config2)).toContain(
        'Presence penalty must be between -2 and 2'
      );
    });

    it('should collect multiple errors', () => {
      const config: ModelConfig = {
        provider: '',
        model: '',
        temperature: 3,
        maxTokens: -1,
      };

      const errors = ModelConfigHelpers.validate(config);

      expect(errors.length).toBeGreaterThan(1);
      expect(errors).toContain('Provider cannot be empty');
      expect(errors).toContain('Model cannot be empty');
    });
  });

  describe('isValid', () => {
    it('should return true for valid config', () => {
      const config = ModelConfigHelpers.create('openai', 'gpt-4');

      expect(ModelConfigHelpers.isValid(config)).toBe(true);
    });

    it('should return false for invalid config', () => {
      const config: ModelConfig = {
        provider: '',
        model: 'gpt-4',
      };

      expect(ModelConfigHelpers.isValid(config)).toBe(false);
    });

    it('should be equivalent to validate().length === 0', () => {
      const validConfig = ModelConfigHelpers.create('openai', 'gpt-4');
      const invalidConfig: ModelConfig = { provider: '', model: '' };

      expect(ModelConfigHelpers.isValid(validConfig)).toBe(
        ModelConfigHelpers.validate(validConfig).length === 0
      );
      expect(ModelConfigHelpers.isValid(invalidConfig)).toBe(
        ModelConfigHelpers.validate(invalidConfig).length === 0
      );
    });
  });

  describe('merge', () => {
    it('should merge configs', () => {
      const base: ModelConfig = {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
      };

      const override: Partial<ModelConfig> = {
        temperature: 0.9,
        topP: 0.95,
      };

      const merged = ModelConfigHelpers.merge(base, override);

      expect(merged).toEqual({
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.9,
        maxTokens: 1000,
        topP: 0.95,
      });
    });

    it('should override all fields', () => {
      const base: ModelConfig = {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
      };

      const override: Partial<ModelConfig> = {
        provider: 'anthropic',
        model: 'claude-3',
        temperature: 0.5,
      };

      const merged = ModelConfigHelpers.merge(base, override);

      expect(merged.provider).toBe('anthropic');
      expect(merged.model).toBe('claude-3');
      expect(merged.temperature).toBe(0.5);
    });

    it('should preserve base fields not in override', () => {
      const base: ModelConfig = {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
        topP: 0.9,
      };

      const override: Partial<ModelConfig> = {
        temperature: 0.5,
      };

      const merged = ModelConfigHelpers.merge(base, override);

      expect(merged.maxTokens).toBe(2000);
      expect(merged.topP).toBe(0.9);
    });

    it('should handle empty override', () => {
      const base = ModelConfigHelpers.create('openai', 'gpt-4');
      const merged = ModelConfigHelpers.merge(base, {});

      expect(merged).toEqual(base);
    });

    it('should merge custom parameters', () => {
      const base: ModelConfig = {
        provider: 'openai',
        model: 'gpt-4',
        customParam1: 'value1',
      };

      const override: Partial<ModelConfig> = {
        customParam2: 'value2',
      };

      const merged = ModelConfigHelpers.merge(base, override);

      expect((merged as any).customParam1).toBe('value1');
      expect((merged as any).customParam2).toBe('value2');
    });
  });

  describe('real-world configs', () => {
    it('should support OpenAI GPT-4 config', () => {
      const config: ModelConfig = {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
        topP: 1.0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        stopSequences: ['END'],
      };

      expect(ModelConfigHelpers.isValid(config)).toBe(true);
    });

    it('should support Anthropic Claude config', () => {
      const config: ModelConfig = {
        provider: 'anthropic',
        model: 'claude-3-opus-20240229',
        temperature: 0.5,
        maxTokens: 4096,
      };

      expect(ModelConfigHelpers.isValid(config)).toBe(true);
    });

    it('should support local model config', () => {
      const config: ModelConfig = {
        provider: 'local',
        model: 'llama-2-70b',
        temperature: 0.8,
        maxTokens: 1000,
        customEndpoint: 'http://localhost:8080',
      };

      expect(ModelConfigHelpers.isValid(config)).toBe(true);
    });

    it('should support deterministic generation with seed', () => {
      const config: ModelConfig = {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.0,
        seed: 42,
      };

      expect(ModelConfigHelpers.isValid(config)).toBe(true);
      expect(config.seed).toBe(42);
    });
  });
});
