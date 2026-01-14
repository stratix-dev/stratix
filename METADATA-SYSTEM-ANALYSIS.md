# Metadata System Analysis and Improvement Opportunities

## Executive Summary

The current metadata system works functionally but has several architectural limitations affecting type safety, extensibility, performance, and maintainability. This analysis identifies 12 critical areas for improvement.

## Current Architecture

### Storage Mechanism
```typescript
// Symbol-based root property on class constructors
const STRATIX_METADATA = Symbol.for('stratix:metadata');
(target as any)[STRATIX_METADATA] = {
  'stratix:app': { /* AppMetadata */ },
  'stratix:context': { /* ContextMetadata */ },
  'stratix:command_handler': { /* CommandHandlerMetadata */ }
};
```

### Component Interaction Flow

```
Decorator (@StratixApp, @Context, etc.)
    → MetadataWriter.setXMetadata()
    → Store on class constructor via Symbol property

Bootstrap/Runtime
    → MetadataReader.getXMetadata()
    → MetadataRegistry builds indexes
    → StratixApplication uses registry
```

## Critical Issues

### 1. Inconsistent Symbol Usage

**Problem:** Mixed use of Symbols and string literals defeats Symbol benefits.

```typescript
// Current implementation
export const STRATIX_METADATA = Symbol.for('stratix:metadata');
export const METADATA_KEYS = {
  APP: 'stratix:app',              // String literal!
  CONTEXT: 'stratix:context',      // String literal!
  COMMAND_HANDLER: 'stratix:command_handler'  // String literal!
};
```

**Why it matters:**
- Symbols are meant to be unique and collision-resistant
- Using strings as keys undermines this benefit
- No type safety at the key level
- Potential conflicts with other metadata systems

**Solution:**
```typescript
export const STRATIX_METADATA = Symbol.for('stratix:metadata');
export const METADATA_KEYS = {
  APP: Symbol.for('stratix:app'),
  CONTEXT: Symbol.for('stratix:context'),
  COMMAND_HANDLER: Symbol.for('stratix:command_handler')
} as const;

// Or use unique Symbols (not global registry)
const APP_KEY = Symbol('stratix:app');
```

**Impact:** Low risk, high benefit. Simple find-replace change.

---

### 2. Type Safety Violations

**Problem:** Heavy use of `any` casts bypasses TypeScript's type system.

```typescript
// Current implementation - no type safety
return (target as any)[STRATIX_METADATA]?.[METADATA_KEYS.APP];
```

**Why it matters:**
- Runtime type mismatches won't be caught
- Malformed metadata silently accepted
- IDE autocomplete doesn't work
- Refactoring is dangerous

**Solution A - Proper typing:**
```typescript
interface MetadataContainer {
  [STRATIX_METADATA]?: {
    [key: symbol]: unknown;
  };
}

export class MetadataReader {
  static getAppMetadata(target: ClassConstructor): AppMetadata | undefined {
    const container = target as unknown as MetadataContainer;
    const metadata = container[STRATIX_METADATA]?.[METADATA_KEYS.APP];

    // Runtime validation
    if (metadata && !isAppMetadata(metadata)) {
      throw new InvalidMetadataError('App', 'Metadata structure is invalid');
    }

    return metadata as AppMetadata | undefined;
  }
}

// Type guard
function isAppMetadata(value: unknown): value is AppMetadata {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'version' in value
  );
}
```

**Solution B - Zod schema validation:**
```typescript
import { z } from 'zod';

const AppMetadataSchema = z.object({
  name: z.string(),
  version: z.string(),
  configuration: z.object({
    sources: z.array(z.any()).optional(),
    configFile: z.string().optional(),
    envPrefix: z.string().optional()
  }).optional(),
  contexts: z.array(z.any()).optional()
});

export class MetadataReader {
  static getAppMetadata(target: ClassConstructor): AppMetadata | undefined {
    const raw = (target as any)[STRATIX_METADATA]?.[METADATA_KEYS.APP];
    if (!raw) return undefined;

    const result = AppMetadataSchema.safeParse(raw);
    if (!result.success) {
      throw new InvalidMetadataError('App', result.error.message);
    }

    return result.data;
  }
}
```

**Impact:** Medium risk, high benefit. Catches bugs early.

