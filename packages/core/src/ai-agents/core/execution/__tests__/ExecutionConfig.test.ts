import { describe, it, expect } from 'vitest';
import { ExecutionConfigHelpers, type ExecutionConfig } from '../ExecutionConfig.js';
import { RetryPolicies } from '../../../shared/RetryPolicy.js';

describe('ExecutionConfigHelpers', () => {
  describe('create', () => {
    it('should create empty config by default', () => {
      const config = ExecutionConfigHelpers.create();

      expect(config).toEqual({});
    });

    it('should create config with timeout', () => {
      const config = ExecutionConfigHelpers.create({
        timeout: 30000,
      });

      expect(config).toEqual({
        timeout: 30000,
      });
    });

    it('should create config with retry policy', () => {
      const config = ExecutionConfigHelpers.create({
        retry: RetryPolicies.CONSERVATIVE,
      });

      expect(config.retry).toBe(RetryPolicies.CONSERVATIVE);
    });

    it('should create config with metadata', () => {
      const config = ExecutionConfigHelpers.create({
        metadata: {
          requestId: 'req-123',
          priority: 'high',
        },
      });

      expect(config.metadata).toEqual({
        requestId: 'req-123',
        priority: 'high',
      });
    });

    it('should create config with all fields', () => {
      const config = ExecutionConfigHelpers.create({
        timeout: 60000,
        retry: RetryPolicies.AGGRESSIVE,
        metadata: {
          feature: 'test',
        },
      });

      expect(config).toEqual({
        timeout: 60000,
        retry: RetryPolicies.AGGRESSIVE,
        metadata: {
          feature: 'test',
        },
      });
    });
  });

  describe('merge', () => {
    it('should merge configs', () => {
      const base: ExecutionConfig = {
        timeout: 30000,
        retry: RetryPolicies.CONSERVATIVE,
      };

      const override: Partial<ExecutionConfig> = {
        timeout: 60000,
        metadata: {
          requestId: 'req-123',
        },
      };

      const merged = ExecutionConfigHelpers.merge(base, override);

      expect(merged).toEqual({
        timeout: 60000,
        retry: RetryPolicies.CONSERVATIVE,
        metadata: {
          requestId: 'req-123',
        },
      });
    });

    it('should override retry policy', () => {
      const base: ExecutionConfig = {
        retry: RetryPolicies.CONSERVATIVE,
      };

      const override: Partial<ExecutionConfig> = {
        retry: RetryPolicies.AGGRESSIVE,
      };

      const merged = ExecutionConfigHelpers.merge(base, override);

      expect(merged.retry).toBe(RetryPolicies.AGGRESSIVE);
    });

    it('should merge metadata', () => {
      const base: ExecutionConfig = {
        metadata: {
          key1: 'value1',
          key2: 'value2',
        },
      };

      const override: Partial<ExecutionConfig> = {
        metadata: {
          key2: 'newValue2',
          key3: 'value3',
        },
      };

      const merged = ExecutionConfigHelpers.merge(base, override);

      expect(merged.metadata).toEqual({
        key1: 'value1',
        key2: 'newValue2',
        key3: 'value3',
      });
    });

    it('should handle undefined metadata in base', () => {
      const base: ExecutionConfig = {
        timeout: 30000,
      };

      const override: Partial<ExecutionConfig> = {
        metadata: {
          key: 'value',
        },
      };

      const merged = ExecutionConfigHelpers.merge(base, override);

      expect(merged.metadata).toEqual({
        key: 'value',
      });
    });

    it('should handle undefined metadata in override', () => {
      const base: ExecutionConfig = {
        metadata: {
          key: 'value',
        },
      };

      const override: Partial<ExecutionConfig> = {
        timeout: 60000,
      };

      const merged = ExecutionConfigHelpers.merge(base, override);

      expect(merged.metadata).toEqual({
        key: 'value',
      });
    });

    it('should handle both metadata undefined', () => {
      const base: ExecutionConfig = {
        timeout: 30000,
      };

      const override: Partial<ExecutionConfig> = {
        retry: RetryPolicies.CONSERVATIVE,
      };

      const merged = ExecutionConfigHelpers.merge(base, override);

      expect(merged.metadata).toBeUndefined();
    });

    it('should handle empty override', () => {
      const base: ExecutionConfig = {
        timeout: 30000,
        retry: RetryPolicies.CONSERVATIVE,
      };

      const merged = ExecutionConfigHelpers.merge(base, {});

      expect(merged).toEqual(base);
    });
  });

  describe('validate', () => {
    it('should accept empty config', () => {
      const config: ExecutionConfig = {};

      const errors = ExecutionConfigHelpers.validate(config);

      expect(errors).toEqual([]);
    });

    it('should accept valid timeout', () => {
      const config: ExecutionConfig = {
        timeout: 30000,
      };

      const errors = ExecutionConfigHelpers.validate(config);

      expect(errors).toEqual([]);
    });

    it('should reject negative timeout', () => {
      const config: ExecutionConfig = {
        timeout: -1000,
      };

      const errors = ExecutionConfigHelpers.validate(config);

      expect(errors).toContain('Timeout must be positive');
    });

    it('should reject zero timeout', () => {
      const config: ExecutionConfig = {
        timeout: 0,
      };

      const errors = ExecutionConfigHelpers.validate(config);

      expect(errors).toContain('Timeout must be positive');
    });

    it('should reject timeout exceeding maximum', () => {
      const config: ExecutionConfig = {
        timeout: 600001, // 10 minutes + 1ms
      };

      const errors = ExecutionConfigHelpers.validate(config);

      expect(errors).toContain('Timeout cannot exceed 10 minutes (600000ms)');
    });

    it('should accept timeout at maximum', () => {
      const config: ExecutionConfig = {
        timeout: 600000, // Exactly 10 minutes
      };

      const errors = ExecutionConfigHelpers.validate(config);

      expect(errors).toEqual([]);
    });

    it('should accept config with retry policy', () => {
      const config: ExecutionConfig = {
        retry: RetryPolicies.CONSERVATIVE,
      };

      const errors = ExecutionConfigHelpers.validate(config);

      expect(errors).toEqual([]);
    });

    it('should accept config with metadata', () => {
      const config: ExecutionConfig = {
        metadata: {
          any: 'value',
          complex: {
            nested: 'object',
          },
        },
      };

      const errors = ExecutionConfigHelpers.validate(config);

      expect(errors).toEqual([]);
    });
  });

  describe('isValid', () => {
    it('should return true for valid config', () => {
      const config: ExecutionConfig = {
        timeout: 30000,
        retry: RetryPolicies.CONSERVATIVE,
      };

      expect(ExecutionConfigHelpers.isValid(config)).toBe(true);
    });

    it('should return false for invalid config', () => {
      const config: ExecutionConfig = {
        timeout: -1000,
      };

      expect(ExecutionConfigHelpers.isValid(config)).toBe(false);
    });

    it('should be equivalent to validate().length === 0', () => {
      const validConfig: ExecutionConfig = { timeout: 30000 };
      const invalidConfig: ExecutionConfig = { timeout: -1 };

      expect(ExecutionConfigHelpers.isValid(validConfig)).toBe(
        ExecutionConfigHelpers.validate(validConfig).length === 0
      );
      expect(ExecutionConfigHelpers.isValid(invalidConfig)).toBe(
        ExecutionConfigHelpers.validate(invalidConfig).length === 0
      );
    });
  });

  describe('real-world scenarios', () => {
    it('should support quick execution config', () => {
      const config: ExecutionConfig = {
        timeout: 5000, // 5 seconds
        retry: RetryPolicies.NONE,
      };

      expect(ExecutionConfigHelpers.isValid(config)).toBe(true);
    });

    it('should support long-running execution config', () => {
      const config: ExecutionConfig = {
        timeout: 300000, // 5 minutes
        retry: RetryPolicies.AGGRESSIVE,
      };

      expect(ExecutionConfigHelpers.isValid(config)).toBe(true);
    });

    it('should support background task config', () => {
      const config: ExecutionConfig = {
        timeout: 600000, // 10 minutes (max)
        retry: RetryPolicies.AGGRESSIVE,
        metadata: {
          priority: 'low',
          async: true,
        },
      };

      expect(ExecutionConfigHelpers.isValid(config)).toBe(true);
    });

    it('should support API request config', () => {
      const config: ExecutionConfig = {
        timeout: 30000, // 30 seconds
        retry: RetryPolicies.LLM_API,
        metadata: {
          requestId: 'req-abc-123',
          userId: 'user-456',
          endpoint: '/api/chat',
        },
      };

      expect(ExecutionConfigHelpers.isValid(config)).toBe(true);
    });

    it('should support no-timeout config for testing', () => {
      const config: ExecutionConfig = {
        retry: RetryPolicies.NONE,
        metadata: {
          environment: 'test',
        },
      };

      expect(ExecutionConfigHelpers.isValid(config)).toBe(true);
      expect(config.timeout).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle very small timeout', () => {
      const config: ExecutionConfig = {
        timeout: 1, // 1ms
      };

      expect(ExecutionConfigHelpers.isValid(config)).toBe(true);
    });

    it('should handle typical timeouts', () => {
      const timeouts = [1000, 5000, 10000, 30000, 60000, 120000];

      for (const timeout of timeouts) {
        const config: ExecutionConfig = { timeout };
        expect(ExecutionConfigHelpers.isValid(config)).toBe(true);
      }
    });

    it('should preserve metadata types', () => {
      const config: ExecutionConfig = {
        metadata: {
          string: 'value',
          number: 42,
          boolean: true,
          null: null,
          array: [1, 2, 3],
          object: { nested: 'value' },
        },
      };

      expect(ExecutionConfigHelpers.isValid(config)).toBe(true);
      expect(config.metadata?.string).toBe('value');
      expect(config.metadata?.number).toBe(42);
      expect(config.metadata?.boolean).toBe(true);
    });
  });
});
