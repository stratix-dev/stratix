# RFC-001: Integration Guide

**Parent:** RFC-001-fully-typed-metadata-system.md
**Purpose:** Detailed integration with all framework components

---

## Architecture Overview

```
                              Application Code
                                     |
                                     v
+------------------------------------------------------------------+
|                         DECORATOR LAYER                           |
|  @StratixApp  @Context  @CommandHandler  @QueryHandler  @Injectable|
|                         |                                         |
|                         v                                         |
|              Metadata.set(target, key, value)                     |
+------------------------------------------------------------------+
                                     |
                                     v
+------------------------------------------------------------------+
|                         METADATA LAYER                            |
|  MetadataKeys    MetadataTypeMap    Metadata (accessor)           |
|       |               |                  |                        |
|       v               v                  v                        |
|  MetadataKey<K>  -->  Type Registry  -->  Full Type Inference     |
+------------------------------------------------------------------+
                                     |
                                     v
+------------------------------------------------------------------+
|                         BOOTSTRAP LAYER                           |
|  bootstrap(AppClass)                                              |
|       |                                                           |
|       +-- Metadata.getOrThrow(AppClass, MetadataKeys.App)         |
|       +-- new MetadataRegistry({ appClass })                      |
|       +-- new StratixApplication({ appClass, registry })          |
+------------------------------------------------------------------+
                                     |
                                     v
+------------------------------------------------------------------+
|                         RUNTIME LAYER                             |
|  StratixApplication                                               |
|       |                                                           |
|       +-- MetadataRegistry (command/handler mappings)             |
|       +-- AwilixContainerAdapter (DI)                             |
|       +-- InMemoryCommandBus (uses registry)                      |
|       +-- ConfigurationManager (from metadata)                    |
+------------------------------------------------------------------+
```

---

## Component Integration

### 1. Bootstrap Flow

```typescript
// runtime/bootstrap.ts

import { ClassConstructor } from '@stratix/core';
import { Metadata, MetadataKeys } from '../metadata/index.js';
import { DecoratorMissingError } from '../errors/DecoratorMissingError.js';
import { MetadataRegistry } from './MetadataRegistry.js';
import { StratixApplication } from './StratixApplication.js';

/**
 * Bootstraps a Stratix application from a decorated class.
 *
 * Flow:
 * 1. Validate @StratixApp decorator exists (type-safe)
 * 2. Build MetadataRegistry from decorator metadata
 * 3. Create and initialize StratixApplication
 */
export async function bootstrap(
  appClass: ClassConstructor
): Promise<StratixApplication> {
  // Type-safe metadata check with proper error
  if (!Metadata.has(appClass, MetadataKeys.App)) {
    throw new DecoratorMissingError('@StratixApp', appClass.name);
  }

  // After the check, TypeScript knows metadata exists
  // but we use getOrThrow for explicit guarantee
  const appMetadata = Metadata.getOrThrow(appClass, MetadataKeys.App);

  // Log startup info (metadata is fully typed)
  console.log(`Starting ${appMetadata.name} v${appMetadata.version}`);

  // Build registry from metadata graph
  const registry = new MetadataRegistry({ appClass });

  // Create application instance
  const app = new StratixApplication({ appClass, registry });
  await app.initialize();

  return app;
}
```

### 2. MetadataRegistry Integration

