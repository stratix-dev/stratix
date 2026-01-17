import { ConfigurationProvider } from './ConfigurationProvider.js';
import { ConfigurationSource } from './ConfigurationSource.js';

export class ConfigurationManager implements ConfigurationProvider {
  private config: Record<string, unknown> = {};
  private loaded = false;

  private sources: ConfigurationSource[];
  private cache: boolean;

  constructor({ sources, cache }: { sources: ConfigurationSource[]; cache?: boolean }) {
    this.sources = sources;
    this.cache = cache ?? false;
  }

  async load(): Promise<void> {
    if (this.loaded && this.cache) {
      return;
    }

    let mergedConfig: Record<string, unknown> = {};

    // Load sources in order (later sources override earlier ones)
    for (const source of this.sources) {
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
    let current: unknown = obj;

    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }

    return current;
  }

  private deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = { ...target };

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

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.prototype.toString.call(value) === '[object Object]'
    );
  }
}
