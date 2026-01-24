import { ClassConstructorType } from '../core/types/UtilityTypes.js';

export interface MetadataTypeMap {
  app: AppMetadata;
  context: ContextMetadata;
  'command-handler': CommandHandlerMetadata;
  'query-handler': QueryHandlerMetadata;
  'event-handler': EventHandlerMetadata;
  injectable: InjectableMetadata;
  module: ModuleMetadata;
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
  readonly di: AppDIMetadata;
  readonly contexts: readonly ClassConstructorType[];
}

export interface AppDIMetadata {
  readonly strict: boolean;
  readonly injectionMode: 'classic' | 'proxy';
}

export interface ContextMetadata {
  readonly name: symbol;
  readonly contextClass: ClassConstructorType;
  readonly commandHandlers: readonly ClassConstructorType[];
  readonly queryHandlers: readonly ClassConstructorType[];
  readonly eventHandlers: readonly ClassConstructorType[];
  readonly providers: readonly ClassConstructorType[];
}

export interface CommandHandlerMetadata {
  readonly handlerClass: ClassConstructorType;
  readonly commandClass: ClassConstructorType;
}

export interface QueryHandlerMetadata {
  readonly handlerClass: ClassConstructorType;
  readonly queryClass: ClassConstructorType;
}

export interface EventHandlerMetadata {
  readonly handlerClass: ClassConstructorType;
  readonly eventClasses: readonly ClassConstructorType[];
}

export interface InjectableMetadata {
  readonly scope: 'singleton' | 'transient' | 'scoped';
  readonly token?: string | symbol;
}

export interface ModuleMetadata {
  readonly imports: readonly ClassConstructorType[];
  readonly exports: readonly ClassConstructorType[];
  readonly providers: readonly ClassConstructorType[];
}