```typescript
// runtime/MetadataRegistry.ts

import { ClassConstructor } from '@stratix/core';
import {
  Metadata,
  MetadataKeys,
  type AppMetadata,
  type ContextMetadata,
  type CommandHandlerMetadata,
  type QueryHandlerMetadata,
  type EventHandlerMetadata
} from '../metadata/index.js';
import { DecoratorMissingError } from '../errors/DecoratorMissingError.js';

/**
 * Central registry that builds handler mappings from metadata.
 * All operations are fully type-safe.
 */
export class MetadataRegistry {
  public readonly appClass: ClassConstructor;
  public readonly appMetadata: AppMetadata;

  // Handler mappings
  public readonly commandToHandler = new Map<ClassConstructor, ClassConstructor>();
  public readonly handlerToCommand = new Map<ClassConstructor, ClassConstructor>();
  public readonly queryToHandler = new Map<ClassConstructor, ClassConstructor>();
  public readonly eventToHandlers = new Map<ClassConstructor, ClassConstructor[]>();

  // Context tracking
  public readonly contexts = new Map<ClassConstructor, ContextMetadata>();

  constructor({ appClass }: { appClass: ClassConstructor }) {
    this.appClass = appClass;

    // Get app metadata (type-safe, throws if missing)
    this.appMetadata = Metadata.getOrThrow(appClass, MetadataKeys.App);

    // Process all contexts
    this.initializeContexts();
  }

  private initializeContexts(): void {
    for (const contextClass of this.appMetadata.contexts) {
      this.processContext(contextClass);
    }
  }

  private processContext(contextClass: ClassConstructor): void {
    // Get context metadata (type-safe)
    const contextMetadata = Metadata.get(contextClass, MetadataKeys.Context);

    if (!contextMetadata) {
      throw new DecoratorMissingError('@Context', contextClass.name);
    }

    // Store context
    this.contexts.set(contextClass, contextMetadata);

    // Process handlers
    this.processCommandHandlers(contextMetadata.commandHandlers);
    this.processQueryHandlers(contextMetadata.queryHandlers);
    this.processEventHandlers(contextMetadata.eventHandlers);
  }

  private processCommandHandlers(handlers: readonly ClassConstructor[]): void {
    for (const handlerClass of handlers) {
      const metadata = Metadata.get(handlerClass, MetadataKeys.CommandHandler);

      if (!metadata) {
        throw new DecoratorMissingError('@CommandHandler', handlerClass.name);
      }

      // Type-safe: metadata.commandClass is guaranteed to be ClassConstructor
      this.commandToHandler.set(metadata.commandClass, metadata.handlerClass);
      this.handlerToCommand.set(metadata.handlerClass, metadata.commandClass);
    }
  }

  private processQueryHandlers(handlers: readonly ClassConstructor[]): void {
    for (const handlerClass of handlers) {
      const metadata = Metadata.get(handlerClass, MetadataKeys.QueryHandler);

      if (!metadata) {
        throw new DecoratorMissingError('@QueryHandler', handlerClass.name);
      }

      this.queryToHandler.set(metadata.queryClass, metadata.handlerClass);
    }
  }

  private processEventHandlers(handlers: readonly ClassConstructor[]): void {
    for (const handlerClass of handlers) {
      const metadata = Metadata.get(handlerClass, MetadataKeys.EventHandler);

      if (!metadata) {
        throw new DecoratorMissingError('@EventHandler', handlerClass.name);
      }

      // Event handlers can handle multiple events
      for (const eventClass of metadata.eventClasses) {
        const existing = this.eventToHandlers.get(eventClass) ?? [];
        this.eventToHandlers.set(eventClass, [...existing, metadata.handlerClass]);
      }
    }
  }

  // Type-safe query methods
  getHandlerForCommand(commandClass: ClassConstructor): ClassConstructor | undefined {
    return this.commandToHandler.get(commandClass);
  }

  getHandlerForQuery(queryClass: ClassConstructor): ClassConstructor | undefined {
    return this.queryToHandler.get(queryClass);
  }

  getHandlersForEvent(eventClass: ClassConstructor): ClassConstructor[] {
    return this.eventToHandlers.get(eventClass) ?? [];
  }
}
```

### 3. StratixApplication Integration

