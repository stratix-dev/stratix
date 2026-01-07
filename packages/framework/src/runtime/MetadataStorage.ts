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
  Buses
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
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  target: Ctor;
}

type Ctor = ClassConstructor;

export class MetadataStorage {
  private static app = new WeakMap<Ctor, StratixAppMetadata>();
  private static context = new WeakMap<Ctor, ContextMetadata>();
  private static plugin = new WeakMap<Ctor, PluginMetadata>();
  private static commandHandler = new WeakMap<Ctor, Ctor>();
  private static queryHandler = new WeakMap<Ctor, Ctor>();
  private static eventHandler = new WeakMap<Ctor, EventHandlerMetadata<Event>>();
  private static loggers = new WeakMap<Ctor, LoggerMetadata[]>();

  static setAppMetadata(target: Ctor, metadata: StratixAppMetadata) {
    this.app.set(target, metadata);
  }

  static getAppMetadata(target: Ctor) {
    return this.app.get(target);
  }

  static setPluginMetadata(target: Ctor, metadata: PluginMetadata) {
    this.plugin.set(target, metadata);
  }

  static getPluginMetadata(target: Ctor) {
    return this.plugin.get(target);
  }

  static setContextMetadata(target: Ctor, metadata: ContextMetadata) {
    this.context.set(target, metadata);
  }

  static getContextMetadata(target: Ctor) {
    return this.context.get(target);
  }

  static setCommandHandler<T extends Command>(
    target: Ctor,
    commandType: new (...args: any[]) => T
  ) {
    this.commandHandler.set(target, commandType);
  }

  static getCommandHandler<T extends Command>(target: Ctor) {
    return this.commandHandler.get(target) as (new (...args: any[]) => T) | undefined;
  }

  static setQueryHandler<T extends Query>(target: Ctor, queryType: new (...args: any[]) => T) {
    this.queryHandler.set(target, queryType);
  }

  static getQueryHandler<T extends Query>(target: Ctor) {
    return this.queryHandler.get(target) as (new (...args: any[]) => T) | undefined;
  }

  static setEventHandler<TEvent extends Event>(
    target: Ctor,
    metadata: EventHandlerMetadata<TEvent>
  ) {
    this.eventHandler.set(target, metadata);
  }

  static getEventHandler(target: Ctor): EventHandlerMetadata<Event> | undefined {
    return this.eventHandler.get(target);
  }

  static addLoggerMetadata(target: Ctor, metadata: LoggerMetadata) {
    const existing = this.loggers.get(target) ?? [];
    existing.push(metadata);
    this.loggers.set(target, existing);
  }

  static getLoggerMetadata(target: Ctor): LoggerMetadata[] | undefined {
    return this.loggers.get(target);
  }

  static getAllLoggerMetadata(): Map<Ctor, LoggerMetadata[]> {
    const result = new Map<Ctor, LoggerMetadata[]>();
    // WeakMap doesn't support iteration, so this is a placeholder
    // In practice, you'd track registered classes separately
    return result;
  }
}