---

### 3. Code Duplication in MetadataWriter

**Problem:** Repeated initialization logic in every setter method.

```typescript
// Repeated 3 times
if (!(target as any)[STRATIX_METADATA]) {
  (target as any)[STRATIX_METADATA] = {};
}
(target as any)[STRATIX_METADATA][METADATA_KEYS.APP] = metadata;
```

**Solution:**
```typescript
export class MetadataWriter {
  private static ensureMetadataContainer(target: ClassConstructor): void {
    if (!(target as any)[STRATIX_METADATA]) {
      (target as any)[STRATIX_METADATA] = {};
    }
  }

  private static setMetadata<T>(
    target: ClassConstructor,
    key: symbol,
    metadata: T
  ): void {
    this.ensureMetadataContainer(target);
    (target as any)[STRATIX_METADATA][key] = metadata;
  }

  static setAppMetadata(target: ClassConstructor, metadata: AppMetadata): void {
    this.setMetadata(target, METADATA_KEYS.APP, metadata);
  }

  static setContextMetadata(target: ClassConstructor, metadata: ContextMetadata): void {
    this.setMetadata(target, METADATA_KEYS.CONTEXT, metadata);
  }

  static setCommandHandlerMetadata(
    target: ClassConstructor,
    metadata: CommandHandlerMetadata
  ): void {
    this.setMetadata(target, METADATA_KEYS.COMMAND_HANDLER, metadata);
  }
}
```

**Impact:** Low risk, medium benefit. Cleaner code, easier to maintain.

---

### 4. Limited Extensibility

**Problem:** Hard-coded metadata types prevent adding new decorators without modifying core classes.

**Current flow to add a new decorator type:**
1. Add key to `METADATA_KEYS`
2. Create interface in `types.ts`
3. Add `setXMetadata` to MetadataWriter
4. Add `getXMetadata` to MetadataReader
5. Update MetadataRegistry if needed

**Solution - Generic Metadata System:**
```typescript
// Define a metadata registry that's extensible
export class MetadataStore {
  private static readonly store = new WeakMap<ClassConstructor, Map<symbol, unknown>>();

  static set<T>(target: ClassConstructor, key: symbol, value: T): void {
    if (!this.store.has(target)) {
      this.store.set(target, new Map());
    }
    this.store.get(target)!.set(key, value);
  }

  static get<T>(target: ClassConstructor, key: symbol): T | undefined {
    return this.store.get(target)?.get(key) as T | undefined;
  }

  static has(target: ClassConstructor, key: symbol): boolean {
    return this.store.get(target)?.has(key) ?? false;
  }

  static getAllKeys(target: ClassConstructor): symbol[] {
    return Array.from(this.store.get(target)?.keys() ?? []);
  }

  static getAllClasses(): ClassConstructor[] {
    // WeakMap doesn't allow iteration, need alternative approach
    // Option: maintain a secondary Set of classes
    throw new Error('Not implemented - requires registry pattern');
  }
}

// Now decorators just use the generic API
export function StratixApp(options: StratixAppOptions = {}) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext
  ) {
    if (context.kind !== 'class') {
      throw new DecoratorKindError('StratixApp', 'class', context.kind);
    }

    MetadataStore.set(target, METADATA_KEYS.APP, {
      name: options?.name || 'Stratix Application',
      version: options?.version || '1.0.0',
      configuration: options?.configuration || {},
      contexts: options?.contexts || []
    });

    return target;
  };
}
```

**Alternative - Plugin-based metadata:**
```typescript
interface MetadataPlugin<T> {
  key: symbol;
  validator?: (value: unknown) => value is T;
  reader: (target: ClassConstructor) => T | undefined;
  writer: (target: ClassConstructor, value: T) => void;
}

export class MetadataRegistry {
  private static plugins = new Map<symbol, MetadataPlugin<any>>();

  static registerPlugin<T>(plugin: MetadataPlugin<T>): void {
    this.plugins.set(plugin.key, plugin);
  }

  static read<T>(target: ClassConstructor, key: symbol): T | undefined {
    const plugin = this.plugins.get(key);
    return plugin?.reader(target);
  }

  static write<T>(target: ClassConstructor, key: symbol, value: T): void {
    const plugin = this.plugins.get(key);
    plugin?.writer(target, value);
  }
}
```