```typescript
// runtime/StratixApplication.ts

import {
  ConfigurationProvider,
  DependencyLifetime,
  ClassConstructor
} from '@stratix/core';
import { AwilixContainer, createContainer, InjectionMode } from 'awilix';
import { AwilixContainerAdapter } from '../container/AwilixContainerAdapter.js';
import { Metadata, MetadataKeys, type AppMetadata } from '../metadata/index.js';
import { MetadataRegistry } from './MetadataRegistry.js';
import { InMemoryCommandBus } from '../cqrs/InMemoryCommandBus.js';
import { InMemoryQueryBus } from '../cqrs/InMemoryQueryBus.js';
import { InMemoryEventBus } from '../cqrs/InMemoryEventBus.js';
import { ConfigurationManager } from '../config/ConfigurationManager.js';
import { YamlConfigurationSource } from '../config/YamlConfigurationSource.js';
import { EnvironmentConfigurationSource } from '../config/EnvironmentConfigurationSource.js';

export class StratixApplication {
  public config?: ConfigurationProvider;
  public readonly registry: MetadataRegistry;
  public readonly metadata: AppMetadata;

  private readonly appClass: ClassConstructor;
  private readonly awilixContainer: AwilixContainer;
  private readonly container: AwilixContainerAdapter;

  constructor({
    appClass,
    registry
  }: {
    appClass: ClassConstructor;
    registry?: MetadataRegistry;
  }) {
    this.appClass = appClass;
    this.registry = registry ?? new MetadataRegistry({ appClass });

    // Get metadata (type-safe, guaranteed by registry construction)
    this.metadata = Metadata.getOrThrow(appClass, MetadataKeys.App);

    // Create DI container with settings from metadata
    this.awilixContainer = createContainer({
      strict: this.metadata.di.strict,
      injectionMode: this.metadata.di.injectionMode === 'PROXY'
        ? InjectionMode.PROXY
        : InjectionMode.CLASSIC
    });

    this.container = new AwilixContainerAdapter({
      awilixContainer: this.awilixContainer
    });
  }

  async initialize(): Promise<void> {
    // Register core services
    this.registerBuses();
    this.registerHandlers();
    await this.registerConfiguration();

    // Register providers from contexts
    this.registerProviders();
  }

  private registerBuses(): void {
    // CommandBus
    this.container.registerClass('commandBus', InMemoryCommandBus, {
      lifetime: DependencyLifetime.SINGLETON,
      localInjections: {
        container: this.container,
        registry: this.registry
      }
    });

    // QueryBus
    this.container.registerClass('queryBus', InMemoryQueryBus, {
      lifetime: DependencyLifetime.SINGLETON,
      localInjections: {
        container: this.container,
        registry: this.registry
      }
    });

    // EventBus
    this.container.registerClass('eventBus', InMemoryEventBus, {
      lifetime: DependencyLifetime.SINGLETON,
      localInjections: {
        container: this.container,
        registry: this.registry
      }
    });
  }

  private registerHandlers(): void {
    // Register all command handlers
    for (const [commandClass, handlerClass] of this.registry.commandToHandler) {
      this.registerHandler(commandClass, handlerClass);
    }

    // Register all query handlers
    for (const [queryClass, handlerClass] of this.registry.queryToHandler) {
      this.registerHandler(queryClass, handlerClass);
    }

    // Register all event handlers
    for (const handlers of this.registry.eventToHandlers.values()) {
      for (const handlerClass of handlers) {
        this.container.registerClass(handlerClass.name, handlerClass, {
          lifetime: DependencyLifetime.TRANSIENT
        });
      }
    }
  }

  private registerHandler(
    messageClass: ClassConstructor,
    handlerClass: ClassConstructor
  ): void {
    this.container.registerClass(messageClass.name, messageClass, {
      lifetime: DependencyLifetime.TRANSIENT
    });
    this.container.registerClass(handlerClass.name, handlerClass, {
      lifetime: DependencyLifetime.TRANSIENT
    });
  }

  private registerProviders(): void {
    for (const [, contextMetadata] of this.registry.contexts) {
      for (const providerClass of contextMetadata.providers) {
        // Check for @Injectable metadata to get scope
        const injectableMetadata = Metadata.get(providerClass, MetadataKeys.Injectable);

        const lifetime = injectableMetadata?.scope === 'singleton'
          ? DependencyLifetime.SINGLETON
          : injectableMetadata?.scope === 'scoped'
            ? DependencyLifetime.SCOPED
            : DependencyLifetime.TRANSIENT;

        const token = injectableMetadata?.token ?? providerClass.name;

        this.container.registerClass(token, providerClass, { lifetime });
      }
    }
  }

  private async registerConfiguration(): Promise<void> {
    const configMetadata = this.metadata.configuration;

    // Build config sources from metadata
    const sources: ConfigurationSource[] = [];

    // Add YAML source if configured
    if (configMetadata.configFile) {
      const yamlSource = new YamlConfigurationSource({
        filePath: configMetadata.configFile,
        basePath: process.cwd(),
        encoding: 'utf-8'
      });
      sources.push(yamlSource);
    }

    // Add environment source with prefix
    if (configMetadata.envPrefix) {
      const envSource = new EnvironmentConfigurationSource({
        prefix: configMetadata.envPrefix
      });
      sources.push(envSource);
    }

    // Add custom sources from metadata
    for (const SourceClass of configMetadata.sources) {
      sources.push(new SourceClass());
    }

    // Register config manager
    this.container.registerClass('config', ConfigurationManager, {
      lifetime: DependencyLifetime.SINGLETON,
      localInjections: { sources, cache: true }
    });

    this.config = this.container.resolve('config');
    await this.config.load();
  }

  async shutdown(): Promise<void> {
    await this.container.dispose();
  }

  resolve<T>(token: string | symbol): T {
    return this.container.resolve<T>(token);
  }
}
```

