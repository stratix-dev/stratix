# Stratix Framework Architecture Proposal

## Executive Summary

This document proposes a comprehensive architecture redesign for `@stratix/framework` to achieve:
- **Strong type safety** end-to-end (compile-time guarantees)
- **Multi-app support** (multiple isolated apps per process)
- **Robust metadata system** (no runtime errors, no missing connections)
- **Automatic handler discovery** (true convention over configuration)
- **Testability** (isolated test contexts, no shared state)
- **Performance** (zero overhead abstractions, lazy loading)

## Current State Analysis

### Critical Issues

#### 1. Broken Command Bus Implementation
```typescript
// InMemoryCommandBus.ts:8-12 - DOES NOT COMPILE
const commandMetadata = MetadataStorage.getCommandMetadata(CommandClass);
// ❌ Method doesn't exist
const HandlerClass = MetadataStorage.getCommandHandlerByName(commandName);
// ❌ Method doesn't exist
```

#### 2. Type Safety Violations
```typescript
// Handler implements wrong interface
@CommandHandler({ commandClass: CreateUserCommand })
export class CreateUserCommandHandler {
  execute(command: CreateUserCommand) { } // ❌ Should be "handle"
}

// Core expects:
interface CommandHandler<TCommand, TResult> {
  handle(command: TCommand): Promise<TResult>; // ✅ Correct
}
```

#### 3. Missing DI Registrations
```typescript
// StratixApplication.ts - buses never registered
const commandBus = app.resolve<CommandBus>('CommandBus'); // ❌ Runtime error
```

#### 4. Global Static Metadata (Single App Lock-in)
```typescript
export class MetadataStorage {
  private static appByClass = new Map(); // ❌ Shared across all apps
  private static contextByClass = new Map();
  private static commandHandlerByClass = new Map();
}
```

**Problems**:
- Cannot run multiple apps in same process
- Tests share state (flaky tests)
- Memory leaks (metadata never cleaned)
- No isolation between test suites

#### 5. Decorator Redundancy
```typescript
// Why both?
@CommandHandler({ commandClass: CreateUserCommand }) // Listed here
export class CreateUserCommandHandler { }

@Context({
  commandHandlers: [CreateUserCommandHandler] // AND here?
})
export class UserContext {}
```

## Proposed Architecture

### 1. Instance-Based Metadata Storage

**Replace global static storage with per-application instances.**

