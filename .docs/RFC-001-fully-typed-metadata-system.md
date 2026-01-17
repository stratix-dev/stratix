# RFC-001: Fully-Typed Metadata System

**Status:** Draft
**Author:** Claude
**Created:** 2026-01-16
**Package:** @stratix/framework

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current System Analysis](#current-system-analysis)
3. [Problem Statement](#problem-statement)
4. [Proposed Solution](#proposed-solution)
5. [Detailed Design](#detailed-design)
6. [Migration Strategy](#migration-strategy)
7. [Implementation Phases](#implementation-phases)
8. [Alternatives Considered](#alternatives-considered)
9. [Appendix: Full Type Definitions](#appendix-full-type-definitions)

---

## Executive Summary

This RFC proposes a complete redesign of the metadata system in `@stratix/framework` to achieve full type safety. The current system relies heavily on `any` type assertions and lacks compile-time guarantees for metadata operations. The proposed solution introduces a **Type Map Pattern** with branded symbol keys, enabling:

- Full type inference for all metadata operations
- Compile-time validation of metadata structure
- IDE autocompletion for metadata keys
- Type-safe type guards for metadata checks
- Extensible architecture for custom metadata types

---

## Current System Analysis

### Architecture Overview

```
metadataKeys.ts    --> Symbol definitions (METADATA_KEYS)
       |
       v
types.ts           --> Interface definitions (AppMetadata, etc.)
       |
       v
MetadataWriter.ts  --> Set operations (setAppMetadata, etc.)
       |
       v
MetadataReader.ts  --> Get operations (getAppMetadata, etc.)
       |
       v
MetadataRegistry.ts --> Runtime aggregation
```

### Current Implementation

#### metadataKeys.ts
```typescript
export const STRATIX_METADATA = Symbol.for('stratix:metadata');

export const METADATA_KEYS = {
  APP: Symbol.for('stratix:app'),
  CONTEXT: Symbol.for('stratix:context'),
  COMMAND_HANDLER: Symbol.for('stratix:command_handler')
} as const;
```

#### types.ts
```typescript
export interface MetadataStorage {
  [METADATA_KEYS.APP]?: AppMetadata;
  [METADATA_KEYS.CONTEXT]?: ContextMetadata;
  [METADATA_KEYS.COMMAND_HANDLER]?: CommandHandlerMetadata;
}
```

#### MetadataReader.ts
```typescript
export class MetadataReader {
  static getAppMetadata(target: ClassConstructor): AppMetadata {
    return (target as any)[STRATIX_METADATA]?.[METADATA_KEYS.APP];
  }
  // ... more methods
}
```

#### MetadataWriter.ts
```typescript
export class MetadataWriter {
  static setAppMetadata(target: ClassConstructor, metadata: AppMetadata): void {
    if (!(target as any)[STRATIX_METADATA]) {
      (target as any)[STRATIX_METADATA] = {};
    }
    (target as any)[STRATIX_METADATA][METADATA_KEYS.APP] = metadata;
  }
  // ... more methods
}
```

---

## Problem Statement

### P1: Excessive Use of `any` Type Assertions

Every metadata operation requires casting to `any`:

```typescript
// Current: unsafe
return (target as any)[STRATIX_METADATA]?.[METADATA_KEYS.APP];
```

**Impact:** No compile-time type checking, runtime errors possible

### P2: No Type-Safe Key-Value Mapping

The relationship between metadata keys and their value types exists only implicitly:

```typescript
// What prevents this mistake?
(target as any)[STRATIX_METADATA][METADATA_KEYS.APP] = contextMetadata; // Wrong type!
```

**Impact:** Metadata corruption possible without compiler warnings

### P3: Code Duplication

Each metadata type requires:
1. Symbol key in `metadataKeys.ts`
2. Interface in `types.ts`
3. Entry in `MetadataStorage`
4. Getter method in `MetadataReader`
5. Setter method in `MetadataWriter`
6. Type guard method (optional)

**Impact:** High maintenance burden, easy to miss updates

### P4: No IDE Autocompletion

When calling metadata operations, there's no intellisense for valid keys:

```typescript
MetadataReader.getXXXMetadata(target); // Must know method names by heart
```

**Impact:** Poor developer experience, documentation dependency

### P5: Inadequate Type Guards

The `hasMetadata` method returns a simple boolean, not a type guard:

```typescript
static hasMetadata(target: ClassConstructor, key: symbol): boolean {
  return (target as any)[STRATIX_METADATA]?.[key] !== undefined;
}

// After checking, still need to cast
if (MetadataReader.hasMetadata(target, METADATA_KEYS.APP)) {
  const metadata = MetadataReader.getAppMetadata(target); // Might be undefined!
}
```

**Impact:** No narrowing after type checks

### P6: Closed Extension

Adding new metadata types requires modifying core files:

```typescript
// Can't do this externally
declare module '@stratix/framework' {
  interface MetadataStorage {
    [MY_CUSTOM_KEY]: MyMetadata; // Not supported
  }
}
```

**Impact:** Framework extensibility limited

---

## Proposed Solution

### Core Concepts

```
+------------------+     +-------------------+     +------------------+
|  MetadataKey<K>  |---->| MetadataTypeMap   |---->| MetadataValue<K> |
|  (Branded Symbol)|     | (Type Registry)   |     | (Inferred Type)  |
+------------------+     +-------------------+     +------------------+
         |                        |                        |
         v                        v                        v
+------------------+     +-------------------+     +------------------+
|  defineKey<K,V>  |     |  get<K>/set<K>    |     | Type Inference   |
|  (Key Factory)   |     |  (Single Methods) |     | (Compile-time)   |
+------------------+     +-------------------+     +------------------+
```

### Design Principles

1. **Single Source of Truth:** One registry maps all keys to types
2. **Generic Operations:** One `get<K>` and `set<K>` method pair
3. **Branded Keys:** Symbols carry type information via branding
4. **Declaration Merging:** External extension via module augmentation
5. **Type Guards:** Native TypeScript type narrowing support

---

## Detailed Design

### 1. Branded Metadata Keys

```typescript
// metadata/keys.ts

/**
 * A branded symbol that carries type information.
 * The phantom type K ensures type safety without runtime cost.
 */
export type MetadataKey<K extends string> = symbol & { readonly __metadataKey: K };

/**
 * Creates a type-safe metadata key with an associated value type.
 * The key string becomes both the Symbol description and the type discriminant.
 */
export function defineMetadataKey<K extends string>(key: K): MetadataKey<K> {
  return Symbol.for(`stratix:metadata:${key}`) as MetadataKey<K>;
}

// Built-in keys
export const MetadataKeys = {
  App: defineMetadataKey('app'),
  Context: defineMetadataKey('context'),
  CommandHandler: defineMetadataKey('command-handler'),
  QueryHandler: defineMetadataKey('query-handler'),
  EventHandler: defineMetadataKey('event-handler'),
  Injectable: defineMetadataKey('injectable'),
  Module: defineMetadataKey('module'),
} as const;
```

### 2. Type Registry (MetadataTypeMap)

```typescript
// metadata/registry.ts

import type { ClassConstructor, ConfigurationSource } from '@stratix/core';

/**
 * Central type registry mapping metadata key strings to their value types.
 * Use declaration merging to extend with custom metadata types.
 *
 * @example
 * // In your module
 * declare module '@stratix/framework' {
 *   interface MetadataTypeMap {
 *     'my-custom': MyCustomMetadata;
 *   }
 * }
 */
export interface MetadataTypeMap {
  'app': AppMetadata;
  'context': ContextMetadata;
  'command-handler': CommandHandlerMetadata;
  'query-handler': QueryHandlerMetadata;
  'event-handler': EventHandlerMetadata;
  'injectable': InjectableMetadata;
  'module': ModuleMetadata;
}

/**
 * Extracts the value type for a given metadata key.
 * This is the core inference mechanism.
 */
export type MetadataValue<K extends keyof MetadataTypeMap> = MetadataTypeMap[K];

/**
 * Type-level check that a key exists in the registry.
 */
export type IsValidMetadataKey<K extends string> = K extends keyof MetadataTypeMap ? true : false;

// Metadata type definitions
export interface AppMetadata {
  readonly name: string;
  readonly version: string;
  readonly configuration: AppConfigurationMetadata;
  readonly di: AppDIMetadata;
  readonly contexts: readonly ClassConstructor[];
}

export interface AppConfigurationMetadata {
  readonly sources: readonly (new (...args: unknown[]) => ConfigurationSource)[];
  readonly configFile: string;
  readonly envPrefix: string;
}

export interface AppDIMetadata {
  readonly injectionMode: 'CLASSIC' | 'PROXY';
  readonly strict: boolean;
}

export interface ContextMetadata {
  readonly contextClass: ClassConstructor;
  readonly commandHandlers: readonly ClassConstructor[];
  readonly queryHandlers: readonly ClassConstructor[];
  readonly eventHandlers: readonly ClassConstructor[];
  readonly providers: readonly ClassConstructor[];
}

export interface CommandHandlerMetadata {
  readonly handlerClass: ClassConstructor;
  readonly commandClass: ClassConstructor;
}

export interface QueryHandlerMetadata {
  readonly handlerClass: ClassConstructor;
  readonly queryClass: ClassConstructor;
}

export interface EventHandlerMetadata {
  readonly handlerClass: ClassConstructor;
  readonly eventClasses: readonly ClassConstructor[];
}

export interface InjectableMetadata {
  readonly scope: 'singleton' | 'transient' | 'scoped';
  readonly token?: string | symbol;
}

export interface ModuleMetadata {
  readonly imports: readonly ClassConstructor[];
  readonly exports: readonly ClassConstructor[];
  readonly providers: readonly ClassConstructor[];
}
```

### 3. Type-Safe Storage Symbol

```typescript
// metadata/storage.ts

/**
 * The storage symbol with full type information.
 * This replaces the untyped STRATIX_METADATA symbol.
 */
export const METADATA_STORAGE = Symbol.for('stratix:metadata:storage') as unique symbol;

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
    typeof target === 'function' &&
    (METADATA_STORAGE in target || !(METADATA_STORAGE in target))
  );
}
```

### 4. Unified Metadata Accessor

```typescript
// metadata/Metadata.ts

import type { ClassConstructor } from '@stratix/core';
import { METADATA_STORAGE, type MetadataContainer } from './storage.js';
import type { MetadataKey } from './keys.js';
import type { MetadataTypeMap, MetadataValue } from './registry.js';

/**
 * Type-safe metadata accessor providing full inference for get/set operations.
 *
 * @example
 * // Writing metadata
 * Metadata.set(MyClass, MetadataKeys.App, appMetadata);
 *
 * // Reading metadata (type is inferred as AppMetadata | undefined)
 * const metadata = Metadata.get(MyClass, MetadataKeys.App);
 *
 * // Type guard check
 * if (Metadata.has(MyClass, MetadataKeys.App)) {
 *   // metadata is narrowed to AppMetadata
 * }
 */
export class Metadata {
  /**
   * Retrieves metadata for the given key from a class constructor.
   *
   * @typeParam K - The metadata key type (inferred from key parameter)
   * @param target - The class constructor to read from
   * @param key - The metadata key (determines return type)
   * @returns The metadata value or undefined if not set
   */
  static get<K extends keyof MetadataTypeMap>(
    target: ClassConstructor,
    key: MetadataKey<K>
  ): MetadataValue<K> | undefined {
    const container = target as unknown as MetadataContainer;
    const storage = container[METADATA_STORAGE];
    if (!storage) return undefined;

    // Extract the key string from the symbol description
    const keyString = this.extractKeyString(key);
    return storage[keyString as K] as MetadataValue<K> | undefined;
  }

  /**
   * Sets metadata for the given key on a class constructor.
   *
   * @typeParam K - The metadata key type (inferred from key parameter)
   * @param target - The class constructor to write to
   * @param key - The metadata key (determines value type)
   * @param value - The metadata value (must match key's type)
   */
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
        configurable: true,
      });
    }

    const keyString = this.extractKeyString(key);
    container[METADATA_STORAGE]![keyString as K] = value;
  }

  /**
   * Type guard that checks if metadata exists for the given key.
   * After this check, TypeScript knows the metadata is defined.
   *
   * @typeParam K - The metadata key type
   * @param target - The class constructor to check
   * @param key - The metadata key to check
   * @returns True if metadata exists, with type narrowing
   */
  static has<K extends keyof MetadataTypeMap>(
    target: ClassConstructor,
    key: MetadataKey<K>
  ): target is ClassConstructor & {
    [METADATA_STORAGE]: { [P in K]: MetadataValue<K> }
  } {
    return this.get(target, key) !== undefined;
  }

  /**
   * Retrieves metadata with a guarantee that it exists.
   * Throws if metadata is not found.
   *
   * @typeParam K - The metadata key type
   * @param target - The class constructor to read from
   * @param key - The metadata key
   * @throws {MetadataNotFoundError} If metadata doesn't exist
   * @returns The metadata value (never undefined)
   */
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

  /**
   * Removes metadata for the given key.
   *
   * @typeParam K - The metadata key type
   * @param target - The class constructor
   * @param key - The metadata key to remove
   * @returns True if metadata was removed, false if it didn't exist
   */
  static delete<K extends keyof MetadataTypeMap>(
    target: ClassConstructor,
    key: MetadataKey<K>
  ): boolean {
    const container = target as unknown as MetadataContainer;
    const storage = container[METADATA_STORAGE];
    if (!storage) return false;

    const keyString = this.extractKeyString(key);
    if (keyString in storage) {
      delete storage[keyString as K];
      return true;
    }
    return false;
  }

  /**
   * Returns all metadata keys that have values on the target.
   *
   * @param target - The class constructor to inspect
   * @returns Array of metadata key strings that are defined
   */
  static keys(target: ClassConstructor): (keyof MetadataTypeMap)[] {
    const container = target as unknown as MetadataContainer;
    const storage = container[METADATA_STORAGE];
    if (!storage) return [];
    return Object.keys(storage) as (keyof MetadataTypeMap)[];
  }

  /**
   * Merges new values into existing metadata (partial update).
   *
   * @typeParam K - The metadata key type
   * @param target - The class constructor
   * @param key - The metadata key
   * @param partial - Partial metadata to merge
   */
  static merge<K extends keyof MetadataTypeMap>(
    target: ClassConstructor,
    key: MetadataKey<K>,
    partial: Partial<MetadataValue<K>>
  ): void {
    const existing = this.get(target, key);
    const merged = existing
      ? { ...existing, ...partial } as MetadataValue<K>
      : partial as MetadataValue<K>;
    this.set(target, key, merged);
  }

  /**
   * Extracts the key string from a branded symbol.
   */
  private static extractKeyString<K extends string>(key: MetadataKey<K>): K {
    const description = key.description;
    if (!description?.startsWith('stratix:metadata:')) {
      throw new Error(`Invalid metadata key: ${String(key)}`);
    }
    return description.replace('stratix:metadata:', '') as K;
  }
}

/**
 * Error thrown when required metadata is not found.
 */
export class MetadataNotFoundError extends Error {
  constructor(className: string, keyName: string) {
    super(`Metadata '${keyName}' not found on class '${className}'`);
    this.name = 'MetadataNotFoundError';
  }
}
```

### 5. Type-Safe Decorators

```typescript
// decorators/StratixApp.ts

import { ClassConstructor, ConfigurationSource } from '@stratix/core';
import { Metadata, MetadataKeys, type AppMetadata } from '../metadata/index.js';
import { DecoratorKindError } from '../errors/DecoratorKindError.js';
import { APP_DEFAULTS } from '../defaults/AppDefaults.js';

export interface StratixAppOptions {
  name?: string;
  version?: string;
  contexts?: ClassConstructor[];
  configuration?: {
    sources?: (new (...args: unknown[]) => ConfigurationSource)[];
    configFile?: string;
    envPrefix?: string;
  };
  di?: {
    injectionMode?: 'CLASSIC' | 'PROXY';
    strict?: boolean;
  };
}

export function StratixApp(options: StratixAppOptions = {}) {
  return function <T extends new (...args: unknown[]) => unknown>(
    target: T,
    context: ClassDecoratorContext
  ): T {
    if (context.kind !== 'class') {
      throw new DecoratorKindError('StratixApp', 'class', context.kind);
    }

    // Full type safety: TypeScript knows we're setting AppMetadata
    const metadata: AppMetadata = {
      name: options.name ?? APP_DEFAULTS.name,
      version: options.version ?? APP_DEFAULTS.version,
      configuration: {
        sources: options.configuration?.sources ?? APP_DEFAULTS.configuration.sources,
        configFile: options.configuration?.configFile ?? APP_DEFAULTS.configuration.configFile,
        envPrefix: options.configuration?.envPrefix ?? APP_DEFAULTS.configuration.envPrefix,
      },
      contexts: options.contexts ?? APP_DEFAULTS.contexts,
      di: {
        injectionMode: options.di?.injectionMode ?? APP_DEFAULTS.di.injectionMode,
        strict: options.di?.strict ?? APP_DEFAULTS.di.strict,
      },
    };

    // Type-safe set: compiler ensures metadata matches AppMetadata
    Metadata.set(target, MetadataKeys.App, metadata);

    return target;
  };
}


// decorators/CommandHandler.ts

import { Command, CommandHandler as ICommandHandler } from '@stratix/core';
import { Metadata, MetadataKeys, type CommandHandlerMetadata } from '../metadata/index.js';
import { DecoratorKindError } from '../errors/DecoratorKindError.js';

export interface CommandHandlerOptions<TCommand extends Command = Command> {
  command: new (...args: unknown[]) => TCommand;
}

export function CommandHandler<TCommand extends Command, TResult = void>(
  options: CommandHandlerOptions<TCommand>
) {
  return function <T extends new (...args: unknown[]) => ICommandHandler<TCommand, TResult>>(
    target: T,
    context: ClassDecoratorContext
  ): T {
    if (context.kind !== 'class') {
      throw new DecoratorKindError('CommandHandler', 'class', context.kind);
    }

    // Type-safe metadata construction
    const metadata: CommandHandlerMetadata = {
      handlerClass: target,
      commandClass: options.command,
    };

    // Compiler ensures type correctness
    Metadata.set(target, MetadataKeys.CommandHandler, metadata);

    return target;
  };
}
```

### 6. Type-Safe Registry

```typescript
// runtime/MetadataRegistry.ts

import { ClassConstructor } from '@stratix/core';
import { Metadata, MetadataKeys } from '../metadata/index.js';
import { DecoratorMissingError } from '../errors/DecoratorMissingError.js';
import { InvalidMetadataError } from '../errors/InvalidMetadataError.js';

export class MetadataRegistry {
  public readonly appClass: ClassConstructor;
  public readonly commandToHandler = new Map<ClassConstructor, ClassConstructor>();
  public readonly handlerToCommand = new Map<ClassConstructor, ClassConstructor>();

  constructor({ appClass }: { appClass: ClassConstructor }) {
    this.appClass = appClass;
    this.initialize();
  }

  private initialize(): void {
    // Type-safe check with proper narrowing
    if (!Metadata.has(this.appClass, MetadataKeys.App)) {
      throw new DecoratorMissingError('@StratixApp', this.appClass.name);
    }

    // After the check, TypeScript knows this is defined
    const appMetadata = Metadata.getOrThrow(this.appClass, MetadataKeys.App);

    for (const contextClass of appMetadata.contexts) {
      this.processContext(contextClass);
    }
  }

  private processContext(contextClass: ClassConstructor): void {
    // Type-safe retrieval with error handling
    const contextMetadata = Metadata.get(contextClass, MetadataKeys.Context);

    if (!contextMetadata) {
      throw new DecoratorMissingError('@Context', contextClass.name);
    }

    for (const handlerClass of contextMetadata.commandHandlers) {
      this.processCommandHandler(handlerClass);
    }
  }

  private processCommandHandler(handlerClass: ClassConstructor): void {
    const handlerMetadata = Metadata.get(handlerClass, MetadataKeys.CommandHandler);

    if (!handlerMetadata) {
      throw new DecoratorMissingError('@CommandHandler', handlerClass.name);
    }

    // Type safety: commandClass and handlerClass are guaranteed to exist
    // because CommandHandlerMetadata requires them
    this.commandToHandler.set(handlerMetadata.commandClass, handlerMetadata.handlerClass);
    this.handlerToCommand.set(handlerMetadata.handlerClass, handlerMetadata.commandClass);
  }
}
```

### 7. Extension Support

```typescript
// Example: Adding custom metadata in user code

// my-plugin/types.ts
export interface CacheMetadata {
  readonly ttl: number;
  readonly strategy: 'lru' | 'fifo' | 'lfu';
  readonly maxSize: number;
}

// my-plugin/augmentation.ts
import { defineMetadataKey, type MetadataTypeMap } from '@stratix/framework';
import type { CacheMetadata } from './types.js';

// Extend the type map via declaration merging
declare module '@stratix/framework' {
  interface MetadataTypeMap {
    'cache': CacheMetadata;
  }
}

// Create the typed key
export const CacheKey = defineMetadataKey('cache');

// my-plugin/decorator.ts
import { Metadata } from '@stratix/framework';
import { CacheKey, type CacheMetadata } from './augmentation.js';

export interface CacheOptions {
  ttl?: number;
  strategy?: 'lru' | 'fifo' | 'lfu';
  maxSize?: number;
}

export function Cached(options: CacheOptions = {}) {
  return function <T extends new (...args: unknown[]) => unknown>(
    target: T,
    context: ClassDecoratorContext
  ): T {
    const metadata: CacheMetadata = {
      ttl: options.ttl ?? 300,
      strategy: options.strategy ?? 'lru',
      maxSize: options.maxSize ?? 1000,
    };

    // Full type safety for custom metadata!
    Metadata.set(target, CacheKey, metadata);

    return target;
  };
}

// Usage
@Cached({ ttl: 60, strategy: 'lfu' })
class MyService {}

// Reading custom metadata
const cacheConfig = Metadata.get(MyService, CacheKey);
// Type is CacheMetadata | undefined
```

---

## Migration Strategy

### Phase 1: Parallel Implementation (Non-Breaking)

1. Create new `metadata/v2/` directory with the new implementation
2. Export both old and new APIs
3. Add deprecation warnings to old API

```typescript
// metadata/index.ts
export * from './MetadataReader.js';  // @deprecated
export * from './MetadataWriter.js';  // @deprecated

// New API
export * from './v2/Metadata.js';
export * from './v2/keys.js';
export * from './v2/registry.js';
```

### Phase 2: Internal Migration

1. Update all decorators to use new API
2. Update MetadataRegistry to use new API
3. Update StratixApplication to use new API
4. Ensure all tests pass

### Phase 3: Documentation and Examples

1. Update CLAUDE.md with new patterns
2. Create migration guide
3. Update playground examples

### Phase 4: Deprecation (Next Major Version)

1. Mark old API as deprecated in v2.1
2. Remove old API in v3.0
3. Keep re-exports with deprecation warnings for one version

---

## Implementation Phases

### Phase 1: Core Types (2-3 files)
- [ ] `metadata/v2/keys.ts` - Branded key types and factory
- [ ] `metadata/v2/registry.ts` - Type map and metadata interfaces
- [ ] `metadata/v2/storage.ts` - Storage symbol and container types

### Phase 2: Metadata Accessor (1 file)
- [ ] `metadata/v2/Metadata.ts` - Unified accessor class

### Phase 3: Decorator Updates (3+ files)
- [ ] Update `StratixApp.ts`
- [ ] Update `Context.ts`
- [ ] Update `CommandHandler.ts`

### Phase 4: Runtime Updates (2 files)
- [ ] Update `MetadataRegistry.ts`
- [ ] Update `StratixApplication.ts`

### Phase 5: Tests
- [ ] Unit tests for Metadata class
- [ ] Integration tests for decorators
- [ ] Type tests (tsd or expect-type)

---

## Alternatives Considered

### Alternative 1: Reflect Metadata

**Approach:** Use `reflect-metadata` polyfill with `Reflect.defineMetadata`

**Pros:**
- Standard API
- Works with experimental decorators

**Cons:**
- Requires polyfill dependency
- Native TS 5.x decorators don't support `emitDecoratorMetadata`
- Less type-safe without additional wrapper

**Decision:** Rejected. Framework uses native TS 5.x decorators.

### Alternative 2: WeakMap-Based Storage

**Approach:** Use `WeakMap<ClassConstructor, MetadataStorage>`

**Pros:**
- Clean separation from class object
- Automatic garbage collection

**Cons:**
- Harder to inspect/debug
- Requires exporting the WeakMap or accessor
- Same typing challenges

**Decision:** Rejected. Symbol properties are simpler and inspectable.

### Alternative 3: Decorator Metadata Proposal (Stage 3)

**Approach:** Use the upcoming decorator metadata proposal

**Pros:**
- Future standard
- Native support coming

**Cons:**
- Not yet available in stable TypeScript
- Implementation may change
- Would require Node.js upgrade

**Decision:** Consider for v3.0 when stable.

### Alternative 4: String Keys Instead of Symbols

**Approach:** Use string keys: `target['stratix:app']`

**Pros:**
- Easier typing
- No Symbol complexity

**Cons:**
- Collision risk with user properties
- Less semantic meaning
- No Symbol.for() benefit for serialization

**Decision:** Rejected. Symbols provide better encapsulation.

---

## Appendix: Full Type Definitions

### Complete Type Inference Flow

```typescript
// 1. Key Definition (compile-time)
type MetadataKey<K extends string> = symbol & { readonly __metadataKey: K };

// 2. Type Map (compile-time)
interface MetadataTypeMap {
  'app': AppMetadata;
  'context': ContextMetadata;
}

// 3. Value Inference (compile-time)
type MetadataValue<K extends keyof MetadataTypeMap> = MetadataTypeMap[K];

// 4. Method Signature (compile-time)
static get<K extends keyof MetadataTypeMap>(
  target: ClassConstructor,
  key: MetadataKey<K>
): MetadataValue<K> | undefined;

// 5. Usage (full inference)
const key = defineMetadataKey('app'); // MetadataKey<'app'>
const value = Metadata.get(MyClass, key); // AppMetadata | undefined
```

### Type Safety Examples

```typescript
// Correct usage - compiles
Metadata.set(MyClass, MetadataKeys.App, {
  name: 'my-app',
  version: '1.0.0',
  configuration: { sources: [], configFile: '', envPrefix: '' },
  di: { injectionMode: 'PROXY', strict: true },
  contexts: [],
});

// Incorrect usage - compile error
Metadata.set(MyClass, MetadataKeys.App, {
  // Error: missing 'name' property
  version: '1.0.0',
});

// Incorrect usage - compile error
Metadata.set(MyClass, MetadataKeys.App, {
  name: 'my-app',
  // Error: Type 'string' is not assignable to type 'readonly ClassConstructor[]'
  contexts: 'invalid',
});

// Incorrect usage - compile error
Metadata.set(
  MyClass,
  MetadataKeys.App,
  { contextClass: MyClass, commandHandlers: [] } // Error: Type doesn't match AppMetadata
);
```

### Conditional Type Utilities

```typescript
/**
 * Utility type to check if a class has specific metadata.
 */
type HasMetadata<T, K extends keyof MetadataTypeMap> =
  T extends { [METADATA_STORAGE]: { [P in K]: MetadataValue<K> } }
    ? true
    : false;

/**
 * Utility type to extract metadata type from a decorated class.
 */
type ExtractMetadata<T, K extends keyof MetadataTypeMap> =
  T extends { [METADATA_STORAGE]: { [P in K]: infer V } }
    ? V
    : never;

/**
 * Utility type for classes that must have certain metadata.
 */
type RequiresMetadata<K extends keyof MetadataTypeMap> =
  ClassConstructor & { [METADATA_STORAGE]: { [P in K]: MetadataValue<K> } };

// Usage
function processApp(appClass: RequiresMetadata<'app'>): void {
  // TypeScript knows appClass has app metadata
  const metadata = Metadata.getOrThrow(appClass, MetadataKeys.App);
}
```

---

## Summary

The proposed fully-typed metadata system addresses all identified problems:

| Problem | Current | Proposed |
|---------|---------|----------|
| P1: `any` assertions | Everywhere | Eliminated |
| P2: Key-value typing | Implicit | Explicit via MetadataTypeMap |
| P3: Code duplication | 5 files per type | 1 line per type |
| P4: No autocompletion | Manual | Full IDE support |
| P5: Type guards | Boolean only | Native narrowing |
| P6: Extensibility | Closed | Declaration merging |

The implementation is backward-compatible, can be rolled out incrementally, and sets up the framework for future TypeScript features.

---

**Next Steps:**
1. Review and approve RFC
2. Create implementation branch
3. Implement Phase 1 (Core Types)
4. Proceed through remaining phases
5. Update documentation
6. Release in v2.1.0-beta