### 4. CQRS Bus Integration

```typescript
// cqrs/InMemoryCommandBus.ts

import {
  Command,
  CommandBus,
  CommandHandler,
  Container,
  Result,
  Failure
} from '@stratix/core';
import { MetadataRegistry } from '../runtime/MetadataRegistry.js';

export class InMemoryCommandBus implements CommandBus {
  private readonly container: Container;
  private readonly registry: MetadataRegistry;

  constructor({
    container,
    registry
  }: {
    container: Container;
    registry: MetadataRegistry
  }) {
    this.container = container;
    this.registry = registry;
  }

  async dispatch<TResult = void>(command: Command): Promise<TResult> {
    const CommandClass = command.constructor as new (...args: unknown[]) => Command;

    // Use type-safe registry method
    const HandlerClass = this.registry.getHandlerForCommand(CommandClass);

    if (!HandlerClass) {
      throw new Error(`No handler registered for command: ${CommandClass.name}`);
    }

    const handler = this.container.resolve<CommandHandler<Command, TResult>>(
      HandlerClass.name
    );

    return handler.handle(command);
  }
}


// cqrs/InMemoryQueryBus.ts

import { Query, QueryBus, QueryHandler, Container } from '@stratix/core';
import { MetadataRegistry } from '../runtime/MetadataRegistry.js';

export class InMemoryQueryBus implements QueryBus {
  private readonly container: Container;
  private readonly registry: MetadataRegistry;

  constructor({
    container,
    registry
  }: {
    container: Container;
    registry: MetadataRegistry
  }) {
    this.container = container;
    this.registry = registry;
  }

  async execute<TResult>(query: Query): Promise<TResult> {
    const QueryClass = query.constructor as new (...args: unknown[]) => Query;

    const HandlerClass = this.registry.getHandlerForQuery(QueryClass);

    if (!HandlerClass) {
      throw new Error(`No handler registered for query: ${QueryClass.name}`);
    }

    const handler = this.container.resolve<QueryHandler<Query, TResult>>(
      HandlerClass.name
    );

    return handler.handle(query);
  }
}


// cqrs/InMemoryEventBus.ts

import { DomainEvent, EventBus, EventHandler, Container } from '@stratix/core';
import { MetadataRegistry } from '../runtime/MetadataRegistry.js';

export class InMemoryEventBus implements EventBus {
  private readonly container: Container;
  private readonly registry: MetadataRegistry;

  constructor({
    container,
    registry
  }: {
    container: Container;
    registry: MetadataRegistry
  }) {
    this.container = container;
    this.registry = registry;
  }

  async publish(event: DomainEvent): Promise<void> {
    const EventClass = event.constructor as new (...args: unknown[]) => DomainEvent;

    const handlerClasses = this.registry.getHandlersForEvent(EventClass);

    // Events can have zero or multiple handlers
    const handlers = handlerClasses.map(HandlerClass =>
      this.container.resolve<EventHandler<DomainEvent>>(HandlerClass.name)
    );

    // Execute all handlers (can be parallelized)
    await Promise.all(handlers.map(h => h.handle(event)));
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    await Promise.all(events.map(e => this.publish(e)));
  }
}
```

### 5. Decorator Integration

