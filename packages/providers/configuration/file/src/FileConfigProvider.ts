import { watch as chokidarWatch, type FSWatcher } from 'chokidar';
import type {
  ConfigProvider,
  ConfigProviderOptions,
  ConfigChange,
} from '@stratix/core';
import {
  ConfigNotFoundError,
  ConfigValidationError,
} from '@stratix/core';
import { loadJsonFile } from './loaders/JsonLoader.js';
import { loadYamlFile } from './loaders/YamlLoader.js';

export interface FileConfigProviderOptions<T = unknown> extends ConfigProviderOptions<T> {
  /**
   * Array of file paths to load (in order of priority)
   * Later files override earlier ones
   */
  files: string[];

  /**
   * Skip files that don't exist instead of throwing error
   * @default false
   */
  optional?: boolean;
}

type WatchCallback = (changes: ConfigChange[]) => void;

/**
 * File-based configuration provider
 *
 * Loads configuration from JSON and YAML files with support for:
 * - Multiple files with merge
 * - Hot reload with file watchers
 * - Validation with schemas
 * - Environment-specific overrides
 *
 * @example
 * ```typescript
 * const config = new FileConfigProvider({
 *   files: [
 *     './config/default.json',
 *     './config/production.json',
 *   ],
 *   watch: true,
 * });
 *
 * // Watch for changes
 * config.watch?.((changes) => {
 *   console.log('Config changed:', changes);
 * });
 * ```
 */
export class FileConfigProvider implements ConfigProvider {
  private readonly files: string[];
  private readonly optional: boolean;
  private readonly schema?: ConfigProviderOptions['schema'];
  private readonly watchEnabled: boolean;
  private config: Record<string, unknown> | null = null;
  private watcher: FSWatcher | null = null;
  private watchCallbacks: Set<WatchCallback> = new Set();

  constructor(options: FileConfigProviderOptions) {
    this.files = options.files;
    this.optional = options.optional || false;
    this.schema = options.schema;
    this.watchEnabled = options.watch || false;
  }

  async get<T = unknown>(key: string, defaultValue?: T): Promise<T | undefined> {
    await this.ensureLoaded();

    const value = this.getValueByPath(this.config!, key);
    if (value === undefined) {
      return defaultValue;
    }

    return value as T;
  }

  async getRequired<T = unknown>(key: string): Promise<T> {
    const value = await this.get<T>(key);
    if (value === undefined) {
      throw new ConfigNotFoundError(key);
    }
    return value;
  }

  async getAll<T = Record<string, unknown>>(): Promise<T> {
    await this.ensureLoaded();

    // Validate if schema is provided
    if (this.schema && this.config) {
      const result = await this.schema.validate(this.config);
      if (!result.success) {
        throw new ConfigValidationError(
          'Configuration validation failed',
          result.errors || []
        );
      }
      return result.data as T;
    }

    return this.config as T;
  }

  async getNamespace<T = Record<string, unknown>>(namespace: string): Promise<T> {
    await this.ensureLoaded();

    const value = this.getValueByPath(this.config!, namespace);
    if (value === undefined) {
      throw new ConfigNotFoundError(namespace);
    }

    return value as T;
  }

  async has(key: string): Promise<boolean> {
    await this.ensureLoaded();
    const value = this.getValueByPath(this.config!, key);
    return value !== undefined;
  }

  async reload(): Promise<void> {
    const oldConfig = this.config ? { ...this.config } : null;
    this.config = null;
    await this.loadFiles();

    // Notify watchers of changes
    if (oldConfig && this.config) {
      const changes = this.detectChanges(oldConfig, this.config);
      if (changes.length > 0) {
        this.notifyWatchers(changes);
      }
    }
  }

  watch(callback: WatchCallback): () => void {
    this.watchCallbacks.add(callback);

    // Start watcher if not already started
    if (!this.watcher && this.watchEnabled) {
      this.startWatcher();
    }

    // Return unsubscribe function
    return () => {
      this.watchCallbacks.delete(callback);

      // Stop watcher if no more callbacks
      if (this.watchCallbacks.size === 0 && this.watcher) {
        this.stopWatcher();
      }
    };
  }

  private async ensureLoaded(): Promise<void> {
    if (this.config === null) {
      await this.loadFiles();
    }
  }

  private async loadFiles(): Promise<void> {
    let merged: Record<string, unknown> = {};

    for (const file of this.files) {
      try {
        const data = await this.loadFile(file);
        merged = this.deepMerge(merged, data);
      } catch (error) {
        if (!this.optional) {
          throw error;
        }
        // Skip optional files that don't exist
      }
    }

    this.config = merged;
  }

  private async loadFile(filePath: string): Promise<Record<string, unknown>> {
    const ext = filePath.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'json':
        return loadJsonFile(filePath);
      case 'yaml':
      case 'yml':
        return loadYamlFile(filePath);
      default:
        throw new Error(`Unsupported file extension: ${ext}`);
    }
  }

  private getValueByPath(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (typeof current === 'object' && current !== null && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
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

  private startWatcher(): void {
    this.watcher = chokidarWatch(this.files, {
      ignoreInitial: true,
      persistent: true,
    });

    this.watcher.on('change', () => {
      void this.reload();
    });
  }

  private stopWatcher(): void {
    if (this.watcher) {
      void this.watcher.close();
      this.watcher = null;
    }
  }

  private detectChanges(
    oldConfig: Record<string, unknown>,
    newConfig: Record<string, unknown>,
    prefix = ''
  ): ConfigChange[] {
    const changes: ConfigChange[] = [];
    const allKeys = new Set([...Object.keys(oldConfig), ...Object.keys(newConfig)]);

    for (const key of allKeys) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const oldValue = oldConfig[key];
      const newValue = newConfig[key];

      if (oldValue !== newValue) {
        // Check if both are objects (for nested comparison)
        if (
          typeof oldValue === 'object' &&
          oldValue !== null &&
          !Array.isArray(oldValue) &&
          typeof newValue === 'object' &&
          newValue !== null &&
          !Array.isArray(newValue)
        ) {
          changes.push(
            ...this.detectChanges(
              oldValue as Record<string, unknown>,
              newValue as Record<string, unknown>,
              fullKey
            )
          );
        } else {
          changes.push({
            key: fullKey,
            oldValue,
            newValue,
            timestamp: new Date(),
          });
        }
      }
    }

    return changes;
  }

  private notifyWatchers(changes: ConfigChange[]): void {
    for (const callback of this.watchCallbacks) {
      try {
        callback(changes);
      } catch (error) {
        console.error('Error in config watch callback:', error);
      }
    }
  }
}