```typescript
// NEW: Instance-based storage
export class MetadataRegistry {
  private readonly apps = new Map<ClassConstructor, AppMetadata>();
  private readonly contexts = new Map<ClassConstructor, ContextMetadata>();
  private readonly commandHandlers = new Map<ClassConstructor, CommandHandlerMetadata>();
  private readonly queryHandlers = new Map<ClassConstructor, QueryHandlerMetadata>();
  private readonly eventHandlers = new Map<ClassConstructor, EventHandlerMetadata>();

  // Bidirectional mappings for O(1) lookup
  private readonly commandToHandler = new Map<ClassConstructor, ClassConstructor>();
  private readonly queryToHandler = new Map<ClassConstructor, ClassConstructor>();
  private readonly eventToHandlers = new Map<ClassConstructor, Set<ClassConstructor>>();

  // Reverse lookup: handler → command/query
  private readonly handlerToCommand = new Map<ClassConstructor, ClassConstructor>();
  private readonly handlerToQuery = new Map<ClassConstructor, ClassConstructor>();

  constructor() {}

  // App registration
  registerApp(appClass: ClassConstructor, metadata: AppMetadata): void {
    if (this.apps.has(appClass)) {
      throw new StratixError(
        Error.DUPLICATE_REGISTRATION,
        `Application ${appClass.name} already registered`
      );
    }
    this.apps.set(appClass, metadata);
  }

  // Handler registration with bidirectional mapping
  registerCommandHandler(
    handlerClass: ClassConstructor,
    commandClass: ClassConstructor,
    metadata: CommandHandlerMetadata
  ): void {
    // Check for duplicates
    const existing = this.commandToHandler.get(commandClass);
    if (existing) {
      throw new StratixError(
        Error.DUPLICATE_HANDLER,
        `Command ${commandClass.name} already has handler ${existing.name}`
      );
    }

    this.commandHandlers.set(handlerClass, metadata);
    this.commandToHandler.set(commandClass, handlerClass);
    this.handlerToCommand.set(handlerClass, commandClass);
  }

  // Fast lookup: command → handler
  getHandlerForCommand(commandClass: ClassConstructor): ClassConstructor | undefined {
    return this.commandToHandler.get(commandClass);
  }

  // Fast lookup: handler → command
  getCommandForHandler(handlerClass: ClassConstructor): ClassConstructor | undefined {
    return this.handlerToCommand.get(handlerClass);
  }

  // Query handlers (same pattern)
  registerQueryHandler(
    handlerClass: ClassConstructor,
    queryClass: ClassConstructor,
    metadata: QueryHandlerMetadata
  ): void {
    const existing = this.queryToHandler.get(queryClass);
    if (existing) {
      throw new StratixError(
        Error.DUPLICATE_HANDLER,
        `Query ${queryClass.name} already has handler ${existing.name}`
      );
    }

    this.queryHandlers.set(handlerClass, metadata);
    this.queryToHandler.set(queryClass, handlerClass);
    this.handlerToQuery.set(handlerClass, queryClass);
  }

  getHandlerForQuery(queryClass: ClassConstructor): ClassConstructor | undefined {
    return this.queryToHandler.get(queryClass);
  }

  // Event handlers (one-to-many)
  registerEventHandler(
    handlerClass: ClassConstructor,
    eventClass: ClassConstructor,
    metadata: EventHandlerMetadata
  ): void {
    if (!this.eventToHandlers.has(eventClass)) {
      this.eventToHandlers.set(eventClass, new Set());
    }
    this.eventToHandlers.get(eventClass)!.add(handlerClass);
    this.eventHandlers.set(handlerClass, metadata);
  }

  getHandlersForEvent(eventClass: ClassConstructor): ClassConstructor[] {
    const handlers = this.eventToHandlers.get(eventClass);
    return handlers ? Array.from(handlers) : [];
  }

  // Complete cleanup
  clear(): void {
    this.apps.clear();
    this.contexts.clear();
    this.commandHandlers.clear();
    this.queryHandlers.clear();
    this.eventHandlers.clear();
    this.commandToHandler.clear();
    this.queryToHandler.clear();
    this.eventToHandlers.clear();
    this.handlerToCommand.clear();
    this.handlerToQuery.clear();
  }

  // Introspection
  getStats() {
    return {
      apps: this.apps.size,
      contexts: this.contexts.size,
      commandHandlers: this.commandHandlers.size,
      queryHandlers: this.queryHandlers.size,
      eventHandlers: this.eventHandlers.size,
    };
  }

  // Validation
  validate(): ValidationResult {
    const errors: string[] = [];

    // Check all handlers are registered in contexts
    for (const [handler, metadata] of this.commandHandlers) {
      if (!this.isHandlerInAnyContext(handler)) {
        errors.push(`Handler ${handler.name} not registered in any context`);
      }
    }

    // Check all commands have handlers
    // ... more validation

    return { valid: errors.length === 0, errors };
  }

  private isHandlerInAnyContext(handlerClass: ClassConstructor): boolean {
    for (const contextMetadata of this.contexts.values()) {
      if (contextMetadata.commandHandlers?.includes(handlerClass)) {
        return true;
      }
    }
    return false;
  }
}
```

### 2. Type-Safe Decorators with Validation

**Enforce interface compliance at decorator level.**

```typescript
// Constraint: Handler must implement CommandHandler interface
export function CommandHandler<TCommand extends Command>(
  commandClass: new (...args: any[]) => TCommand
) {
  return function <
    THandler extends new (...args: any[]) => CommandHandler<TCommand, any>
  >(
    target: THandler,
    context: ClassDecoratorContext
  ) {
    if (context.kind !== 'class') {
      throw new StratixError(
        Error.DECORATOR_MISUSE,
        '@CommandHandler can only be applied to classes'
      );
    }

    const metadata: CommandHandlerMetadata = {
      handlerClass: target,
      commandClass: commandClass,
      handlerType: 'command',
    };

    context.addInitializer(function() {
      // Get registry from global decorator registry
      const registry = DecoratorRegistry.getActiveRegistry();
      if (registry) {
        registry.registerCommandHandler(target, commandClass, metadata);
      }
    });

    return target;
  };
}

// Usage - now type-safe:
@CommandHandler(CreateUserCommand)
export class CreateUserCommandHandler implements CommandHandler<CreateUserCommand, void> {
  async handle(command: CreateUserCommand): Promise<void> {
    // ✅ Type-safe: must have handle(), not execute()
  }
}

// ❌ Compile error: missing handle method
@CommandHandler(CreateUserCommand)
export class BadHandler {
  execute(command: CreateUserCommand) { } // Wrong method name
}
```

