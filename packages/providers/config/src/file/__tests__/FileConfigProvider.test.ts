import { describe, it, expect, beforeEach } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { FileConfigProvider } from '../FileConfigProvider.js';
import { ConfigNotFoundError, ConfigValidationError } from '@stratix/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('FileConfigProvider', () => {
  const fixturesDir = join(__dirname, 'fixtures');

  describe('JSON Files', () => {
    it('should load JSON configuration file', async () => {
      const provider = new FileConfigProvider({
        files: [join(fixturesDir, 'config.json')],
      });

      const config = await provider.getAll();
      expect(config).toHaveProperty('server');
      expect(config).toHaveProperty('database');
    });

    it('should get specific value from JSON', async () => {
      const provider = new FileConfigProvider({
        files: [join(fixturesDir, 'config.json')],
      });

      const port = await provider.get<number>('server.port');
      expect(port).toBe(3000);
    });

    it('should get namespace from JSON', async () => {
      const provider = new FileConfigProvider({
        files: [join(fixturesDir, 'config.json')],
      });

      const serverConfig = await provider.getNamespace('server');
      expect(serverConfig).toEqual({
        port: 3000,
        host: 'localhost',
      });
    });
  });

  describe('YAML Files', () => {
    it('should load YAML configuration file', async () => {
      const provider = new FileConfigProvider({
        files: [join(fixturesDir, 'config.yaml')],
      });

      const config = await provider.getAll();
      expect(config).toHaveProperty('server');
      expect(config).toHaveProperty('database');
    });

    it('should get specific value from YAML', async () => {
      const provider = new FileConfigProvider({
        files: [join(fixturesDir, 'config.yaml')],
      });

      const port = await provider.get<number>('server.port');
      expect(port).toBe(4000);
    });
  });

  describe('Multiple Files with Merge', () => {
    it('should merge multiple JSON files', async () => {
      const provider = new FileConfigProvider({
        files: [
          join(fixturesDir, 'config.json'),
          join(fixturesDir, 'override.json'),
        ],
      });

      const config = await provider.getAll();

      // Override should win
      expect(config.server).toEqual({
        port: 8080,
        host: 'localhost', // From base
      });

      expect(config.database).toEqual({
        url: 'postgresql://localhost/test', // From base
        poolSize: 20, // From override
      });
    });

    it('should preserve values not in override', async () => {
      const provider = new FileConfigProvider({
        files: [
          join(fixturesDir, 'config.json'),
          join(fixturesDir, 'override.json'),
        ],
      });

      const features = await provider.getNamespace('features');
      expect(features).toEqual({
        enableCache: true, // From base, not overridden
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error for missing required file', async () => {
      const provider = new FileConfigProvider({
        files: [join(fixturesDir, 'nonexistent.json')],
        optional: false,
      });

      await expect(provider.getAll()).rejects.toThrow();
    });

    it('should skip optional missing files', async () => {
      const provider = new FileConfigProvider({
        files: [
          join(fixturesDir, 'config.json'),
          join(fixturesDir, 'nonexistent.json'),
        ],
        optional: true,
      });

      const config = await provider.getAll();
      expect(config).toHaveProperty('server');
    });

    it('should throw for unsupported file extension', async () => {
      const provider = new FileConfigProvider({
        files: [join(fixturesDir, 'config.txt')],
      });

      await expect(provider.getAll()).rejects.toThrow();
    });
  });

  describe('Basic Operations', () => {
    it('should return default value when key not found', async () => {
      const provider = new FileConfigProvider({
        files: [join(fixturesDir, 'config.json')],
      });

      const value = await provider.get('nonexistent', 'default');
      expect(value).toBe('default');
    });

    it('should throw error for required key that does not exist', async () => {
      const provider = new FileConfigProvider({
        files: [join(fixturesDir, 'config.json')],
      });

      await expect(provider.getRequired('nonexistent')).rejects.toThrow(ConfigNotFoundError);
    });

    it('should check if key exists', async () => {
      const provider = new FileConfigProvider({
        files: [join(fixturesDir, 'config.json')],
      });

      expect(await provider.has('server.port')).toBe(true);
      expect(await provider.has('nonexistent')).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should validate configuration with schema', async () => {
      const schema = {
        async validate(data: unknown) {
          const config = data as Record<string, unknown>;
          const server = config.server as Record<string, unknown>;

          if (typeof server.port !== 'number' || server.port < 1000) {
            return {
              success: false,
              errors: [{ path: 'server.port', message: 'Port must be >= 1000' }],
            };
          }
          return { success: true, data };
        },
      };

      const provider = new FileConfigProvider({
        files: [join(fixturesDir, 'config.json')],
        schema,
      });

      const config = await provider.getAll();
      expect(config).toHaveProperty('server');
    });

    it('should throw validation error for invalid config', async () => {
      const schema = {
        async validate() {
          return {
            success: false,
            errors: [{ path: 'port', message: 'Port is required' }],
          };
        },
      };

      const provider = new FileConfigProvider({
        files: [join(fixturesDir, 'config.json')],
        schema,
      });

      await expect(provider.getAll()).rejects.toThrow(ConfigValidationError);
    });
  });

  describe('Deep Merge', () => {
    it('should deep merge nested objects', async () => {
      const provider = new FileConfigProvider({
        files: [
          join(fixturesDir, 'config.json'),
          join(fixturesDir, 'override.json'),
        ],
      });

      const database = await provider.getNamespace('database');

      // Should have properties from both files
      expect(database).toHaveProperty('url');
      expect(database).toHaveProperty('poolSize');

      // Override should win for poolSize
      expect(database.poolSize).toBe(20);

      // Base should provide url
      expect(database.url).toBe('postgresql://localhost/test');
    });
  });

  describe('Reload', () => {
    it('should reload configuration', async () => {
      const provider = new FileConfigProvider({
        files: [join(fixturesDir, 'config.json')],
      });

      const port1 = await provider.get('server.port');
      expect(port1).toBe(3000);

      await provider.reload();

      const port2 = await provider.get('server.port');
      expect(port2).toBe(3000);
    });
  });
});
