

/**
 * Metadata for aggregates decorated with @Aggregate
 */
export interface AggregateMetadata {
  type: string;
  target: any;
  autoTimestamps?: boolean;
  autoEvents?: boolean;
  tableName?: string;
}

/**
 * Metadata for domain events decorated with @DomainEvent
 */
export interface DomainEventMetadata {
  eventName: string;
  target: any;
  methodName: string | symbol;
  isStatic: boolean;
}

/**
 * Metadata for commands decorated with @Command
 */
export interface CommandMetadata {
  target: any;
  name: string;
}

/**
 * Metadata for command handlers decorated with @CommandHandler
 */
export interface CommandHandlerMetadata {
  target: any;
  commandClass: any;
  handlerClass: any;
}

/**
 * Metadata for queries decorated with @Query
 */
export interface QueryMetadata {
  target: any;
  name: string;
}

/**
 * Metadata for query handlers decorated with @QueryHandler
 */
export interface QueryHandlerMetadata {
  target: any;
  queryClass: any;
  handlerClass: any;
}

/**
 * Metadata for event handlers decorated with @EventHandler
 */
export interface EventHandlerMetadata {
  target: any;
  handlerClass: any;
  eventMethods: Map<string, string>; // eventName -> methodName
}

/**
 * Metadata for modules decorated with @Module
 */
export interface ModuleMetadata {
  target: any;
  imports: any[];
  providers: any[];
  exports: any[];
}

/**
 * Metadata for the application decorated with @StratixApp
 */
export interface AppMetadata {
  target: any;
  modules: any[];
  plugins: any[];
}

/**
 * Metadata for plugins decorated with @Plugin
 */
export interface PluginMetadata {
  target: any;
  name: string;
  description?: string;
  version?: string;
  dependencies: string[];
}

/**
 * Metadata for validators decorated with @Validate
 */
export interface ValidatorMetadata {
  target: any;
  propertyKey: string;
  validator: (value: any) => any;
}

/**
 * Central metadata storage for all decorators.
 *
 * This is the heart of the decorator system. All decorators store
 * their metadata here, and the runtime uses it to wire everything together.
 */
export class MetadataStorage {
  private static aggregates = new Map<any, AggregateMetadata>();
  private static domainEvents = new Map<any, DomainEventMetadata[]>();
  private static commands = new Map<any, CommandMetadata>();
  private static commandHandlers = new Map<any, CommandHandlerMetadata>();
  private static queries = new Map<any, QueryMetadata>();
  private static queryHandlers = new Map<any, QueryHandlerMetadata>();
  private static eventHandlers = new Map<any, EventHandlerMetadata>();
  private static modules = new Map<any, ModuleMetadata>();
  private static apps = new Map<any, AppMetadata>();
  private static validators = new Map<any, ValidatorMetadata[]>();
  private static plugins = new Map<any, PluginMetadata>();

  // ============================================================================
  // AGGREGATES
  // ============================================================================

  static registerAggregate(target: any, metadata: AggregateMetadata): void {
    this.aggregates.set(target, metadata);
  }

  static getAggregate(target: any): AggregateMetadata | undefined {
    return this.aggregates.get(target);
  }

  static getAllAggregates(): AggregateMetadata[] {
    return Array.from(this.aggregates.values());
  }

  // ============================================================================
  // DOMAIN EVENTS
  // ============================================================================

  static registerDomainEvent(target: any, metadata: DomainEventMetadata): void {
    const existing = this.domainEvents.get(target) || [];
    existing.push(metadata);
    this.domainEvents.set(target, existing);
  }

  static getDomainEvents(target: any): DomainEventMetadata[] {
    return this.domainEvents.get(target) || [];
  }

  // ============================================================================
  // COMMANDS
  // ============================================================================

  static registerCommand(target: any, metadata: CommandMetadata): void {
    this.commands.set(target, metadata);
  }

  static getCommand(target: any): CommandMetadata | undefined {
    return this.commands.get(target);
  }

  static getAllCommands(): CommandMetadata[] {
    return Array.from(this.commands.values());
  }