**Same pattern for Query and Event handlers:**

```typescript
export function QueryHandler<TQuery extends Query, TResult>(
  queryClass: new (...args: any[]) => TQuery
) {
  return function <
    THandler extends new (...args: any[]) => QueryHandler<TQuery, TResult>
  >(target: THandler, context: ClassDecoratorContext) {
    // Similar implementation
  };
}

export function EventHandler<TEvent extends Event>(
  eventClass: new (...args: any[]) => TEvent
) {
  return function <
    THandler extends new (...args: any[]) => EventHandler<TEvent>
  >(target: THandler, context: ClassDecoratorContext) {
    // Similar implementation
  };
}
```

### 3. Global Decorator Registry (Coordination Layer)

**Decorators need to know which registry to use during class initialization.**

```typescript
// Global registry that tracks the "active" registry during bootstrap
export class DecoratorRegistry {
  private static registryStack: MetadataRegistry[] = [];

  // Set active registry before bootstrapping
  static pushRegistry(registry: MetadataRegistry): void {
    this.registryStack.push(registry);
  }

  static popRegistry(): MetadataRegistry | undefined {
    return this.registryStack.pop();
  }

  static getActiveRegistry(): MetadataRegistry | undefined {
    return this.registryStack[this.registryStack.length - 1];
  }

  // For testing: ensure clean state
  static clear(): void {
    this.registryStack = [];
  }
}
```

**How it works:**

```typescript
// bootstrap.ts
export async function bootstrap(
  appClass: new (...args: any[]) => any
): Promise<StratixApplication> {
  // Create isolated registry for this app
  const registry = new MetadataRegistry();

  // Make it active so decorators can register
  DecoratorRegistry.pushRegistry(registry);

  try {
    // Trigger decorator execution
    const appInstance = new appClass();

    // Create application with this registry
    const app = new StratixApplication(appClass, registry);
    await app.initialize();

    return app;
  } finally {
    // Clean up
    DecoratorRegistry.popRegistry();
  }
}
```

### 4. Refactored StratixApplication

**Application owns its registry and manages complete lifecycle.**