```typescript
// decorators/index.ts - All decorators use unified Metadata API

export { StratixApp, type StratixAppOptions } from './StratixApp.js';
export { Context, type ContextOptions } from './Context.js';
export { CommandHandler, type CommandHandlerOptions } from './CommandHandler.js';
export { QueryHandler, type QueryHandlerOptions } from './QueryHandler.js';
export { EventHandler, type EventHandlerOptions } from './EventHandler.js';
export { Injectable, type InjectableOptions } from './Injectable.js';


// decorators/Context.ts

import { ClassConstructor } from '@stratix/core';
import { Metadata, MetadataKeys, type ContextMetadata } from '../metadata/index.js';
import { DecoratorKindError } from '../errors/DecoratorKindError.js';

export interface ContextOptions {
  commandHandlers?: ClassConstructor[];
  queryHandlers?: ClassConstructor[];
  eventHandlers?: ClassConstructor[];
  providers?: ClassConstructor[];
}

export function Context(options: ContextOptions = {}) {
  return function <T extends new (...args: unknown[]) => unknown>(
    target: T,
    context: ClassDecoratorContext
  ): T {
    if (context.kind !== 'class') {
      throw new DecoratorKindError('Context', 'class', context.kind);
    }

    // Build fully-typed metadata
    const metadata: ContextMetadata = {
      contextClass: target,
      commandHandlers: options.commandHandlers ?? [],
      queryHandlers: options.queryHandlers ?? [],
      eventHandlers: options.eventHandlers ?? [],
      providers: options.providers ?? [],
    };

    // Type-safe set
    Metadata.set(target, MetadataKeys.Context, metadata);

    return target;
  };
}


// decorators/QueryHandler.ts

import { Query, QueryHandler as IQueryHandler } from '@stratix/core';
import { Metadata, MetadataKeys, type QueryHandlerMetadata } from '../metadata/index.js';
import { DecoratorKindError } from '../errors/DecoratorKindError.js';

export interface QueryHandlerOptions<TQuery extends Query = Query> {
  query: new (...args: unknown[]) => TQuery;
}

export function QueryHandler<TQuery extends Query, TResult = unknown>(
  options: QueryHandlerOptions<TQuery>
) {
  return function <T extends new (...args: unknown[]) => IQueryHandler<TQuery, TResult>>(
    target: T,
    context: ClassDecoratorContext
  ): T {
    if (context.kind !== 'class') {
      throw new DecoratorKindError('QueryHandler', 'class', context.kind);
    }

    const metadata: QueryHandlerMetadata = {
      handlerClass: target,
      queryClass: options.query,
    };

    Metadata.set(target, MetadataKeys.QueryHandler, metadata);

    return target;
  };
}


// decorators/EventHandler.ts

import { DomainEvent, EventHandler as IEventHandler } from '@stratix/core';
import { Metadata, MetadataKeys, type EventHandlerMetadata } from '../metadata/index.js';
import { DecoratorKindError } from '../errors/DecoratorKindError.js';

export interface EventHandlerOptions {
  events: (new (...args: unknown[]) => DomainEvent)[];
}

export function EventHandler(options: EventHandlerOptions) {
  return function <T extends new (...args: unknown[]) => IEventHandler<DomainEvent>>(
    target: T,
    context: ClassDecoratorContext
  ): T {
    if (context.kind !== 'class') {
      throw new DecoratorKindError('EventHandler', 'class', context.kind);
    }

    const metadata: EventHandlerMetadata = {
      handlerClass: target,
      eventClasses: options.events,
    };

    Metadata.set(target, MetadataKeys.EventHandler, metadata);

    return target;
  };
}


// decorators/Injectable.ts

import { Metadata, MetadataKeys, type InjectableMetadata } from '../metadata/index.js';
import { DecoratorKindError } from '../errors/DecoratorKindError.js';

export interface InjectableOptions {
  scope?: 'singleton' | 'transient' | 'scoped';
  token?: string | symbol;
}

export function Injectable(options: InjectableOptions = {}) {
  return function <T extends new (...args: unknown[]) => unknown>(
    target: T,
    context: ClassDecoratorContext
  ): T {
    if (context.kind !== 'class') {
      throw new DecoratorKindError('Injectable', 'class', context.kind);
    }

    const metadata: InjectableMetadata = {
      scope: options.scope ?? 'transient',
      token: options.token,
    };

    Metadata.set(target, MetadataKeys.Injectable, metadata);

    return target;
  };
}
```

---

## Complete Usage Example

