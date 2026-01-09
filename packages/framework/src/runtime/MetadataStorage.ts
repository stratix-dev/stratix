import type {
  ContextMetadata,
  Context,
  PluginMetadata,
  Query,
  Command,
  EventHandlerMetadata,
  Plugin,
  ClassConstructor,
  Event,
  Buses,
  DependencyLifetime
} from '@stratix/core';

export interface StratixAppMetadata {
  name?: string;
  version?: string;
  contexts?: Array<Context>;
  plugins?: Array<Plugin>;
  buses?: Array<Buses>;
}

export interface LoggerMetadata {
  propertyKey: string;
  context: string;
  minLevel?: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  target: Ctor;
}

export interface CommandHandlerMetadata {
  commandName: string;
  commandType?: Ctor;
}

export interface QueryHandlerMetadata {
  queryName: string;
  queryType?: Ctor;
}

export interface InjectableMetadata {
  name?: string;
  lifetime?: DependencyLifetime;
}

/**
 * Extended EventHandlerMetadata for framework use.
 * Includes eventName for reverse lookup in addition to eventType from core.
 */
export interface ExtendedEventHandlerMetadata<TEvent extends Event = Event>
  extends EventHandlerMetadata<TEvent> {
  eventName?: string;
}

type Ctor = ClassConstructor;

/**
 * Centralized metadata storage for decorator-based metadata.
 *
 * Uses Map (not WeakMap) to support:
 * - Auto-discovery of decorated classes
 * - Iteration for bootstrap
 * - Reverse lookups by name
 * - Debugging and introspection
 *
 * Memory management: Class constructors are static assets and persist
 * for the application lifetime, so WeakMap's GC benefits don't apply.
 */
export class MetadataStorage {
  // Storage maps (changed from WeakMap to Map for iteration support)
  private static app = new Map<Ctor, StratixAppMetadata>();
  private static context = new Map<Ctor, ContextMetadata>();
  private static plugin = new Map<Ctor, PluginMetadata>();
  private static commandHandler = new Map<Ctor, CommandHandlerMetadata>();
  private static queryHandler = new Map<Ctor, QueryHandlerMetadata>();
  private static eventHandler = new Map<Ctor, ExtendedEventHandlerMetadata>();
  private static loggers = new Map<Ctor, LoggerMetadata[]>();
  private static injectable = new Map<Ctor, InjectableMetadata>();

  // ===========================
  // App Metadata
  // ===========================

  static setAppMetadata(target: Ctor, metadata: StratixAppMetadata): void {
    this.app.set(target, metadata);
  }

  static getAppMetadata(target: Ctor): StratixAppMetadata | undefined {
    return this.app.get(target);
  }

  // ===========================
  // Plugin Metadata
  // ===========================

  static setPluginMetadata(target: Ctor, metadata: PluginMetadata): void {
    this.plugin.set(target, metadata);
  }

  static getPluginMetadata(target: Ctor): PluginMetadata | undefined {
    return this.plugin.get(target);
  }

  static getAllPlugins(): Map<Ctor, PluginMetadata> {
    return new Map(this.plugin);
  }

  // ===========================
  // Context Metadata
  // ===========================

  static setContextMetadata(target: Ctor, metadata: ContextMetadata): void {
    this.context.set(target, metadata);
  }

  static getContextMetadata(target: Ctor): ContextMetadata | undefined {
    return this.context.get(target);
  }

  static getAllContexts(): Map<Ctor, ContextMetadata> {
    return new Map(this.context);
  }

  // ===========================
  // Command Handler Metadata
  // ===========================

  static setCommandHandlerMetadata(target: Ctor, metadata: CommandHandlerMetadata): void {
    this.commandHandler.set(target, metadata);
  }

  static getCommandHandlerMetadata(target: Ctor): CommandHandlerMetadata | undefined {
    return this.commandHandler.get(target);
  }

  static getAllCommandHandlers(): Map<Ctor, CommandHandlerMetadata> {
    return new Map(this.commandHandler);
  }

  static getCommandHandlerByName(commandName: string): Ctor | undefined {
    for (const [ctor, metadata] of this.commandHandler) {
      if (metadata.commandName === commandName) {
        return ctor;
      }
    }
    return undefined;
  }

  // Legacy method for compatibility
  static setCommandHandler<T extends Command>(
    target: Ctor,
    commandType: new (...args: any[]) => T
  ): void {
    this.setCommandHandlerMetadata(target, {
      commandName: commandType.name,
      commandType: commandType
    });
  }