```typescript
export class StratixApplication {
  public readonly container: AwilixContainerAdapter;
  public readonly config: ConfigurationProvider;
  public readonly registry: MetadataRegistry;

  private readonly appClass: ClassConstructor;
  private readonly awilixContainer: AwilixContainer;

  private commandBus?: InMemoryCommandBus;
  private queryBus?: InMemoryQueryBus;
  private eventBus?: InMemoryEventBus;

  constructor(
    appClass: ClassConstructor,
    registry: MetadataRegistry // Injected, not global
  ) {
    this.appClass = appClass;
    this.registry = registry;
    this.awilixContainer = createContainer({ strict: true });
    this.container = new AwilixContainerAdapter(this.awilixContainer);
    this.config = null as any; // Initialized later
  }

  async initialize(): Promise<void> {
    // 1. Validate metadata
    const validation = this.registry.validate();
    if (!validation.valid) {
      throw new StratixError(
        Error.INVALID_CONFIGURATION,
        `Application validation failed:\n${validation.errors.join('\n')}`
      );
    }

    // 2. Get app metadata
    const appMetadata = this.registry.getAppMetadata(this.appClass);
    if (!appMetadata) {
      throw new StratixError(
        Error.MISSING_METADATA,
        `No @StratixApp metadata found for ${this.appClass.name}`
      );
    }

    // 3. Initialize configuration
    await this.initializeConfiguration(appMetadata.configuration);

    // 4. Register core services
    this.registerCoreServices();

    // 5. Register buses
    this.registerBuses();

    // 6. Register contexts and handlers
    await this.registerContexts(appMetadata.contexts || []);

    // 7. Initialize plugins
    await this.initializePlugins(appMetadata.plugins || []);
  }

  private registerBuses(): void {
    // Create buses with registry access
    this.commandBus = new InMemoryCommandBus(this.container, this.registry);
    this.queryBus = new InMemoryQueryBus(this.container, this.registry);
    this.eventBus = new InMemoryEventBus(this.container, this.registry);

    // Register in DI container
    this.container.registerInstance('CommandBus', this.commandBus);
    this.container.registerInstance('QueryBus', this.queryBus);
    this.container.registerInstance('EventBus', this.eventBus);

    // Also register by interface tokens
    this.container.registerInstance(CORE_TOKENS.CommandBus, this.commandBus);
    this.container.registerInstance(CORE_TOKENS.QueryBus, this.queryBus);
    this.container.registerInstance(CORE_TOKENS.EventBus, this.eventBus);
  }

  private async registerContexts(contexts: ClassConstructor[]): Promise<void> {
    for (const contextClass of contexts) {
      await this.registerContext(contextClass);
    }
  }

  private async registerContext(contextClass: ClassConstructor): Promise<void> {
    const contextMetadata = this.registry.getContextMetadata(contextClass);

    if (!contextMetadata) {
      throw new StratixError(
        Error.MISSING_METADATA,
        `No @Context metadata found for ${contextClass.name}`
      );
    }

    // Register all command handlers
    if (contextMetadata.commandHandlers) {
      for (const handlerClass of contextMetadata.commandHandlers) {
        this.registerCommandHandler(handlerClass);
      }
    }

    // Register all query handlers
    if (contextMetadata.queryHandlers) {
      for (const handlerClass of contextMetadata.queryHandlers) {
        this.registerQueryHandler(handlerClass);
      }
    }

    // Register all event handlers
    if (contextMetadata.eventHandlers) {
      for (const handlerClass of contextMetadata.eventHandlers) {
        this.registerEventHandler(handlerClass);
      }
    }

    // Register repositories
    if (contextMetadata.repositories) {
      for (const repoClass of contextMetadata.repositories) {
        this.container.registerClass(repoClass.name, repoClass);
      }
    }

    // Initialize context if it has lifecycle
    if (contextMetadata.hasLifecycle) {
      const contextInstance = this.container.resolve(contextClass.name);
      if (typeof contextInstance.initialize === 'function') {
        await contextInstance.initialize();
      }
    }
  }

  private registerCommandHandler(handlerClass: ClassConstructor): void {
    // Verify handler is registered in metadata
    const commandClass = this.registry.getCommandForHandler(handlerClass);
    if (!commandClass) {
      throw new StratixError(
        Error.MISSING_METADATA,
        `Command handler ${handlerClass.name} not decorated with @CommandHandler`
      );
    }

    // Register in DI container
    this.container.registerClass(handlerClass.name, handlerClass, {
      lifetime: 'SCOPED', // New instance per request
    });
  }

  private registerQueryHandler(handlerClass: ClassConstructor): void {
    const queryClass = this.registry.getQueryForHandler(handlerClass);
    if (!queryClass) {
      throw new StratixError(
        Error.MISSING_METADATA,
        `Query handler ${handlerClass.name} not decorated with @QueryHandler`
      );
    }

    this.container.registerClass(handlerClass.name, handlerClass, {
      lifetime: 'SCOPED',
    });
  }

  private registerEventHandler(handlerClass: ClassConstructor): void {
    // Event handlers can be registered multiple times (one per event)
    this.container.registerClass(handlerClass.name, handlerClass, {
      lifetime: 'SCOPED',
    });
  }

  private registerCoreServices(): void {
    // Register logger
    const logger = LoggerBuilder.production().build();
    this.container.registerInstance(CORE_TOKENS.Logger, logger);
    this.container.registerInstance('Logger', logger);
  }

  private async initializeConfiguration(
    configOptions?: ConfigurationOptions
  ): Promise<void> {
    const sources: ConfigurationSource[] = configOptions?.sources || [];

    // Add environment variables by default
    if (configOptions?.envPrefix) {
      sources.unshift(
        new EnvironmentConfigurationSource({ prefix: configOptions.envPrefix })
      );
    }

    // Add config file if specified
    if (configOptions?.configFile) {
      sources.unshift(
        new YamlConfigurationSource({ filePath: configOptions.configFile })
      );
    }

    // Create configuration manager
    const configManager = new ConfigurationManager(sources);
    await configManager.load();

    this.config = configManager;
    this.container.registerInstance(CORE_TOKENS.Configuration, configManager);
  }

  private async initializePlugins(plugins: PluginClass[]): Promise<void> {
    for (const PluginClass of plugins) {
      const plugin = new PluginClass();

      const context: PluginContext = {
        container: this.container,
        config: this.config,
        logger: this.container.resolve(CORE_TOKENS.Logger),
      };

      await plugin.initialize(context);
      await plugin.start?.();

      // Store for shutdown
      this.plugins.push(plugin);
    }
  }

  async shutdown(): Promise<void> {
    // Stop plugins in reverse order
    for (const plugin of this.plugins.reverse()) {
      await plugin.stop?.();
    }

    // Dispose DI container
    await this.container.dispose();

    // Clear registry (optional - helps with memory)
    this.registry.clear();
  }

  resolve<T>(token: string | symbol): T {
    return this.container.resolve<T>(token);
  }

  createScope(): Container {
    return this.container.createScope();
  }
}
```

