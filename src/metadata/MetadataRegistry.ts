import { DecoratorMissingError } from '../core/errors/DecoratorMissingError.js';
import { ClassConstructorType } from '../core/types/UtilityTypes.js';
import { Metadata } from './Metadata.js';
import { MetadataKeys } from './keys.js';
import { AppMetadata, ContextMetadata } from './registry.js';

export class MetadataRegistry {
  public readonly appClass: ClassConstructorType;
  public readonly appMetadata: AppMetadata;

  // Handler mappings
  public readonly commandToHandler = new Map<ClassConstructorType, ClassConstructorType>();
  public readonly handlerToCommand = new Map<ClassConstructorType, ClassConstructorType>();
  public readonly queryToHandler = new Map<ClassConstructorType, ClassConstructorType>();
  public readonly eventToHandlers = new Map<ClassConstructorType, ClassConstructorType[]>();

  // Context tracking
  public readonly contexts = new Map<ClassConstructorType, ContextMetadata>();

  constructor({ appClass }: { appClass: ClassConstructorType }) {
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

  private processContext(contextClass: ClassConstructorType): void {
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

  private processCommandHandlers(handlers: readonly ClassConstructorType[]): void {
    for (const handlerClass of handlers) {
      const metadata = Metadata.get(handlerClass, MetadataKeys.CommandHandler);

      if (!metadata) {
        throw new DecoratorMissingError('@CommandHandler', handlerClass.name);
      }

      this.commandToHandler.set(metadata.commandClass, metadata.handlerClass);
      this.handlerToCommand.set(metadata.handlerClass, metadata.commandClass);
    }
  }

  private processQueryHandlers(handlers: readonly ClassConstructorType[]): void {
    for (const handlerClass of handlers) {
      const metadata = Metadata.get(handlerClass, MetadataKeys.QueryHandler);

      if (!metadata) {
        throw new DecoratorMissingError('@QueryHandler', handlerClass.name);
      }

      this.queryToHandler.set(metadata.queryClass, metadata.handlerClass);
    }
  }

  private processEventHandlers(handlers: readonly ClassConstructorType[]): void {
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

  getHandlerForCommand(commandClass: ClassConstructorType): ClassConstructorType | undefined {
    return this.commandToHandler.get(commandClass);
  }

  getHandlerForQuery(queryClass: ClassConstructorType): ClassConstructorType | undefined {
    return this.queryToHandler.get(queryClass);
  }

  getHandlersForEvent(eventClass: ClassConstructorType): ClassConstructorType[] {
    return this.eventToHandlers.get(eventClass) ?? [];
  }
}