```typescript
// app.ts - Complete application example

import { Command, Query, DomainEvent, CommandHandler, QueryHandler, EventHandler } from '@stratix/core';
import {
  StratixApp,
  Context,
  CommandHandler as CommandHandlerDecorator,
  QueryHandler as QueryHandlerDecorator,
  EventHandler as EventHandlerDecorator,
  Injectable,
  bootstrap
} from '@stratix/framework';

// Domain: Commands
class CreateUserCommand implements Command {
  readonly type = 'CreateUser';
  constructor(
    public readonly email: string,
    public readonly name: string
  ) {}
}

// Domain: Queries
class GetUserQuery implements Query {
  readonly type = 'GetUser';
  constructor(public readonly userId: string) {}
}

// Domain: Events
class UserCreatedEvent implements DomainEvent {
  readonly type = 'UserCreated';
  readonly occurredAt = new Date();
  constructor(
    public readonly userId: string,
    public readonly email: string
  ) {}
}

// Infrastructure: Repository
@Injectable({ scope: 'singleton' })
class UserRepository {
  private users = new Map<string, { id: string; email: string; name: string }>();

  save(user: { id: string; email: string; name: string }): void {
    this.users.set(user.id, user);
  }

  findById(id: string) {
    return this.users.get(id);
  }
}

// Application: Command Handler
@CommandHandlerDecorator({ command: CreateUserCommand })
class CreateUserHandler implements CommandHandler<CreateUserCommand, string> {
  constructor(private readonly userRepository: UserRepository) {}

  async handle(command: CreateUserCommand): Promise<string> {
    const userId = crypto.randomUUID();
    this.userRepository.save({
      id: userId,
      email: command.email,
      name: command.name
    });
    return userId;
  }
}

// Application: Query Handler
@QueryHandlerDecorator({ query: GetUserQuery })
class GetUserHandler implements QueryHandler<GetUserQuery, { id: string; email: string; name: string } | undefined> {
  constructor(private readonly userRepository: UserRepository) {}

  async handle(query: GetUserQuery) {
    return this.userRepository.findById(query.userId);
  }
}

// Application: Event Handler
@EventHandlerDecorator({ events: [UserCreatedEvent] })
class UserCreatedHandler implements EventHandler<UserCreatedEvent> {
  async handle(event: UserCreatedEvent): Promise<void> {
    console.log(`User created: ${event.userId} (${event.email})`);
  }
}

// Bounded Context
@Context({
  commandHandlers: [CreateUserHandler],
  queryHandlers: [GetUserHandler],
  eventHandlers: [UserCreatedHandler],
  providers: [UserRepository]
})
class UserContext {}

// Application Root
@StratixApp({
  name: 'my-app',
  version: '1.0.0',
  contexts: [UserContext],
  configuration: {
    configFile: 'config.yaml',
    envPrefix: 'APP_'
  },
  di: {
    injectionMode: 'PROXY',
    strict: true
  }
})
class Application {}

// Bootstrap and run
async function main() {
  const app = await bootstrap(Application);

  // Get buses from container
  const commandBus = app.resolve<CommandBus>('commandBus');
  const queryBus = app.resolve<QueryBus>('queryBus');

  // Create a user
  const userId = await commandBus.dispatch<string>(
    new CreateUserCommand('john@example.com', 'John Doe')
  );

  console.log(`Created user with ID: ${userId}`);

  // Query the user
  const user = await queryBus.execute(new GetUserQuery(userId));
  console.log(`Found user:`, user);

  await app.shutdown();
}

main().catch(console.error);
```

---

## Data Flow Diagram

```
+----------------+     +------------------+     +-------------------+
|   @StratixApp  |     |    @Context      |     | @CommandHandler   |
|   Application  |---->|   UserContext    |---->| CreateUserHandler |
+----------------+     +------------------+     +-------------------+
        |                      |                        |
        v                      v                        v
+----------------+     +------------------+     +-------------------+
| Metadata.set() |     | Metadata.set()   |     | Metadata.set()    |
| Key: 'app'     |     | Key: 'context'   |     | Key: 'command-    |
| Value: App     |     | Value: Context   |     |       handler'    |
|       Metadata |     |        Metadata  |     | Value: Handler    |
+----------------+     +------------------+     |        Metadata   |
        |                      |               +-------------------+
        |                      |                        |
        +----------------------+------------------------+
                               |
                               v
                    +---------------------+
                    |     bootstrap()     |
                    | Metadata.getOrThrow |
                    +---------------------+
                               |
                               v
                    +---------------------+
                    |  MetadataRegistry   |
                    | - Reads all metadata|
                    | - Builds mappings   |
                    +---------------------+
                               |
                               v
                    +---------------------+
                    | StratixApplication  |
                    | - Creates DI        |
                    | - Registers buses   |
                    | - Registers handlers|
                    +---------------------+
                               |
                               v
                    +---------------------+
                    |  InMemoryCommandBus |
                    | - Uses registry     |
                    | - Resolves handlers |
                    | - Dispatches        |
                    +---------------------+
```