### 5. Type-Safe Command Bus Implementation

**Use registry for fast O(1) handler lookup.**

```typescript
export class InMemoryCommandBus implements CommandBus {
  constructor(
    private readonly container: Container,
    private readonly registry: MetadataRegistry
  ) {}

  async dispatch<TResult = void>(command: Command): Promise<TResult> {
    const commandClass = command.constructor as ClassConstructor;

    // O(1) lookup using registry
    const handlerClass = this.registry.getHandlerForCommand(commandClass);

    if (!handlerClass) {
      throw new StratixError(
        Error.HANDLER_NOT_FOUND,
        `No handler registered for command: ${commandClass.name}`
      );
    }

    // Create scope for this command (isolated dependencies)
    const scope = this.container.createScope();

    try {
      // Resolve handler from scope
      const handler = scope.resolve<CommandHandler<Command, TResult>>(
        handlerClass.name
      );

      // Execute with type safety
      const result = await handler.handle(command);

      return result;
    } finally {
      // Clean up scope
      await scope.dispose();
    }
  }
}

// Same pattern for QueryBus
export class InMemoryQueryBus implements QueryBus {
  constructor(
    private readonly container: Container,
    private readonly registry: MetadataRegistry
  ) {}

  async execute<TResult = unknown>(query: Query): Promise<TResult> {
    const queryClass = query.constructor as ClassConstructor;
    const handlerClass = this.registry.getHandlerForQuery(queryClass);

    if (!handlerClass) {
      throw new StratixError(
        Error.HANDLER_NOT_FOUND,
        `No handler registered for query: ${queryClass.name}`
      );
    }

    const scope = this.container.createScope();

    try {
      const handler = scope.resolve<QueryHandler<Query, TResult>>(handlerClass.name);
      return await handler.handle(query);
    } finally {
      await scope.dispose();
    }
  }
}

// EventBus handles multiple handlers per event
export class InMemoryEventBus implements EventBus {
  constructor(
    private readonly container: Container,
    private readonly registry: MetadataRegistry
  ) {}

  async publish(event: Event): Promise<void> {
    const eventClass = event.constructor as ClassConstructor;
    const handlerClasses = this.registry.getHandlersForEvent(eventClass);

    if (handlerClasses.length === 0) {
      // No handlers - just return (events can have zero subscribers)
      return;
    }

    const scope = this.container.createScope();

    try {
      // Resolve all handlers
      const handlers = handlerClasses.map((handlerClass) =>
        scope.resolve<EventHandler<Event>>(handlerClass.name)
      );

      // Execute in parallel
      await Promise.all(handlers.map((handler) => handler.handle(event)));
    } finally {
      await scope.dispose();
    }
  }

  async publishAll(events: Event[]): Promise<void> {
    // Publish sequentially to maintain order
    for (const event of events) {
      await this.publish(event);
    }
  }
}
```

### 6. Enhanced Context Decorator

**Support full DDD bounded context structure.**

```typescript
export interface ContextOptions {
  // Handlers
  commandHandlers?: ClassConstructor[];
  queryHandlers?: ClassConstructor[];
  eventHandlers?: ClassConstructor[];

  // Domain infrastructure
  repositories?: ClassConstructor[];

  // Services
  domainServices?: ClassConstructor[];
  applicationServices?: ClassConstructor[];

  // Lifecycle
  hasLifecycle?: boolean; // Does context implement initialize/start/stop?

  // Dependencies
  imports?: ClassConstructor[]; // Other contexts this depends on
}

export function Context(options: ContextOptions = {}) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext
  ) {
    if (context.kind !== 'class') {
      throw new Error('@Context can only be applied to classes');
    }

    const metadata: ContextMetadata = {
      contextClass: target,
      commandHandlers: options.commandHandlers || [],
      queryHandlers: options.queryHandlers || [],
      eventHandlers: options.eventHandlers || [],
      repositories: options.repositories || [],
      domainServices: options.domainServices || [],
      applicationServices: options.applicationServices || [],
      hasLifecycle: options.hasLifecycle || false,
      imports: options.imports || [],
    };

    context.addInitializer(() => {
      const registry = DecoratorRegistry.getActiveRegistry();
      if (registry) {
        registry.registerContext(target, metadata);
      }
    });

    return target;
  };
}

// Usage
@Context({
  commandHandlers: [CreateUserCommandHandler, DeleteUserCommandHandler],
  queryHandlers: [GetUserQueryHandler, ListUsersQueryHandler],
  eventHandlers: [UserCreatedEventHandler, UserDeletedEventHandler],
  repositories: [UserRepository],
  domainServices: [UserDomainService],
  applicationServices: [UserApplicationService],
  hasLifecycle: true,
})
export class UserContext implements ContextLifecycle {
  async initialize(): Promise<void> {
    // Setup context
  }

  async start(): Promise<void> {
    // Start background tasks
  }

  async stop(): Promise<void> {
    // Cleanup
  }
}
```

