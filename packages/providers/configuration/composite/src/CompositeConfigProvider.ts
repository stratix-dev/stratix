import type {
  ConfigProvider,
  ConfigProviderOptions,
  ConfigChange,
} from '@stratix/core';
import {
  ConfigNotFoundError,
  ConfigValidationError,
} from '@stratix/core';
import { applyStrategy, type MergeStrategy } from './strategies.js';

export interface CompositeConfigProviderOptions<T = unknown> extends ConfigProviderOptions<T> {
  /**
   * Array of config providers (in priority order)
   * For 'first-wins': earlier providers have higher priority
   * For 'last-wins': later providers have higher priority
   * For 'merge': all providers are merged
   */
  providers: ConfigProvider[];

  /**
   * Merge strategy for combining values from multiple providers
   * - 'first-wins': First provider with the value wins (default)
   * - 'last-wins': Last provider with the value wins
   * - 'merge': Deep merge objects from all providers
   *
   * @default 'first-wins'
   */
  strategy?: MergeStrategy;
}

/**
 * Composite configuration provider
 *
 * Combines multiple configuration providers with configurable merge strategies.
 *
 * @example
 * ```typescript
 * const config = new CompositeConfigProvider({
 *   providers: [
 *     new EnvConfigProvider({ prefix: 'APP_' }),     // Highest priority
 *     new FileConfigProvider({ files: ['config.json'] }), // Fallback
 *   ],
 *   strategy: 'first-wins',
 * });
 *
 * // Searches ENV first, then file
 * const port = await config.get<number>('port');
 * ```
 */
export class CompositeConfigProvider implements ConfigProvider {
  private readonly providers: ConfigProvider[];
  private readonly strategy: MergeStrategy;
  private readonly schema?: ConfigProviderOptions['schema'];
  private cache: Map<string, unknown> | null;
  private cachedConfig: Record<string, unknown> | null = null;

  constructor(options: CompositeConfigProviderOptions) {
    if (!options.providers || options.providers.length === 0) {
      throw new Error('CompositeConfigProvider requires at least one provider');
    }

    this.providers = options.providers;
    this.strategy = options.strategy || 'first-wins';
    this.schema = options.schema;
    this.cache = options.cache !== false ? new Map() : null;
  }

  async get<T = unknown>(key: string, defaultValue?: T): Promise<T | undefined> {
    // Check cache first
    if (this.cache?.has(key)) {
      return this.cache.get(key) as T;
    }

    try {
      // Get values from all providers
      const values = await Promise.all(
        this.providers.map(async provider => {
          try {
            return await provider.get<T>(key);
          } catch {
            return undefined;
          }
        })
      );

      // Apply merge strategy
      const result = applyStrategy(this.strategy, values);

      if (result === undefined) {
        return defaultValue;
      }

      // Cache the result
      if (this.cache) {
        this.cache.set(key, result);
      }

      return result as T;
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

    // Get all configs from all providers
    const allConfigs = await Promise.all(
      this.providers.map(async provider => {
        try {
          return await provider.getAll();
        } catch {
          return {};
        }
      })
    );

    // Apply merge strategy to entire configs
    let mergedConfig: Record<string, unknown>;

    if (this.strategy === 'merge') {
      // Deep merge all configs
      mergedConfig = this.deepMergeAll(allConfigs);
    } else if (this.strategy === 'last-wins') {
      // Start with empty and overlay each config (last wins)
      mergedConfig = {};
      for (const config of allConfigs) {
        mergedConfig = { ...mergedConfig, ...config };
      }
    } else {
      // first-wins: Start with last and overlay backwards (first wins)
      mergedConfig = {};
      for (let i = allConfigs.length - 1; i >= 0; i--) {
        mergedConfig = { ...mergedConfig, ...allConfigs[i] };
      }
    }

    // Validate if schema is provided
    if (this.schema) {
      const result = await this.schema.validate(mergedConfig);
      if (!result.success) {
        throw new ConfigValidationError(
          'Configuration validation failed',
          result.errors || []
        );
      }
      this.cachedConfig = result.data as Record<string, unknown>;
      return result.data as T;
    }

    this.cachedConfig = mergedConfig;
    return mergedConfig as T;
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
    try {
      const value = await this.get(key);
      return value !== undefined;
    } catch {
      return false;
    }
  }

  async reload(): Promise<void> {
    // Clear cache
    this.cache?.clear();
    this.cachedConfig = null;

    // Reload all providers that support it
    await Promise.all(
      this.providers.map(async provider => {
        if (provider.reload) {
          try {
            await provider.reload();
          } catch (error) {
            console.error('Failed to reload provider:', error);
          }
        }
      })
    );
  }

  watch(callback: (changes: ConfigChange[]) => void): () => void {
    const unsubscribers: (() => void)[] = [];

    // Subscribe to all providers that support watching
    for (const provider of this.providers) {
      if (provider.watch) {
        const unsubscribe = provider.watch((changes) => {
          // Clear cache when any provider changes
          this.cache?.clear();
          this.cachedConfig = null;

          // Forward the changes
          callback(changes);
        });
        unsubscribers.push(unsubscribe);
      }
    }

    // Return combined unsubscribe function
    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
    };
  }

  private deepMergeAll(configs: Record<string, unknown>[]): Record<string, unknown> {
    if (configs.length === 0) {
      return {};
    }

    if (configs.length === 1) {
      return configs[0];
    }

    let result = configs[0];
    for (let i = 1; i < configs.length; i++) {
      result = this.deepMerge(result, configs[i]);
    }

    return result;
  }

  private deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>
  ): Record<string, unknown> {
    const result = { ...target };

    for (const key in source) {
      const targetValue = result[key];
      const sourceValue = source[key];

      if (
        typeof targetValue === 'object' &&
        targetValue !== null &&
        !Array.isArray(targetValue) &&
        typeof sourceValue === 'object' &&
        sourceValue !== null &&
        !Array.isArray(sourceValue)
      ) {
        result[key] = this.deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        );
      } else {
        result[key] = sourceValue;
      }
    }

    return result;
  }
}