**Impact:** High risk, high benefit. Major refactoring but enables future extensibility.

---

### 5. Missing Metadata Inheritance

**Problem:** If a class extends another decorated class, metadata is not inherited.

```typescript
@Context({ commandHandlers: [BaseHandler] })
class BaseContext {}

@Context({ commandHandlers: [DerivedHandler] })
class DerivedContext extends BaseContext {}
// DerivedContext loses BaseHandler!
```

**Solution:**
```typescript
export class MetadataReader {
  static getContextMetadata(
    target: ClassConstructor,
    includeInherited: boolean = false
  ): ContextMetadata | undefined {
    const metadata = (target as any)[STRATIX_METADATA]?.[METADATA_KEYS.CONTEXT];

    if (!includeInherited) {
      return metadata;
    }

    // Walk prototype chain
    const inherited = this.getInheritedMetadata<ContextMetadata>(
      target,
      METADATA_KEYS.CONTEXT
    );

    if (!metadata && !inherited.length) {
      return undefined;
    }

    // Merge metadata (strategy depends on field)
    return this.mergeContextMetadata([...inherited, metadata].filter(Boolean));
  }

  private static getInheritedMetadata<T>(
    target: ClassConstructor,
    key: symbol
  ): T[] {
    const result: T[] = [];
    let proto = Object.getPrototypeOf(target);

    while (proto && proto !== Function.prototype) {
      const metadata = (proto as any)[STRATIX_METADATA]?.[key];
      if (metadata) {
        result.unshift(metadata); // Add to front (base first)
      }
      proto = Object.getPrototypeOf(proto);
    }

    return result;
  }

  private static mergeContextMetadata(
    metadatas: ContextMetadata[]
  ): ContextMetadata {
    return {
      contextClass: metadatas[metadatas.length - 1].contextClass,
      commandHandlers: metadatas.flatMap(m => m.commandHandlers || [])
    };
  }
}
```

**Impact:** Medium risk, high benefit. Enables class hierarchies.

---

### 6. No Metadata Caching

**Problem:** MetadataReader calls repeatedly access the same metadata without caching.

```typescript
// MetadataRegistry constructor
const appMetadata = MetadataReader.getAppMetadata(appClass); // Read 1
// ...
for (const contextClass of appMetadata.contexts || []) {
  const contextMetadata = MetadataReader.getContextMetadata(contextClass); // Read 2, 3, 4...
  // ...
  for (const handlerClass of contextMetadata.commandHandlers || []) {
    const handlerMetadata = MetadataReader.getCommandHandlerMetadata(handlerClass); // Read 5, 6, 7...
  }
}
```

**Solution:**
```typescript
export class MetadataCache {
  private static cache = new WeakMap<ClassConstructor, Map<symbol, unknown>>();

  static get<T>(
    target: ClassConstructor,
    key: symbol,
    factory: () => T | undefined
  ): T | undefined {
    if (!this.cache.has(target)) {
      this.cache.set(target, new Map());
    }

    const classCache = this.cache.get(target)!;

    if (classCache.has(key)) {
      return classCache.get(key) as T;
    }

    const value = factory();
    classCache.set(key, value);
    return value;
  }

  static invalidate(target: ClassConstructor, key?: symbol): void {
    if (key) {
      this.cache.get(target)?.delete(key);
    } else {
      this.cache.delete(target);
    }
  }
}

export class MetadataReader {
  static getAppMetadata(target: ClassConstructor): AppMetadata | undefined {
    return MetadataCache.get(target, METADATA_KEYS.APP, () => {
      return (target as any)[STRATIX_METADATA]?.[METADATA_KEYS.APP];
    });
  }
}
```

**Impact:** Low risk, medium benefit. Performance improvement for large apps.

---

### 7. MetadataRegistry Does Too Much

**Problem:** Single class handles validation, indexing, and storage. Violates Single Responsibility Principle.

**Current responsibilities:**
- Validate decorator presence
- Validate metadata structure
- Build command-to-handler index
- Build handler-to-command index
- Store application reference