### 7. Auto-Discovery Option

**Optional: Scan filesystem for decorated classes.**

```typescript
export interface AutoDiscoveryOptions {
  // Directories to scan
  scanPaths: string[];

  // File patterns
  include?: string[]; // Default: ['**/*.ts', '**/*.js']
  exclude?: string[]; // Default: ['**/*.test.ts', '**/*.spec.ts', '**/node_modules/**']

  // What to discover
  discover?: {
    handlers?: boolean; // Default: true
    contexts?: boolean; // Default: true
    repositories?: boolean; // Default: true
  };
}

export class AutoDiscovery {
  constructor(private options: AutoDiscoveryOptions) {}

  async scan(): Promise<{
    handlers: ClassConstructor[];
    contexts: ClassConstructor[];
    repositories: ClassConstructor[];
  }> {
    // Implementation would use glob + dynamic import
    // This is advanced feature - can be added later
  }
}

// Usage
@StratixApp({
  name: 'MyApp',
  autoDiscovery: {
    scanPaths: ['./src/contexts/**'],
    discover: {
      handlers: true,
      contexts: true,
    },
  },
})
export class MyApp {}
```

### 8. Multi-App Example

**With instance-based registries, multiple apps work seamlessly.**

```typescript
// App 1
@StratixApp({ name: 'UserService', port: 3000 })
export class UserServiceApp {}

@Context({
  commandHandlers: [CreateUserCommandHandler],
})
export class UserContext {}

// App 2
@StratixApp({ name: 'OrderService', port: 3001 })
export class OrderServiceApp {}

@Context({
  commandHandlers: [CreateOrderCommandHandler],
})
export class OrderContext {}

// Both in same process - fully isolated
async function main() {
  const userApp = await bootstrap(UserServiceApp);
  const orderApp = await bootstrap(OrderServiceApp);

  // Each has its own registry, container, buses
  // No cross-contamination

  await userApp.start();
  await orderApp.start();
}
```

### 9. Testing Support

**Isolated test contexts with clean slate.**

```typescript
describe('CreateUserCommandHandler', () => {
  let app: StratixApplication;
  let commandBus: CommandBus;

  beforeEach(async () => {
    // Each test gets fresh app with isolated registry
    @StratixApp({
      name: 'TestApp',
      contexts: [TestUserContext],
    })
    class TestApp {}

    app = await bootstrap(TestApp);
    commandBus = app.resolve(CORE_TOKENS.CommandBus);
  });

  afterEach(async () => {
    // Complete cleanup
    await app.shutdown();
  });

  it('should create user', async () => {
    const command = new CreateUserCommand('john', 'john@example.com');
    await commandBus.dispatch(command);

    // Assertions...
  });
});

// No shared state between tests
// No flaky tests from previous test state
// Each test is truly isolated
```

### 10. Advanced Type Safety Features

**Leverage TypeScript's type system for compile-time guarantees.**

```typescript
// Type-safe command bus with return types
interface TypedCommandBus {
  dispatch<TCommand extends Command, TResult>(
    command: TCommand
  ): Promise<TResult>;
}

// Infer result type from handler
type CommandResult<THandler> =
  THandler extends CommandHandler<any, infer R> ? R : never;

// Usage with type inference
class CreateUserCommand implements Command {
  constructor(public username: string, public email: string) {}
}

class CreateUserCommandHandler implements CommandHandler<CreateUserCommand, User> {
  async handle(command: CreateUserCommand): Promise<User> {
    return new User(/* ... */);
  }
}

// Type-safe dispatch
const command = new CreateUserCommand('john', 'john@example.com');
const user: User = await commandBus.dispatch(command); // ✅ Type inferred correctly

// ❌ Compile error: wrong type
const wrong: string = await commandBus.dispatch(command);
```

**Brand types for handler registration:**

