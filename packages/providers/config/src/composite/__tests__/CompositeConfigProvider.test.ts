import { describe, it, expect, beforeEach } from 'vitest';
import { CompositeConfigProvider } from '../CompositeConfigProvider.js';
import type { ConfigProvider } from '@stratix/core';
import { ConfigNotFoundError } from '@stratix/core';

// Mock ConfigProvider
class MockConfigProvider implements ConfigProvider {
  constructor(private config: Record<string, unknown>) {}

  async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const parts = key.split('.');
    let current: any = this.config;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return defaultValue;
      }
    }

    return current as T;
  }

  async getRequired<T>(key: string): Promise<T> {
    const value = await this.get<T>(key);
    if (value === undefined) {
      throw new ConfigNotFoundError(key);
    }
    return value;
  }

  async getAll<T>(): Promise<T> {
    return this.config as T;
  }

  async getNamespace<T>(namespace: string): Promise<T> {
    const value = await this.get<T>(namespace);
    if (value === undefined) {
      throw new ConfigNotFoundError(namespace);
    }
    return value;
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== undefined;
  }
}

describe('CompositeConfigProvider', () => {
  describe('Constructor', () => {
    it('should throw error if no providers are given', () => {
      expect(() => new CompositeConfigProvider({ providers: [] })).toThrow();
    });

    it('should accept single provider', () => {
      const provider = new MockConfigProvider({ port: 3000 });
      const composite = new CompositeConfigProvider({ providers: [provider] });
      expect(composite).toBeDefined();
    });
  });

  describe('first-wins Strategy', () => {
    it('should use value from first provider', async () => {
      const provider1 = new MockConfigProvider({ port: 3000 });
      const provider2 = new MockConfigProvider({ port: 8080 });

      const composite = new CompositeConfigProvider({
        providers: [provider1, provider2],
        strategy: 'first-wins',
      });

      const port = await composite.get('port');
      expect(port).toBe(3000);
    });

    it('should fallback to second provider if first does not have value', async () => {
      const provider1 = new MockConfigProvider({ host: 'localhost' });
      const provider2 = new MockConfigProvider({ port: 8080 });

      const composite = new CompositeConfigProvider({
        providers: [provider1, provider2],
        strategy: 'first-wins',
      });

      const port = await composite.get('port');
      expect(port).toBe(8080);
    });

    it('should get values from different providers', async () => {
      const provider1 = new MockConfigProvider({ port: 3000 });
      const provider2 = new MockConfigProvider({ host: 'localhost' });

      const composite = new CompositeConfigProvider({
        providers: [provider1, provider2],
        strategy: 'first-wins',
      });

      const port = await composite.get('port');
      const host = await composite.get('host');

      expect(port).toBe(3000);
      expect(host).toBe('localhost');
    });
  });

  describe('last-wins Strategy', () => {
    it('should use value from last provider', async () => {
      const provider1 = new MockConfigProvider({ port: 3000 });
      const provider2 = new MockConfigProvider({ port: 8080 });

      const composite = new CompositeConfigProvider({
        providers: [provider1, provider2],
        strategy: 'last-wins',
      });

      const port = await composite.get('port');
      expect(port).toBe(8080);
    });
  });

  describe('merge Strategy', () => {
    it('should deep merge configurations', async () => {
      const provider1 = new MockConfigProvider({
        server: { port: 3000, host: 'localhost' },
        database: { url: 'postgres://localhost' },
      });

      const provider2 = new MockConfigProvider({
        server: { port: 8080 },
        cache: { enabled: true },
      });

      const composite = new CompositeConfigProvider({
        providers: [provider1, provider2],
        strategy: 'merge',
      });

      const config = await composite.getAll();

      expect(config).toEqual({
        server: {
          port: 8080,
          host: 'localhost',
        },
        database: {
          url: 'postgres://localhost',
        },
        cache: {
          enabled: true,
        },
      });
    });

    it('should deep merge nested objects', async () => {
      const provider1 = new MockConfigProvider({
        database: {
          pool: {
            min: 2,
            max: 10,
          },
        },
      });

      const provider2 = new MockConfigProvider({
        database: {
          pool: {
            max: 20,
          },
        },
      });

      const composite = new CompositeConfigProvider({
        providers: [provider1, provider2],
        strategy: 'merge',
      });

      const database = await composite.getNamespace('database');

      expect(database).toEqual({
        pool: {
          min: 2,
          max: 20,
        },
      });
    });
  });

  describe('Basic Operations', () => {
    let composite: CompositeConfigProvider;

    beforeEach(() => {
      const provider1 = new MockConfigProvider({
        server: { port: 3000 },
      });

      const provider2 = new MockConfigProvider({
        database: { url: 'postgres://localhost' },
      });

      composite = new CompositeConfigProvider({
        providers: [provider1, provider2],
      });
    });

    it('should get value with default', async () => {
      const timeout = await composite.get('timeout', 5000);
      expect(timeout).toBe(5000);
    });

    it('should throw for required missing key', async () => {
      await expect(composite.getRequired('missing')).rejects.toThrow(ConfigNotFoundError);
    });

    it('should check if key exists', async () => {
      expect(await composite.has('server.port')).toBe(true);
      expect(await composite.has('missing')).toBe(false);
    });

    it('should get namespace', async () => {
      const server = await composite.getNamespace('server');
      expect(server).toEqual({ port: 3000 });
    });
  });

  describe('Validation', () => {
    it('should validate merged configuration', async () => {
      const provider1 = new MockConfigProvider({ port: 3000 });
      const provider2 = new MockConfigProvider({ host: 'localhost' });

      const schema = {
        async validate(data: unknown) {
          const config = data as Record<string, unknown>;
          if (typeof config.port !== 'number') {
            return {
              success: false,
              errors: [{ path: 'port', message: 'Port must be a number' }],
            };
          }
          return { success: true, data };
        },
      };

      const composite = new CompositeConfigProvider({
        providers: [provider1, provider2],
        schema,
      });

      const config = await composite.getAll();
      expect(config).toHaveProperty('port');
      expect(config).toHaveProperty('host');
    });
  });

  describe('Cache', () => {
    it('should cache values when enabled', async () => {
      let callCount = 0;

      class CountingProvider implements ConfigProvider {
        async get<T>(key: string): Promise<T | undefined> {
          callCount++;
          return 3000 as T;
        }

        async getRequired<T>(): Promise<T> {
          return 3000 as T;
        }

        async getAll<T>(): Promise<T> {
          return {} as T;
        }

        async getNamespace<T>(): Promise<T> {
          return {} as T;
        }

        async has(): Promise<boolean> {
          return true;
        }
      }

      const composite = new CompositeConfigProvider({
        providers: [new CountingProvider()],
        cache: true,
      });

      await composite.get('port');
      await composite.get('port');
      await composite.get('port');

      expect(callCount).toBe(1); // Should be cached
    });
  });

  describe('Error Handling', () => {
    it('should handle provider errors gracefully', async () => {
      class FailingProvider implements ConfigProvider {
        async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
          throw new Error('Provider failed');
        }

        async getRequired<T>(): Promise<T> {
          throw new Error('Provider failed');
        }

        async getAll<T>(): Promise<T> {
          throw new Error('Provider failed');
        }

        async getNamespace<T>(): Promise<T> {
          throw new Error('Provider failed');
        }

        async has(): Promise<boolean> {
          throw new Error('Provider failed');
        }
      }

      const goodProvider = new MockConfigProvider({ port: 3000 });
      const composite = new CompositeConfigProvider({
        providers: [new FailingProvider(), goodProvider],
      });

      const port = await composite.get('port');
      expect(port).toBe(3000);
    });
  });
});
