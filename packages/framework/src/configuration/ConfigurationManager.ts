import { ConfigurationProvider, ConfigurationSource } from '@stratix/core';

export interface ConfigurationManagerOptions {
  sources: ConfigurationSource[];
  cache?: boolean;
}

export class ConfigurationManager implements ConfigurationProvider {
  private config: Record<string, unknown> = {};
  private loaded = false;
  private readonly options: Required<ConfigurationManagerOptions>;

  constructor(options: ConfigurationManagerOptions) {
    this.options = {
      sources: options.sources,
      cache: options.cache ?? true
    };
  }

  async load(): Promise<void> {
    if (this.loaded && this.options.cache) {
      return;
    }

    let mergedConfig: Record<string, unknown> = {};

    // Load sources in order (later sources override earlier ones)
    for (const source of this.options.sources) {
      try {
        const available = await source.isAvailable();
        if (!available) {
          console.warn(`[Config] Source '${source.name}' not available, skipping`);
          continue;
        }

        const sourceConfig = await source.load();
        mergedConfig = this.deepMerge(mergedConfig, sourceConfig);
      } catch (error) {
        console.error(`[Config] Failed to load source '${source.name}':`, error);
        throw error;
      }
    }

    this.config = mergedConfig;
    this.loaded = true;
  }

  get<T = unknown>(key: string, defaultValue?: T): T | undefined {
    const value = this.getNestedValue(this.config, key);
    return value !== undefined ? (value as T) : defaultValue;
  }

  has(key: string): boolean {
    return this.getNestedValue(this.config, key) !== undefined;
  }

  getAll(): Record<string, unknown> {
    return { ...this.config };
  }

  getSection<T = Record<string, unknown>>(section: string): T | undefined {
    return this.get<T>(section);
  }

  private getNestedValue(obj: Record<string, any>, path: string): unknown {
    const keys = path.split('.');
    let current: any = obj;

    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  private deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = { ...target };

    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const sourceValue = source[key];
        const targetValue = result[key];

        if (this.isPlainObject(sourceValue) && this.isPlainObject(targetValue)) {
          result[key] = this.deepMerge(targetValue, sourceValue);
        } else {
          result[key] = sourceValue;
        }
      }
    }

    return result;
  }

  private isPlainObject(value: unknown): value is Record<string, any> {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.prototype.toString.call(value) === '[object Object]'
    );
  }
}