**Solution - Separation of Concerns:**
```typescript
// 1. Validator
export class MetadataValidator {
  static validateApp(appClass: ClassConstructor): void {
    if (!MetadataReader.isStratixApp(appClass)) {
      throw new DecoratorMissingError('@StratixApp', appClass.name);
    }
  }

  static validateContext(contextClass: ClassConstructor): void {
    if (!MetadataReader.isContext(contextClass)) {
      throw new DecoratorMissingError('@Context', contextClass.name);
    }
  }

  static validateCommandHandler(handlerClass: ClassConstructor): void {
    const metadata = MetadataReader.getCommandHandlerMetadata(handlerClass);
    if (!metadata) {
      throw new DecoratorMissingError('@CommandHandler', handlerClass.name);
    }
    if (!metadata.commandClass || !metadata.handlerClass) {
      throw new InvalidMetadataError(
        'CommandHandler',
        `Missing commandClass or handlerClass in ${handlerClass.name}`
      );
    }
  }
}

// 2. Index Builder
export class CommandHandlerIndex {
  private commandToHandler = new Map<ClassConstructor, ClassConstructor>();
  private handlerToCommand = new Map<ClassConstructor, ClassConstructor>();

  register(commandClass: ClassConstructor, handlerClass: ClassConstructor): void {
    if (this.commandToHandler.has(commandClass)) {
      throw new Error(
        `Duplicate handler for command ${commandClass.name}: ` +
        `${this.commandToHandler.get(commandClass)!.name} and ${handlerClass.name}`
      );
    }
    this.commandToHandler.set(commandClass, handlerClass);
    this.handlerToCommand.set(handlerClass, commandClass);
  }

  getHandlerForCommand(commandClass: ClassConstructor): ClassConstructor | undefined {
    return this.commandToHandler.get(commandClass);
  }

  getCommandForHandler(handlerClass: ClassConstructor): ClassConstructor | undefined {
    return this.handlerToCommand.get(handlerClass);
  }

  getAllPairs(): [ClassConstructor, ClassConstructor][] {
    return Array.from(this.commandToHandler.entries());
  }
}

// 3. Simplified Registry (orchestrator only)
export class MetadataRegistry {
  public readonly appClass: ClassConstructor;
  public readonly commandHandlers: CommandHandlerIndex;

  constructor(appClass: ClassConstructor) {
    this.appClass = appClass;
    this.commandHandlers = new CommandHandlerIndex();

    this.buildIndex();
  }

  private buildIndex(): void {
    MetadataValidator.validateApp(this.appClass);

    const appMetadata = MetadataReader.getAppMetadata(this.appClass)!;

    for (const contextClass of appMetadata.contexts || []) {
      MetadataValidator.validateContext(contextClass);

      const contextMetadata = MetadataReader.getContextMetadata(contextClass)!;

      for (const handlerClass of contextMetadata.commandHandlers || []) {
        MetadataValidator.validateCommandHandler(handlerClass);

        const handlerMetadata = MetadataReader.getCommandHandlerMetadata(handlerClass)!;
        this.commandHandlers.register(
          handlerMetadata.commandClass,
          handlerMetadata.handlerClass
        );
      }
    }
  }
}
```

**Impact:** Medium risk, high benefit. Better maintainability and testability.

---

### 8. Missing Tests

**Problem:** Zero test coverage for the metadata system.

**Critical test scenarios:**
1. Metadata storage and retrieval
2. Decorator application
3. Metadata inheritance
4. Invalid metadata handling
5. Type validation
6. Registry building
7. Duplicate handler detection
8. Missing decorator errors