  // ============================================================================
  // COMMAND HANDLERS
  // ============================================================================

  static registerCommandHandler(target: any, metadata: CommandHandlerMetadata): void {
    this.commandHandlers.set(target, metadata);
  }

  static getCommandHandler(target: any): CommandHandlerMetadata | undefined {
    return this.commandHandlers.get(target);
  }

  static getAllCommandHandlers(): CommandHandlerMetadata[] {
    return Array.from(this.commandHandlers.values());
  }

  static findCommandHandlerForCommand(commandClass: any): CommandHandlerMetadata | undefined {
    return Array.from(this.commandHandlers.values()).find(
      (handler) => handler.commandClass === commandClass
    );
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  static registerQuery(target: any, metadata: QueryMetadata): void {
    this.queries.set(target, metadata);
  }

  static getQuery(target: any): QueryMetadata | undefined {
    return this.queries.get(target);
  }

  static getAllQueries(): QueryMetadata[] {
    return Array.from(this.queries.values());
  }

  // ============================================================================
  // QUERY HANDLERS
  // ============================================================================

  static registerQueryHandler(target: any, metadata: QueryHandlerMetadata): void {
    this.queryHandlers.set(target, metadata);
  }

  static getQueryHandler(target: any): QueryHandlerMetadata | undefined {
    return this.queryHandlers.get(target);
  }

  static getAllQueryHandlers(): QueryHandlerMetadata[] {
    return Array.from(this.queryHandlers.values());
  }

  static findQueryHandlerForQuery(queryClass: any): QueryHandlerMetadata | undefined {
    return Array.from(this.queryHandlers.values()).find(
      (handler) => handler.queryClass === queryClass
    );
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  static registerEventHandler(target: any, metadata: EventHandlerMetadata): void {
    this.eventHandlers.set(target, metadata);
  }

  static getEventHandler(target: any): EventHandlerMetadata | undefined {
    return this.eventHandlers.get(target);
  }

  static getAllEventHandlers(): EventHandlerMetadata[] {
    return Array.from(this.eventHandlers.values());
  }

  static findEventHandlersForEvent(eventName: string): EventHandlerMetadata[] {
    return Array.from(this.eventHandlers.values()).filter((handler) =>
      Array.from(handler.eventMethods.keys()).includes(eventName)
    );
  }

  // ============================================================================
  // MODULES
  // ============================================================================

  static registerModule(target: any, metadata: ModuleMetadata): void {
    this.modules.set(target, metadata);
  }

  static getModule(target: any): ModuleMetadata | undefined {
    return this.modules.get(target);
  }

  static getAllModules(): ModuleMetadata[] {
    return Array.from(this.modules.values());
  }

  // ============================================================================
  // APPS
  // ============================================================================

  static registerApp(target: any, metadata: AppMetadata): void {
    this.apps.set(target, metadata);
  }

  static getApp(target: any): AppMetadata | undefined {
    return this.apps.get(target);
  }

  // ============================================================================
  // VALIDATORS
  // ============================================================================

  static registerValidator(target: any, metadata: ValidatorMetadata): void {
    const existing = this.validators.get(target) || [];
    existing.push(metadata);
    this.validators.set(target, existing);
  }

  static getValidators(target: any): ValidatorMetadata[] {
    return this.validators.get(target) || [];
  }

  // ============================================================================
  // PLUGINS
  // ============================================================================

  static registerPlugin(target: any, metadata: PluginMetadata): void {
    this.plugins.set(target, metadata);
  }

  static getPlugin(target: any): PluginMetadata | undefined {
    return this.plugins.get(target);
  }

  static getAllPlugins(): PluginMetadata[] {
    return Array.from(this.plugins.values());
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Clears all metadata. Useful for testing.
   */
  static clear(): void {
    this.aggregates.clear();
    this.domainEvents.clear();
    this.commands.clear();
    this.commandHandlers.clear();
    this.queries.clear();
    this.queryHandlers.clear();
    this.eventHandlers.clear();
    this.modules.clear();
    this.apps.clear();
    this.validators.clear();
    this.plugins.clear();
  }
}