```typescript
// Branded handler type prevents wrong registrations
type RegisteredCommandHandler<TCommand extends Command, TResult> =
  CommandHandler<TCommand, TResult> & { __brand: 'registered' };

// Only registered handlers can be used
function registerHandler<TCommand extends Command, TResult>(
  commandClass: new (...args: any[]) => TCommand,
  handler: CommandHandler<TCommand, TResult>
): RegisteredCommandHandler<TCommand, TResult> {
  // Registration logic
  return handler as RegisteredCommandHandler<TCommand, TResult>;
}
```

### 11. Performance Optimizations

**Lazy loading and caching strategies.**

```typescript
export class MetadataRegistry {
  // Cache for expensive lookups
  private lookupCache = new Map<string, ClassConstructor>();

  getHandlerForCommand(commandClass: ClassConstructor): ClassConstructor | undefined {
    // Try cache first
    const cacheKey = `cmd:${commandClass.name}`;
    const cached = this.lookupCache.get(cacheKey);
    if (cached) return cached;

    // Compute
    const handler = this.commandToHandler.get(commandClass);

    // Cache for next time
    if (handler) {
      this.lookupCache.set(cacheKey, handler);
    }

    return handler;
  }

  // Invalidate cache when registry changes
  private invalidateCache(): void {
    this.lookupCache.clear();
  }
}

// Lazy handler instantiation
export class InMemoryCommandBus {
  private handlerCache = new WeakMap<ClassConstructor, any>();

  async dispatch<TResult>(command: Command): Promise<TResult> {
    const handlerClass = this.registry.getHandlerForCommand(command.constructor);

    // Try cached instance (for singleton handlers)
    let handler = this.handlerCache.get(handlerClass);

    if (!handler) {
      handler = this.container.resolve(handlerClass.name);
      // Cache if singleton lifetime
      this.handlerCache.set(handlerClass, handler);
    }

    return await handler.handle(command);
  }
}
```

## Implementation Phases

### Phase 1: Core Metadata System (Week 1-2)
- [ ] Implement `MetadataRegistry` with bidirectional mappings
- [ ] Implement `DecoratorRegistry` coordination layer
- [ ] Update all decorators to use new system
- [ ] Add comprehensive validation
- [ ] Write unit tests for metadata system

### Phase 2: Type-Safe Handlers (Week 2-3)
- [ ] Add type constraints to handler decorators
- [ ] Implement type-safe buses
- [ ] Add compile-time interface checks
- [ ] Write integration tests

### Phase 3: Application Lifecycle (Week 3-4)
- [ ] Refactor `StratixApplication` with registry injection
- [ ] Implement proper bus registration
- [ ] Add configuration management
- [ ] Add plugin lifecycle
- [ ] Write E2E tests

### Phase 4: Multi-App Support (Week 4-5)
- [ ] Test multi-app scenarios
- [ ] Add app isolation tests
- [ ] Document multi-app patterns
- [ ] Create example multi-app project

### Phase 5: Advanced Features (Week 5-6)
- [ ] Implement enhanced Context decorator
- [ ] Add auto-discovery (optional)
- [ ] Add performance optimizations
- [ ] Add observability hooks
- [ ] Comprehensive documentation

### Phase 6: Migration Path (Week 6-7)
- [ ] Create migration guide from current implementation
- [ ] Add deprecation warnings
- [ ] Provide codemods if possible
- [ ] Update all examples
- [ ] Update documentation

## Breaking Changes

### From Current Implementation

1. **MetadataStorage → MetadataRegistry**
   - No longer static
   - Injected per application
   - Different API surface

2. **Handler Interface**
   - Must implement `handle()` not `execute()`
   - Must be async
   - Must return `Promise<TResult>`

3. **Decorator Signatures**
   - Type constraints added
   - Different registration mechanism

4. **Bootstrap Process**
   - Registry creation is automatic
   - Decorator coordination is transparent

### Migration Example

**Before:**
```typescript
@CommandHandler({ commandClass: CreateUserCommand })
export class CreateUserCommandHandler {
  execute(command: CreateUserCommand) {
    console.log('Creating user');
  }
}
```

**After:**
```typescript
@CommandHandler(CreateUserCommand)
export class CreateUserCommandHandler implements CommandHandler<CreateUserCommand, void> {
  async handle(command: CreateUserCommand): Promise<void> {
    console.log('Creating user');
  }
}
```

## Benefits Summary

### Strong Type Safety
- ✅ Compile-time handler interface validation
- ✅ Type-safe command/query dispatch
- ✅ Inferred result types
- ✅ No runtime type errors

### Multi-App Support
- ✅ Isolated registries per app
- ✅ No shared state
- ✅ Run multiple apps in same process
- ✅ True microservices architecture

