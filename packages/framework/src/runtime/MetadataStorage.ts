import type {
  ContextMetadata,
  PluginMetadata,
  DependencyLifetime,
  ConfigurationSource,
  ClassConstructor
} from '@stratix/core';

/* Application Metadata */
export interface StratixAppMetadata {
  name: string;
  version: string;
  services?: {
    logger?: any;
  };
  configuration?: {
    sources?: ConfigurationSource[];
    configFile?: string;
    envPrefix?: string;
  };
  behavior?: {
    strictMode?: boolean;
    developmentMode?: boolean;
  };
}
/* Dependency Injection Metadata */
export interface InjectableMetadata {
  name?: string;
  lifetime?: DependencyLifetime;
  target: ClassConstructor;
}
/* Logging Metadata */
export interface LoggerMetadata {
  propertyKey: string;
  context: string;
  minLevel?: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  target: ClassConstructor;
}

/* CQRS - Commands Metadata */
export interface CommandMetadata {
  commandName?: string;
  target?: ClassConstructor;
}

export interface CommandHandlerMetadata {
  commandName?: string;
  commandType?: ClassConstructor;
  target?: ClassConstructor;
}

/* CQRS - Queries Metadata */
export interface QueryHandlerMetadata {
  queryName?: string;
  queryType?: ClassConstructor;
}

export interface QueryMetadata {
  queryName?: string;
  queryType?: ClassConstructor;
}

/* CQRS - Events Metadata */
export interface EventHandlerMetadata {
  eventHandlerName?: string;
  eventHandlerType: ClassConstructor;
}

export interface EventMetadata {
  eventName?: string;
  eventType?: ClassConstructor;
}

export class MetadataStorage {
  private static app = new Map<ClassConstructor, StratixAppMetadata>();
  private static context = new Map<ClassConstructor, ContextMetadata>();
  private static plugin = new Map<ClassConstructor, PluginMetadata>();
  private static commandHandler = new Map<ClassConstructor, CommandHandlerMetadata>();
  private static queryHandler = new Map<ClassConstructor, QueryHandlerMetadata>();
  private static eventHandler = new Map<ClassConstructor, EventHandlerMetadata>();
  private static loggers = new Map<ClassConstructor, LoggerMetadata[]>();
  private static injectable = new Map<ClassConstructor, InjectableMetadata>();
  private static command = new Map<ClassConstructor, CommandMetadata>();
  private static event = new Map<ClassConstructor, EventMetadata>();
  private static query = new Map<ClassConstructor, QueryMetadata>();

  // App Metadata
  static setAppMetadata(target: ClassConstructor, metadata: StratixAppMetadata): void {
    this.app.set(target, metadata);
  }
  static getAppMetadata(target: ClassConstructor): StratixAppMetadata | undefined {
    return this.app.get(target);
  }
  static getAllApps(): Map<ClassConstructor, StratixAppMetadata> {
    return new Map(this.app);
  }
  static getAppMetadataByName(name: string): ClassConstructor | undefined {
    for (const [ctor, metadata] of this.app) {
      if (metadata.name === name) {
        return ctor;
      }
    }
    return undefined;
  }

  // Plugin Metadata
  static setPluginMetadata(target: ClassConstructor, metadata: PluginMetadata): void {
    this.plugin.set(target, metadata);
  }
  static getPluginMetadata(target: ClassConstructor): PluginMetadata | undefined {
    return this.plugin.get(target);
  }
  static getAllPlugins(): Map<ClassConstructor, PluginMetadata> {
    return new Map(this.plugin);
  }
  static getPluginMetadataByName(name: string): ClassConstructor | undefined {
    for (const [ctor, metadata] of this.plugin) {
      if (metadata.name === name) {
        return ctor;
      }
    }
    return undefined;
  }

  // Context Metadata
  static setContextMetadata(target: ClassConstructor, metadata: ContextMetadata): void {
    this.context.set(target, metadata);
  }
  static getContextMetadata(target: ClassConstructor): ContextMetadata | undefined {
    return this.context.get(target);
  }
  static getAllContexts(): Map<ClassConstructor, ContextMetadata> {
    return new Map(this.context);
  }
  static getContextMetadataByName(name: string): ClassConstructor | undefined {
    for (const [ctor, metadata] of this.context) {
      if (metadata.name === name) {
        return ctor;
      }
    }
    return undefined;
  }

  // Command Handler Metadata
  static setCommandHandlerMetadata(
    target: ClassConstructor,
    metadata: CommandHandlerMetadata
  ): void {
    const commandName = metadata.commandName ?? metadata.target?.name;
    if (!commandName) {
      throw new Error(
        `CommandHandler metadata must have a commandName or target with a name defined.`
      );
    }
    this.commandHandler.set(target, metadata);
  }
  static getCommandHandlerMetadata(target: ClassConstructor): CommandHandlerMetadata | undefined {
    return this.commandHandler.get(target);
  }