**Solution - Comprehensive test suite:**
```typescript
// MetadataWriter.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { MetadataWriter } from '../MetadataWriter';
import { METADATA_KEYS, STRATIX_METADATA } from '../metadataKeys';

describe('MetadataWriter', () => {
  class TestClass {}

  beforeEach(() => {
    // Clean metadata
    delete (TestClass as any)[STRATIX_METADATA];
  });

  describe('setAppMetadata', () => {
    it('should store app metadata on class', () => {
      const metadata = {
        name: 'TestApp',
        version: '1.0.0',
        configuration: {},
        contexts: []
      };

      MetadataWriter.setAppMetadata(TestClass, metadata);

      expect((TestClass as any)[STRATIX_METADATA][METADATA_KEYS.APP]).toEqual(metadata);
    });

    it('should initialize metadata container if not exists', () => {
      expect((TestClass as any)[STRATIX_METADATA]).toBeUndefined();

      MetadataWriter.setAppMetadata(TestClass, {
        name: 'Test',
        version: '1.0.0'
      });

      expect((TestClass as any)[STRATIX_METADATA]).toBeDefined();
    });

    it('should not overwrite other metadata types', () => {
      const contextMetadata = { contextClass: TestClass };
      (TestClass as any)[STRATIX_METADATA] = {
        [METADATA_KEYS.CONTEXT]: contextMetadata
      };

      MetadataWriter.setAppMetadata(TestClass, {
        name: 'Test',
        version: '1.0.0'
      });

      expect((TestClass as any)[STRATIX_METADATA][METADATA_KEYS.CONTEXT])
        .toEqual(contextMetadata);
    });
  });
});

// MetadataRegistry.test.ts
describe('MetadataRegistry', () => {
  it('should throw if app class lacks @StratixApp decorator', () => {
    class InvalidApp {}

    expect(() => new MetadataRegistry(InvalidApp))
      .toThrow(DecoratorMissingError);
  });

  it('should build command handler index', () => {
    @StratixApp({ contexts: [TestContext] })
    class TestApp {}

    @Context({ commandHandlers: [TestHandler] })
    class TestContext {}

    class TestCommand {}

    @CommandHandler({ commandClass: TestCommand })
    class TestHandler {}

    const registry = new MetadataRegistry(TestApp);

    expect(registry.commandHandlers.getHandlerForCommand(TestCommand))
      .toBe(TestHandler);
  });

  it('should throw on duplicate command handlers', () => {
    @StratixApp({ contexts: [Context1, Context2] })
    class TestApp {}

    class TestCommand {}

    @CommandHandler({ commandClass: TestCommand })
    class Handler1 {}

    @CommandHandler({ commandClass: TestCommand })
    class Handler2 {}

    @Context({ commandHandlers: [Handler1] })
    class Context1 {}

    @Context({ commandHandlers: [Handler2] })
    class Context2 {}

    expect(() => new MetadataRegistry(TestApp))
      .toThrow(/Duplicate handler for command/);
  });
});
```

**Impact:** Low risk, high benefit. Essential for confidence in refactoring.

---

### 9. No Metadata Query API

**Problem:** Can't introspect metadata across the application.

**Use cases:**
- List all contexts in the application
- Find all handlers for a specific context
- Generate documentation from metadata
- Build admin/debug UI
- Validate architectural rules

**Solution:**
```typescript
export class MetadataQuery {
  static findAllDecoratedClasses(
    key: symbol,
    searchScope: ClassConstructor[]
  ): ClassConstructor[] {
    return searchScope.filter(cls => MetadataReader.hasMetadata(cls, key));
  }

  static findClassesByMetadata<T>(
    key: symbol,
    predicate: (metadata: T) => boolean,
    searchScope: ClassConstructor[]
  ): ClassConstructor[] {
    return searchScope.filter(cls => {
      const metadata = MetadataReader.getMetadata<T>(cls, key);
      return metadata && predicate(metadata);
    });
  }

  static getApplicationGraph(appClass: ClassConstructor): ApplicationGraph {
    const graph: ApplicationGraph = {
      app: appClass,
      contexts: [],
      handlers: []
    };

    const appMetadata = MetadataReader.getAppMetadata(appClass);
    if (!appMetadata) return graph;

    for (const contextClass of appMetadata.contexts || []) {
      const contextMetadata = MetadataReader.getContextMetadata(contextClass);
      if (!contextMetadata) continue;

      const handlers: HandlerInfo[] = [];
      for (const handlerClass of contextMetadata.commandHandlers || []) {
        const handlerMetadata = MetadataReader.getCommandHandlerMetadata(handlerClass);
        if (handlerMetadata) {
          handlers.push({
            handler: handlerClass,
            command: handlerMetadata.commandClass
          });
        }
      }

      graph.contexts.push({
        context: contextClass,
        handlers
      });
    }

    return graph;
  }
}

interface ApplicationGraph {
  app: ClassConstructor;
  contexts: {
    context: ClassConstructor;
    handlers: HandlerInfo[];
  }[];
  handlers: HandlerInfo[];
}

interface HandlerInfo {
  handler: ClassConstructor;
  command: ClassConstructor;
}
```

