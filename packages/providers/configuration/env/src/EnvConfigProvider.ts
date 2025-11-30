import { config as dotenvConfig } from 'dotenv';
import type {
  ConfigProvider,
  ConfigProviderOptions,
} from '@stratix/core';
import {
  ConfigNotFoundError,
  ConfigValidationError,
} from '@stratix/core';
import { autoTransform } from './transformers.js';

export interface EnvConfigProviderOptions<T = unknown> extends ConfigProviderOptions<T> {
  /**
   * Load .env file
   * @default true
   */
  loadDotenv?: boolean;

  /**
   * Path to .env file
   * @default '.env'
   */
  dotenvPath?: string;

  /**
   * Enable auto-transformation of values (string -> number, boolean, etc.)
   * @default true
   */
  autoTransform?: boolean;

  /**
   * Environment object to read from
   * @default process.env
   */
  env?: Record<string, string | undefined>;
}

/**
 * Environment-based configuration provider
 *
 * Reads configuration from environment variables with support for:
 * - .env files (using dotenv)
 * - Automatic type transformation
 * - Custom transformers
 * - Nested objects using double underscore notation (__)
 * - Validation with schemas
 *
 * @example
 * ```typescript
 * // Environment:
 * // APP_PORT=3000
 * // APP_DATABASE__URL=postgres://localhost/db
 * // APP_FEATURES__CACHE=true
 *
 * const config = new EnvConfigProvider({
 *   prefix: 'APP_',
 *   autoTransform: true,
 * });
 *
 * const port = await config.getRequired<number>('port'); // 3000
 * const dbUrl = await config.get<string>('database.url');
 * const cacheEnabled = await config.get<boolean>('features.cache');
 * ```
 */
export class EnvConfigProvider implements ConfigProvider {
  private readonly prefix: string;
  private readonly loadDotenv: boolean;
  private readonly autoTransformEnabled: boolean;
  private readonly transformers: Record<string, (value: string) => unknown>;
  private readonly env: Record<string, string | undefined>;
  private readonly schema?: ConfigProviderOptions['schema'];
  private cache: Map<string, unknown> | null;
  private cachedConfig: Record<string, unknown> | null = null;

  constructor(options: EnvConfigProviderOptions = {}) {
    this.prefix = options.prefix || '';
    this.loadDotenv = options.loadDotenv !== false;
    this.autoTransformEnabled = options.autoTransform !== false;
    this.transformers = options.transformers || {};
    this.env = options.env || process.env;
    this.schema = options.schema;
    this.cache = options.cache !== false ? new Map() : null;

    // Load .env file if enabled
    if (this.loadDotenv && !options.env) {
      dotenvConfig({ path: options.dotenvPath || '.env' });
    }
  }

  async get<T = unknown>(key: string, defaultValue?: T): Promise<T | undefined> {
    // Check cache first
    if (this.cache?.has(key)) {
      return this.cache.get(key) as T;
    }

    try {
      const value = this.getRawValue(key);
      if (value === undefined) {
        return defaultValue;
      }

      const transformed = this.transformValue(key, value) as T;

      // Cache the result
      if (this.cache) {
        this.cache.set(key, transformed);
      }

      return transformed;
    } catch (error) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw error;
    }
  }

  async getRequired<T = unknown>(key: string): Promise<T> {
    const value = await this.get<T>(key);
    if (value === undefined) {
      throw new ConfigNotFoundError(key);
    }
    return value;
  }

  async getAll<T = Record<string, unknown>>(): Promise<T> {
    // Return cached config if available
    if (this.cachedConfig) {
      return this.cachedConfig as T;
    }

    const config = this.buildConfigObject();

    // Validate if schema is provided
    if (this.schema) {
      const result = await this.schema.validate(config);
      if (!result.success) {
        throw new ConfigValidationError(
          'Configuration validation failed',
          result.errors || []
        );
      }
      this.cachedConfig = result.data as Record<string, unknown>;
      return result.data as T;
    }

    this.cachedConfig = config;
    return config as T;
  }

  async getNamespace<T = Record<string, unknown>>(namespace: string): Promise<T> {
    const allConfig = await this.getAll();
    const parts = namespace.split('.');
    let current: unknown = allConfig;

    for (const part of parts) {
      if (typeof current === 'object' && current !== null && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        throw new ConfigNotFoundError(namespace);
      }
    }

    return current as T;
  }

  async has(key: string): Promise<boolean> {
    const value = this.getRawValue(key);
    return value !== undefined;
  }

  async reload(): Promise<void> {
    // Clear cache
    this.cache?.clear();
    this.cachedConfig = null;

    // Reload .env file if enabled
    if (this.loadDotenv) {
      dotenvConfig({ path: '.env', override: true });
    }
  }

  private getRawValue(key: string): string | undefined {
    // Convert dot notation to env var format
    // 'database.url' -> 'DATABASE__URL'
    const envKey = this.keyToEnvVar(key);
    return this.env[envKey];
  }

  private keyToEnvVar(key: string): string {
    const normalized = key
      .split('.')
      .map(part => part.toUpperCase())
      .join('__');
    return this.prefix + normalized;
  }

  private transformValue(key: string, value: string): unknown {
    // Check for custom transformer
    if (this.transformers[key]) {
      return this.transformers[key](value);
    }

    // Auto-transform if enabled
    if (this.autoTransformEnabled) {
      return autoTransform(value);
    }

    return value;
  }

  private buildConfigObject(): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    const prefix = this.prefix.toUpperCase();

    for (const [envKey, envValue] of Object.entries(this.env)) {
      if (!envKey.startsWith(prefix) || envValue === undefined) {
        continue;
      }

      // Remove prefix
      const keyWithoutPrefix = envKey.slice(prefix.length);

      // Split by __ to get nested structure
      const parts = keyWithoutPrefix.split('__').map(p => p.toLowerCase());

      // Build nested object
      let current = config;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current)) {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }

      // Set value
      const lastPart = parts[parts.length - 1];
      const configKey = parts.join('.');
      current[lastPart] = this.transformValue(configKey, envValue);
    }

    return config;
  }
}
