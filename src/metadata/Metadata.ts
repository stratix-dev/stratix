import { METADATA_STORAGE, type MetadataContainer } from './storage.js';
import type { MetadataKey } from './keys.js';
import type { MetadataTypeMap, MetadataValue } from './registry.js';
import { MetadataNotFoundError } from '../shared/errors/MetadataNotFoundError.js';

type ClassConstructor = new (...args: any[]) => any;

export class Metadata {
  static get<K extends keyof MetadataTypeMap>(
    target: ClassConstructor,
    key: MetadataKey<K>
  ): MetadataValue<K> | undefined {
    const container = target as unknown as MetadataContainer;
    const storage = container[METADATA_STORAGE];
    if (!storage) return undefined;

    // Extract the key string from the symbol description
    const keyString = this.extractKeyString(key);
    return storage[keyString] as MetadataValue<K> | undefined;
  }

  static set<K extends keyof MetadataTypeMap>(
    target: ClassConstructor,
    key: MetadataKey<K>,
    value: MetadataValue<K>
  ): void {
    const container = target as unknown as MetadataContainer;

    if (!container[METADATA_STORAGE]) {
      Object.defineProperty(container, METADATA_STORAGE, {
        value: {},
        writable: true,
        enumerable: false,
        configurable: true
      });
    }

    const keyString = this.extractKeyString(key);
    container[METADATA_STORAGE]![keyString] = value;
  }

  static has<K extends keyof MetadataTypeMap>(
    target: ClassConstructor,
    key: MetadataKey<K>
  ): target is ClassConstructor & {
    [METADATA_STORAGE]: { [P in K]: MetadataValue<K> };
  } {
    return this.get(target, key) !== undefined;
  }

  static getOrThrow<K extends keyof MetadataTypeMap>(
    target: ClassConstructor,
    key: MetadataKey<K>
  ): MetadataValue<K> {
    const value = this.get(target, key);
    if (value === undefined) {
      throw new MetadataNotFoundError(target.name, this.extractKeyString(key));
    }
    return value;
  }

  static delete<K extends keyof MetadataTypeMap>(
    target: ClassConstructor,
    key: MetadataKey<K>
  ): boolean {
    const container = target as unknown as MetadataContainer;
    const storage = container[METADATA_STORAGE];
    if (!storage) return false;

    const keyString = this.extractKeyString(key);
    if (keyString in storage) {
      delete storage[keyString];
      return true;
    }
    return false;
  }

  static keys(target: ClassConstructor): (keyof MetadataTypeMap)[] {
    const container = target as unknown as MetadataContainer;
    const storage = container[METADATA_STORAGE];
    if (!storage) return [];
    return Object.keys(storage) as (keyof MetadataTypeMap)[];
  }

  static merge<K extends keyof MetadataTypeMap>(
    target: ClassConstructor,
    key: MetadataKey<K>,
    partial: Partial<MetadataValue<K>>
  ): void {
    const existing = this.get(target, key);
    const merged = existing
      ? ({ ...existing, ...partial } as MetadataValue<K>)
      : (partial as MetadataValue<K>);
    this.set(target, key, merged);
  }

  private static extractKeyString<K extends string>(key: MetadataKey<K>): K {
    const description = key.description;
    if (!description?.startsWith('stratix:metadata:')) {
      throw new Error(`Invalid metadata key: ${String(key)}`);
    }
    return description.replace('stratix:metadata:', '') as K;
  }
}