### Robust Metadata
- ✅ Bidirectional mappings (O(1) lookups)
- ✅ Validation at startup
- ✅ No missing connections
- ✅ Clear error messages

### Testability
- ✅ Isolated test contexts
- ✅ No flaky tests
- ✅ Easy mocking
- ✅ Fast test execution

### Performance
- ✅ Zero overhead abstractions
- ✅ Lazy loading
- ✅ Caching strategies
- ✅ Efficient lookups

### Developer Experience
- ✅ Clear error messages
- ✅ Compile-time safety
- ✅ Auto-completion
- ✅ Great documentation

## Open Questions

1. **Auto-discovery**: Should it be built-in or plugin? Performance impact?
2. **Handler lifetimes**: Should handlers be singleton, scoped, or transient by default?
3. **Nested contexts**: Should contexts be able to nest/compose?
4. **Cross-context communication**: How should contexts communicate? Events only?
5. **Hot reload**: Should framework support hot module replacement?
6. **Observability**: What metrics/traces should be built-in?

## References

- NestJS: Decorator-based architecture inspiration
- MediatR (.NET): CQRS bus patterns
- Spring Framework: DI container patterns
- TypeScript Handbook: Decorator metadata, type constraints
- Domain-Driven Design (Eric Evans): Bounded contexts, aggregates

## Appendix: Complete Example

```typescript
// domain/User.ts
export class User extends AggregateRoot<'User'> {
  constructor(
    id: EntityId<'User'>,
    public readonly username: string,
    public readonly email: Email
  ) {
    super(id, new Date(), new Date());
  }

  static create(username: string, email: string): Result<User, DomainError> {
    const emailResult = Email.create(email);
    if (emailResult.isFailure) {
      return Failure.create(emailResult.error);
    }

    const user = new User(EntityId.create<'User'>(), username, emailResult.value);
    user.record(new UserCreatedEvent(user.id.value, username, email));

    return Success.create(user);
  }
}

// application/CreateUserCommand.ts
export class CreateUserCommand implements Command {
  constructor(
    public readonly username: string,
    public readonly email: string
  ) {}
}

// application/CreateUserCommandHandler.ts
@CommandHandler(CreateUserCommand)
export class CreateUserCommandHandler
  implements CommandHandler<CreateUserCommand, Result<User, DomainError>>
{
  constructor(
    @Inject('UserRepository') private userRepository: UserRepository
  ) {}

  async handle(command: CreateUserCommand): Promise<Result<User, DomainError>> {
    // Create user
    const userResult = User.create(command.username, command.email);

    if (userResult.isFailure) {
      return userResult;
    }

    // Save
    await this.userRepository.save(userResult.value);

    // Publish events
    const events = userResult.value.pullDomainEvents();
    await this.eventBus.publishAll(events);

    return userResult;
  }
}

// infrastructure/UserRepository.ts
@Injectable()
export class UserRepository implements Repository<User, EntityId<'User'>> {
  async save(user: User): Promise<void> {
    // Implementation
  }

  async findById(id: EntityId<'User'>): Promise<User | null> {
    // Implementation
  }
}

// UserContext.ts
@Context({
  commandHandlers: [CreateUserCommandHandler],
  repositories: [UserRepository],
})
export class UserContext {}

// App.ts
@StratixApp({
  name: 'UserService',
  version: '1.0.0',
  contexts: [UserContext],
  configuration: {
    configFile: './config.yml',
    envPrefix: 'USER_SERVICE',
  },
})
export class UserServiceApp {}

// main.ts
async function main() {
  const app = await bootstrap(UserServiceApp);

  // Type-safe dispatch
  const commandBus = app.resolve<CommandBus>(CORE_TOKENS.CommandBus);
  const result = await commandBus.dispatch(
    new CreateUserCommand('john', 'john@example.com')
  );

  if (result.isSuccess) {
    console.log('User created:', result.value.id);
  } else {
    console.error('Failed:', result.error.message);
  }

  await app.shutdown();
}

main().catch(console.error);
```

## Conclusion

This architecture proposal provides a comprehensive path to making Stratix Framework:
- **Production-ready**: No runtime errors, robust validation
- **Type-safe**: Compile-time guarantees, excellent DX
- **Scalable**: Multi-app support, performance optimizations
- **Testable**: Isolated contexts, no flaky tests
- **Maintainable**: Clear architecture, great documentation

The implementation can be done incrementally over 6-7 weeks, with each phase providing value independently.