  static getAllCommandHandlers(): Map<ClassConstructor, CommandHandlerMetadata> {
    return new Map(this.commandHandler);
  }

  static getCommandHandlerByName(commandName: string): ClassConstructor | undefined {
    for (const [ctor, metadata] of this.commandHandler) {
      if (metadata.commandName === commandName) {
        return ctor;
      }
    }
    return undefined;
  }

  // Query Handler Metadata
  static setQueryHandlerMetadata(target: ClassConstructor, metadata: QueryHandlerMetadata): void {
    this.queryHandler.set(target, metadata);
  }
  static getQueryHandlerMetadata(target: ClassConstructor): QueryHandlerMetadata | undefined {
    return this.queryHandler.get(target);
  }
  static getAllQueryHandlers(): Map<ClassConstructor, QueryHandlerMetadata> {
    return new Map(this.queryHandler);
  }
  static getQueryHandlerByName(queryName: string): ClassConstructor | undefined {
    for (const [ctor, metadata] of this.queryHandler) {
      if (metadata.queryName === queryName) {
        return ctor;
      }
    }
    return undefined;
  }

  // Event Handler Metadata
  static setEventHandlerMetadata(
    target: new (...args: any[]) => any,
    metadata: EventHandlerMetadata
  ): void {
    this.eventHandler.set(target, metadata);
  }

  static getEventHandlerMetadata(target: ClassConstructor): EventHandlerMetadata | undefined {
    return this.eventHandler.get(target);
  }

  static getAllEventHandlers(): Map<ClassConstructor, EventHandlerMetadata> {
    return new Map(this.eventHandler);
  }

  static getEventHandlersByName(eventName: string): ClassConstructor[] {
    const handlers: ClassConstructor[] = [];

    for (const [ctor, metadata] of this.eventHandler) {
      if (metadata.eventHandlerName === eventName) {
        handlers.push(ctor);
      }
    }
    return handlers;
  }

  // Logger Metadata
  static setLoggerMetadata(target: ClassConstructor, metadata: LoggerMetadata): void {
    const existing = this.loggers.get(target) ?? [];
    existing.push(metadata);
    this.loggers.set(target, existing);
  }

  static getLoggerMetadata(target: ClassConstructor): LoggerMetadata[] | undefined {
    return this.loggers.get(target);
  }

  static getAllLoggerMetadata(): Map<ClassConstructor, LoggerMetadata[]> {
    return new Map(this.loggers);
  }

  // Injectable Metadata
  static setInjectableMetadata(target: ClassConstructor, metadata: InjectableMetadata): void {
    this.injectable.set(target, metadata);
  }

  static getInjectableMetadata(target: ClassConstructor): InjectableMetadata | undefined {
    return this.injectable.get(target);
  }

  static getAllInjectables(): Map<ClassConstructor, InjectableMetadata> {
    return new Map(this.injectable);
  }

  // CQRS - Command Metadata
  static setCommandMetadata(target: ClassConstructor, metadata: CommandMetadata): void {
    this.command.set(target, metadata);
  }

  static getCommandMetadata(target: ClassConstructor): CommandMetadata | undefined {
    return this.command.get(target);
  }

  static getAllCommands(): Map<ClassConstructor, CommandMetadata> {
    return new Map(this.command);
  }

  // CQRS - Event Metadata
  static setEventMetadata(target: ClassConstructor, metadata: EventMetadata): void {
    this.event.set(target, metadata);
  }

  static getEventMetadata(target: ClassConstructor): EventMetadata | undefined {
    return this.event.get(target);
  }

  static getAllEvents(): Map<ClassConstructor, EventMetadata> {
    return new Map(this.event);
  }

  // CQRS - Query Metadata
  static setQueryMetadata(target: ClassConstructor, metadata: QueryMetadata): void {
    this.query.set(target, metadata);
  }

  static getQueryMetadata(target: ClassConstructor): QueryMetadata | undefined {
    return this.query.get(target);
  }

  static getAllQueries(): Map<ClassConstructor, QueryMetadata> {
    return new Map(this.query);
  }

  // Utility Methods
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
    this.command.clear();
    this.event.clear();
    this.query.clear();
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
    commands: number;
    events: number;
    queries: number;
  } {
    return {
      apps: this.app.size,
      contexts: this.context.size,
      plugins: this.plugin.size,
      commandHandlers: this.commandHandler.size,
      queryHandlers: this.queryHandler.size,
      eventHandlers: this.eventHandler.size,
      loggers: this.loggers.size,
      injectables: this.injectable.size,
      commands: this.command.size,
      events: this.event.size,
      queries: this.query.size
    };
  }
}