**Impact:** Low risk, medium benefit. Enables powerful introspection.

---

### 10. Storage Mechanism Limitations

**Problem:** Direct property assignment has limitations.

**Current issues:**
- Pollutes class constructor objects
- Can't be easily serialized
- No memory cleanup (though WeakMap wouldn't help with constructors)
- Global Symbol can be accessed by any code

**Alternative A - External Registry with WeakMap:**
```typescript
export class MetadataStorage {
  private static readonly store = new WeakMap<
    ClassConstructor,
    Map<symbol, unknown>
  >();

  static set<T>(target: ClassConstructor, key: symbol, value: T): void {
    if (!this.store.has(target)) {
      this.store.set(target, new Map());
    }
    this.store.get(target)!.set(key, value);
  }

  static get<T>(target: ClassConstructor, key: symbol): T | undefined {
    return this.store.get(target)?.get(key) as T | undefined;
  }

  static has(target: ClassConstructor, key: symbol): boolean {
    return this.store.get(target)?.has(key) ?? false;
  }

  static delete(target: ClassConstructor, key?: symbol): void {
    if (key) {
      this.store.get(target)?.delete(key);
    } else {
      this.store.delete(target);
    }
  }
}
```

**Benefits:**
- Cleaner separation
- No pollution of class objects
- Easier to test (can clear between tests)
- More control over access

**Drawbacks:**
- WeakMap doesn't allow iteration (can't list all decorated classes)
- Need additional Set to track all registered classes

**Alternative B - Hybrid Approach:**
```typescript
// Use Symbol on class for basic storage
// Use WeakMap for indexes and derived data
export class MetadataSystem {
  private static readonly indexes = new WeakMap<ClassConstructor, MetadataIndexes>();

  static setMetadata<T>(target: ClassConstructor, key: symbol, value: T): void {
    // Store directly on class
    if (!(target as any)[STRATIX_METADATA]) {
      (target as any)[STRATIX_METADATA] = new Map<symbol, unknown>();
    }
    (target as any)[STRATIX_METADATA].set(key, value);
  }

  static getMetadata<T>(target: ClassConstructor, key: symbol): T | undefined {
    return (target as any)[STRATIX_METADATA]?.get(key);
  }

  static getIndexes(target: ClassConstructor): MetadataIndexes {
    if (!this.indexes.has(target)) {
      this.indexes.set(target, this.buildIndexes(target));
    }
    return this.indexes.get(target)!;
  }

  private static buildIndexes(target: ClassConstructor): MetadataIndexes {
    // Build derived indexes from raw metadata
    // ...
  }
}
```

**Impact:** High risk, medium benefit. Architectural change.

---

### 11. Missing Metadata Lifecycle

**Problem:** No hooks for metadata lifecycle events.

**Use cases:**
- Validate metadata after decorator applies
- Transform metadata (e.g., resolve string references to classes)
- Notify other systems when metadata changes
- Implement metadata migrations

**Solution:**
```typescript
export type MetadataLifecycleHook = (
  target: ClassConstructor,
  key: symbol,
  metadata: unknown
) => void | Promise<void>;

export class MetadataLifecycle {
  private static readonly hooks = new Map<
    'beforeSet' | 'afterSet' | 'beforeGet' | 'afterGet',
    MetadataLifecycleHook[]
  >();

  static registerHook(
    phase: 'beforeSet' | 'afterSet' | 'beforeGet' | 'afterGet',
    hook: MetadataLifecycleHook
  ): void {
    if (!this.hooks.has(phase)) {
      this.hooks.set(phase, []);
    }
    this.hooks.get(phase)!.push(hook);
  }

  static async runHooks(
    phase: 'beforeSet' | 'afterSet' | 'beforeGet' | 'afterGet',
    target: ClassConstructor,
    key: symbol,
    metadata: unknown
  ): Promise<void> {
    const hooks = this.hooks.get(phase) || [];
    for (const hook of hooks) {
      await hook(target, key, metadata);
    }
  }
}

export class MetadataWriter {
  static async setMetadata<T>(
    target: ClassConstructor,
    key: symbol,
    metadata: T
  ): Promise<void> {
    await MetadataLifecycle.runHooks('beforeSet', target, key, metadata);

    // Set metadata
    this.ensureMetadataContainer(target);
    (target as any)[STRATIX_METADATA][key] = metadata;

    await MetadataLifecycle.runHooks('afterSet', target, key, metadata);
  }
}

// Usage - validation hook
MetadataLifecycle.registerHook('beforeSet', (target, key, metadata) => {
  if (key === METADATA_KEYS.APP) {
    const schema = AppMetadataSchema;
    const result = schema.safeParse(metadata);
    if (!result.success) {
      throw new InvalidMetadataError('App', result.error.message);
    }
  }
});

// Usage - logging hook
MetadataLifecycle.registerHook('afterSet', (target, key, metadata) => {
  console.log(`Metadata set on ${target.name}:`, key, metadata);
});
```