---

## File Structure After Implementation

```
packages/framework/src/
+-- metadata/
|   +-- index.ts              # Re-exports all
|   +-- keys.ts               # MetadataKey<K>, defineMetadataKey, MetadataKeys
|   +-- registry.ts           # MetadataTypeMap, all metadata interfaces
|   +-- storage.ts            # METADATA_STORAGE symbol, MetadataContainer
|   +-- Metadata.ts           # Unified accessor class
|   +-- errors.ts             # MetadataNotFoundError
|   +-- [deprecated/]         # Old MetadataReader, MetadataWriter (remove in v3)
|
+-- decorators/
|   +-- index.ts
|   +-- StratixApp.ts         # Updated to use Metadata.set
|   +-- Context.ts            # Updated to use Metadata.set
|   +-- CommandHandler.ts     # Updated to use Metadata.set
|   +-- QueryHandler.ts       # NEW
|   +-- EventHandler.ts       # NEW
|   +-- Injectable.ts         # NEW
|
+-- runtime/
|   +-- index.ts
|   +-- bootstrap.ts          # Updated to use Metadata.getOrThrow
|   +-- MetadataRegistry.ts   # Updated to use Metadata API
|   +-- StratixApplication.ts # Updated to use Metadata API
|
+-- cqrs/
|   +-- index.ts
|   +-- InMemoryCommandBus.ts # Uses MetadataRegistry
|   +-- InMemoryQueryBus.ts   # NEW
|   +-- InMemoryEventBus.ts   # NEW
|
+-- di/
|   +-- index.ts
|   +-- AwilixContainerAdapter.ts
|
+-- index.ts                  # Main exports
```

---

## Type Safety Guarantees

### Compile-Time Checks

```typescript
// 1. Wrong value type for key
Metadata.set(MyClass, MetadataKeys.App, { contextClass: MyClass });
//                                       ^^^^^^^^^^^^^^^^^^^^^
// Error: Type '{ contextClass: ... }' is not assignable to type 'AppMetadata'

// 2. Missing required fields
Metadata.set(MyClass, MetadataKeys.App, { name: 'app' });
//                                       ^^^^^^^^^^^^^
// Error: Property 'version' is missing in type...

// 3. Correct type inference on get
const appMeta = Metadata.get(MyClass, MetadataKeys.App);
//    ^? AppMetadata | undefined

const ctxMeta = Metadata.get(MyClass, MetadataKeys.Context);
//    ^? ContextMetadata | undefined

// 4. Type narrowing with has()
if (Metadata.has(MyClass, MetadataKeys.App)) {
  const meta = Metadata.get(MyClass, MetadataKeys.App);
  //    ^? AppMetadata (not undefined!)
}

// 5. getOrThrow guarantees non-undefined
const meta = Metadata.getOrThrow(MyClass, MetadataKeys.App);
//    ^? AppMetadata (never undefined)
```

### Runtime Checks

```typescript
// MetadataNotFoundError thrown with clear message
try {
  Metadata.getOrThrow(UndecoratedClass, MetadataKeys.App);
} catch (e) {
  // MetadataNotFoundError: Metadata 'app' not found on class 'UndecoratedClass'
}
```

---

## Summary

The fully-typed metadata system integrates seamlessly with all framework components:

| Component | Integration Point |
|-----------|-------------------|
| Decorators | `Metadata.set(target, key, value)` |
| Bootstrap | `Metadata.getOrThrow(appClass, MetadataKeys.App)` |
| MetadataRegistry | `Metadata.get()` for all handler types |
| StratixApplication | Uses `registry.metadata` (typed) |
| CQRS Buses | Use `registry.getHandlerFor*()` methods |
| DI Container | Scope from `@Injectable` metadata |
| Configuration | Sources from `appMetadata.configuration` |

All operations maintain full type safety from decorator to runtime.
