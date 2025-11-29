import { describe, it, expect, beforeEach } from 'vitest';
import { EnvConfigProvider } from '../EnvConfigProvider.js';
import { ConfigNotFoundError, ConfigValidationError } from '@stratix/core';

describe('EnvConfigProvider', () => {
  describe('Basic Operations', () => {
    it('should get environment variable value', async () => {
      const provider = new EnvConfigProvider({
        prefix: 'TEST_',
        env: {
          'TEST_PORT': '3000',
        },
        loadDotenv: false,
      });

      const port = await provider.get('port');
      expect(port).toBe(3000);
    });

    it('should return default value when key not found', async () => {
      const provider = new EnvConfigProvider({
        prefix: 'TEST_',
        env: {},
        loadDotenv: false,
      });

      const port = await provider.get('port', 8080);
      expect(port).toBe(8080);
    });

    it('should throw error for required key that does not exist', async () => {
      const provider = new EnvConfigProvider({
        prefix: 'TEST_',
        env: {},
        loadDotenv: false,
      });

      await expect(provider.getRequired('port')).rejects.toThrow(ConfigNotFoundError);
    });

    it('should check if key exists', async () => {
      const provider = new EnvConfigProvider({
        prefix: 'TEST_',
        env: {
          'TEST_PORT': '3000',
        },
        loadDotenv: false,
      });

      expect(await provider.has('port')).toBe(true);
      expect(await provider.has('missing')).toBe(false);
    });
  });

  describe('Type Transformation', () => {
    it('should auto-transform string to number', async () => {
      const provider = new EnvConfigProvider({
        prefix: 'TEST_',
        env: {
          'TEST_PORT': '3000',
          'TEST_TIMEOUT': '5000',
        },
        loadDotenv: false,
        autoTransform: true,
      });

      const port = await provider.get<number>('port');
      expect(port).toBe(3000);
      expect(typeof port).toBe('number');
    });

    it('should auto-transform string to boolean', async () => {
      const provider = new EnvConfigProvider({
        prefix: 'TEST_',
        env: {
          'TEST_DEBUG': 'true',
          'TEST_VERBOSE': 'false',
        },
        loadDotenv: false,
        autoTransform: true,
      });

      expect(await provider.get<boolean>('debug')).toBe(true);
      expect(await provider.get<boolean>('verbose')).toBe(false);
    });

    it('should auto-transform comma-separated to array', async () => {
      const provider = new EnvConfigProvider({
        prefix: 'TEST_',
        env: {
          'TEST_TAGS': 'frontend,backend,api',
        },
        loadDotenv: false,
        autoTransform: true,
      });

      const tags = await provider.get<string[]>('tags');
      expect(tags).toEqual(['frontend', 'backend', 'api']);
    });

    it('should use custom transformer', async () => {
      const provider = new EnvConfigProvider({
        prefix: 'TEST_',
        env: {
          'TEST_TIMEOUT': '5',
        },
        loadDotenv: false,
        transformers: {
          'timeout': (value) => parseInt(value, 10) * 1000,
        },
      });

      const timeout = await provider.get<number>('timeout');
      expect(timeout).toBe(5000);
    });
  });

  describe('Nested Objects', () => {
    it('should create nested object from double underscore notation', async () => {
      const provider = new EnvConfigProvider({
        prefix: 'TEST_',
        env: {
          'TEST_DATABASE__URL': 'postgresql://localhost/db',
          'TEST_DATABASE__POOL__MIN': '5',
          'TEST_DATABASE__POOL__MAX': '20',
        },
        loadDotenv: false,
        autoTransform: true,
      });

      const config = await provider.getAll();
      expect(config).toEqual({
        database: {
          url: 'postgresql://localhost/db',
          pool: {
            min: 5,
            max: 20,
          },
        },
      });
    });

    it('should get namespace', async () => {
      const provider = new EnvConfigProvider({
        prefix: 'TEST_',
        env: {
          'TEST_DATABASE__URL': 'postgresql://localhost/db',
          'TEST_DATABASE__POOL__SIZE': '10',
        },
        loadDotenv: false,
        autoTransform: true,
      });

      const dbConfig = await provider.getNamespace('database');
      expect(dbConfig).toEqual({
        url: 'postgresql://localhost/db',
        pool: {
          size: 10,
        },
      });
    });

    it('should get nested value with dot notation', async () => {
      const provider = new EnvConfigProvider({
        prefix: 'TEST_',
        env: {
          'TEST_DATABASE__POOL__SIZE': '10',
        },
        loadDotenv: false,
        autoTransform: true,
      });

      const poolSize = await provider.get<number>('database.pool.size');
      expect(poolSize).toBe(10);
    });
  });

  describe('Validation', () => {
    it('should validate configuration with schema', async () => {
      const schema = {
        async validate(data: unknown) {
          const config = data as Record<string, unknown>;
          if (typeof config.port !== 'number' || config.port < 1000) {
            return {
              success: false,
              errors: [{ path: 'port', message: 'Port must be >= 1000' }],
            };
          }
          return { success: true, data };
        },
      };

      const provider = new EnvConfigProvider({
        prefix: 'TEST_',
        env: {
          'TEST_PORT': '3000',
        },
        loadDotenv: false,
        schema,
      });

      const config = await provider.getAll();
      expect(config.port).toBe(3000);
    });

    it('should throw validation error for invalid config', async () => {
      const schema = {
        async validate(data: unknown) {
          return {
            success: false,
            errors: [
              { path: 'port', message: 'Port is required' },
            ],
          };
        },
      };

      const provider = new EnvConfigProvider({
        prefix: 'TEST_',
        env: {},
        loadDotenv: false,
        schema,
      });

      await expect(provider.getAll()).rejects.toThrow(ConfigValidationError);
    });
  });

  describe('Cache', () => {
    it('should cache values when enabled', async () => {
      let callCount = 0;
      const provider = new EnvConfigProvider({
        prefix: 'TEST_',
        env: {
          'TEST_PORT': '3000',
        },
        loadDotenv: false,
        cache: true,
        transformers: {
          'port': (value) => {
            callCount++;
            return parseInt(value, 10);
          },
        },
      });

      await provider.get('port');
      await provider.get('port');
      await provider.get('port');

      expect(callCount).toBe(1); // Transformer called only once
    });

    it('should not cache when disabled', async () => {
      let callCount = 0;
      const provider = new EnvConfigProvider({
        prefix: 'TEST_',
        env: {
          'TEST_PORT': '3000',
        },
        loadDotenv: false,
        cache: false,
        transformers: {
          'port': (value) => {
            callCount++;
            return parseInt(value, 10);
          },
        },
      });

      await provider.get('port');
      await provider.get('port');
      await provider.get('port');

      expect(callCount).toBe(3); // Transformer called every time
    });
  });

  describe('Reload', () => {
    it('should clear cache on reload', async () => {
      const env = {
        'TEST_PORT': '3000',
      };

      const provider = new EnvConfigProvider({
        prefix: 'TEST_',
        env,
        loadDotenv: false,
        cache: true,
      });

      const port1 = await provider.get('port');
      expect(port1).toBe(3000);

      // Change env
      env['TEST_PORT'] = '8080';

      // Should still return cached value
      const port2 = await provider.get('port');
      expect(port2).toBe(3000);

      // Reload
      await provider.reload();

      // Should return new value
      const port3 = await provider.get('port');
      expect(port3).toBe(8080);
    });
  });

  describe('Prefix Handling', () => {
    it('should work without prefix', async () => {
      const provider = new EnvConfigProvider({
        env: {
          'PORT': '3000',
        },
        loadDotenv: false,
      });

      const port = await provider.get('port');
      expect(port).toBe(3000);
    });

    it('should ignore variables without prefix', async () => {
      const provider = new EnvConfigProvider({
        prefix: 'APP_',
        env: {
          'PORT': '3000',
          'APP_PORT': '8080',
        },
        loadDotenv: false,
      });

      const port = await provider.get('port');
      expect(port).toBe(8080); // Should get APP_PORT, not PORT
    });
  });
});
