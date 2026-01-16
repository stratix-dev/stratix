import { ClassConstructor } from '@stratix/core';
import {
  Metadata,
  MetadataKeys,
  type AppMetadata,
  type ContextMetadata
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
