import { MetadataTypeMap } from './registry.js';

/**
 * The storage symbol with full type information.
 * This replaces the untyped STRATIX_METADATA symbol.
 */
export const METADATA_STORAGE = Symbol.for('stratix:metadata:storage');

/**
 * Represents a class that may have Stratix metadata attached.
 * The storage is a partial record of all possible metadata types.
 */
export interface MetadataContainer {
  [METADATA_STORAGE]?: Partial<{
    [K in keyof MetadataTypeMap]: MetadataTypeMap[K];
  }>;
}

/**
 * Type guard to check if an object is a valid metadata container.
 */
export function isMetadataContainer(target: unknown): target is MetadataContainer {
  return (
    typeof target === 'function' && (METADATA_STORAGE in target || !(METADATA_STORAGE in target))
  );
}