**Impact:** Medium risk, medium benefit. Adds complexity but enables extensibility.

---

### 12. Performance - Eager Loading

**Problem:** MetadataRegistry eagerly loads all metadata at bootstrap, even for features that may never be used.

**Solution - Lazy Loading:**
```typescript
export class MetadataRegistry {
  public readonly appClass: ClassConstructor;
  private _commandHandlers?: CommandHandlerIndex;
  private _queryHandlers?: QueryHandlerIndex;
  private _eventHandlers?: EventHandlerIndex;

  constructor(appClass: ClassConstructor) {
    this.appClass = appClass;
    // Don't build indexes until needed
  }

  get commandHandlers(): CommandHandlerIndex {
    if (!this._commandHandlers) {
      this._commandHandlers = this.buildCommandHandlerIndex();
    }
    return this._commandHandlers;
  }

  get queryHandlers(): QueryHandlerIndex {
    if (!this._queryHandlers) {
      this._queryHandlers = this.buildQueryHandlerIndex();
    }
    return this._queryHandlers;
  }

  private buildCommandHandlerIndex(): CommandHandlerIndex {
    const index = new CommandHandlerIndex();
    const appMetadata = MetadataReader.getAppMetadata(this.appClass);

    // Build index only for command handlers
    // ...

    return index;
  }
}
```

**Impact:** Low risk, low benefit (for small apps). High benefit for large apps with many handlers.

---

## Recommendations

### Priority 1 - Critical Issues (Do First)

1. Fix Symbol inconsistency (Issue 1)
2. Add runtime type validation (Issue 2)
3. Eliminate code duplication (Issue 3)
4. Add comprehensive tests (Issue 8)

**Estimated effort:** 1-2 days
**Risk:** Low
**Benefit:** High

### Priority 2 - Architectural Improvements (Do Second)

5. Separate MetadataRegistry concerns (Issue 7)
6. Add metadata caching (Issue 6)
7. Improve extensibility (Issue 4)

**Estimated effort:** 2-3 days
**Risk:** Medium
**Benefit:** High

### Priority 3 - Advanced Features (Do Later)

8. Add metadata inheritance (Issue 5)
9. Add metadata query API (Issue 9)
10. Add lifecycle hooks (Issue 11)
11. Implement lazy loading (Issue 12)
12. Consider alternative storage (Issue 10)

**Estimated effort:** 3-5 days
**Risk:** Medium-High
**Benefit:** Medium

## Migration Strategy

To avoid breaking changes, implement improvements incrementally:

### Phase 1 - Internal Improvements (No API Changes)
- Fix Symbol usage
- Add type validation
- Refactor MetadataWriter
- Add tests
- Add caching

Users: No changes needed

### Phase 2 - Enhanced API (Backward Compatible)
- Add generic metadata methods
- Add query API
- Separate concerns in Registry
- Add inheritance support (opt-in via parameter)

Users: Opt-in to new features

### Phase 3 - Breaking Changes (Major Version)
- Remove old API
- Change storage mechanism
- Add lifecycle hooks

Users: Must update decorator usage

## Conclusion

The current metadata system works but has significant room for improvement. Priority 1 issues should be addressed immediately to ensure correctness and maintainability. Priority 2 and 3 can be tackled as the framework grows and requirements become clearer.

The most important architectural decision is whether to maintain the current Symbol-on-class storage or move to an external registry (WeakMap). This decision impacts almost all other improvements and should be made early.