  static getCommandHandler<T extends Command>(target: Ctor): (new (...args: any[]) => T) | undefined {
    const metadata = this.commandHandler.get(target);
    return metadata?.commandType as (new (...args: any[]) => T) | undefined;
  }

  // ===========================
  // Query Handler Metadata
  // ===========================

  static setQueryHandlerMetadata(target: Ctor, metadata: QueryHandlerMetadata): void {
    this.queryHandler.set(target, metadata);
  }

  static getQueryHandlerMetadata(target: Ctor): QueryHandlerMetadata | undefined {
    return this.queryHandler.get(target);
  }

  static getAllQueryHandlers(): Map<Ctor, QueryHandlerMetadata> {
    return new Map(this.queryHandler);
  }

  static getQueryHandlerByName(queryName: string): Ctor | undefined {
    for (const [ctor, metadata] of this.queryHandler) {
      if (metadata.queryName === queryName) {
        return ctor;
      }
    }
    return undefined;
  }

  // Legacy method for compatibility
  static setQueryHandler<T extends Query>(target: Ctor, queryType: new (...args: any[]) => T): void {
    this.setQueryHandlerMetadata(target, {
      queryName: queryType.name,
      queryType: queryType
    });
  }

  static getQueryHandler<T extends Query>(target: Ctor): (new (...args: any[]) => T) | undefined {
    const metadata = this.queryHandler.get(target);
    return metadata?.queryType as (new (...args: any[]) => T) | undefined;
  }

  // ===========================
  // Event Handler Metadata
  // ===========================

  static setEventHandlerMetadata<TEvent extends Event>(
    target: Ctor,
    metadata: ExtendedEventHandlerMetadata<TEvent>
  ): void {
    this.eventHandler.set(target, metadata);
  }

  static getEventHandlerMetadata(target: Ctor): ExtendedEventHandlerMetadata | undefined {
    return this.eventHandler.get(target);
  }

  static getAllEventHandlers(): Map<Ctor, ExtendedEventHandlerMetadata> {
    return new Map(this.eventHandler);
  }

  static getEventHandlersByName(eventName: string): Ctor[] {
    const handlers: Ctor[] = [];
    for (const [ctor, metadata] of this.eventHandler) {
      if (metadata.eventName === eventName) {
        handlers.push(ctor);
      }
    }
    return handlers;
  }

  static getEventHandlersByType(eventType: new (...args: any[]) => Event): Ctor[] {
    const handlers: Ctor[] = [];
    for (const [ctor, metadata] of this.eventHandler) {
      if (metadata.eventType === eventType) {
        handlers.push(ctor);
      }
    }
    return handlers;
  }

  // ===========================
  // Logger Metadata
  // ===========================

  static addLoggerMetadata(target: Ctor, metadata: LoggerMetadata): void {
    const existing = this.loggers.get(target) ?? [];
    existing.push(metadata);
    this.loggers.set(target, existing);
  }

  static getLoggerMetadata(target: Ctor): LoggerMetadata[] | undefined {
    return this.loggers.get(target);
  }

  static getAllLoggerMetadata(): Map<Ctor, LoggerMetadata[]> {
    return new Map(this.loggers);
  }

  // ===========================
  // Injectable Metadata
  // ===========================

  static setInjectableMetadata(target: Ctor, metadata: InjectableMetadata): void {
    this.injectable.set(target, metadata);
  }

  static getInjectableMetadata(target: Ctor): InjectableMetadata | undefined {
    return this.injectable.get(target);
  }

  static getAllInjectables(): Map<Ctor, InjectableMetadata> {
    return new Map(this.injectable);
  }

  // ===========================
  // Utility Methods
  // ===========================

  /**
   * Clear all metadata. Useful for testing or hot-reload scenarios.
   */
  static clear(): void {
    this.app.clear();
    this.context.clear();
    this.plugin.clear();
    this.commandHandler.clear();
    this.queryHandler.clear();
    this.eventHandler.clear();
    this.loggers.clear();
    this.injectable.clear();
  }

  /**
   * Get count of all registered metadata entries
   */
  static getStats(): {
    apps: number;
    contexts: number;
    plugins: number;
    commandHandlers: number;
    queryHandlers: number;
    eventHandlers: number;
    loggers: number;
    injectables: number;
  } {
    return {
      apps: this.app.size,
      contexts: this.context.size,
      plugins: this.plugin.size,
      commandHandlers: this.commandHandler.size,
      queryHandlers: this.queryHandler.size,
      eventHandlers: this.eventHandler.size,
      loggers: this.loggers.size,
      injectables: this.injectable.size
    };
  }
}
