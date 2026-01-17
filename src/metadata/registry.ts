/**
 * Central type registry mapping metadata key strings to their value types.
 * Use declaration merging to extend with custom metadata types.
 *
 * @example
 * // In your module
 * declare module '@stratix/framework' {
 *   interface MetadataTypeMap {
 *     'my-custom': MyCustomMetadata;
 *   }
 * }
 */

import { ConfigurationSource } from '../configuration/ConfigurationSource.js';

type ClassConstructor = new (...args: any[]) => any;

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
  readonly configuration: AppConfigurationMetadata;
  readonly di: AppDIMetadata;
  readonly contexts: readonly ClassConstructor[];
}

export interface AppConfigurationMetadata {
  readonly sources: readonly (new (...args: any[]) => ConfigurationSource)[];
  readonly configFile: string;
  readonly envPrefix: string;
}

export interface AppDIMetadata {
  readonly strict: boolean;
}

export interface ContextMetadata {
  readonly contextClass: ClassConstructor;
  readonly commandHandlers: readonly ClassConstructor[];
  readonly queryHandlers: readonly ClassConstructor[];
  readonly eventHandlers: readonly ClassConstructor[];
  readonly providers: readonly ClassConstructor[];
}

export interface CommandHandlerMetadata {
  readonly handlerClass: ClassConstructor;
  readonly commandClass: ClassConstructor;
}

export interface QueryHandlerMetadata {
  readonly handlerClass: ClassConstructor;
  readonly queryClass: ClassConstructor;
}

export interface EventHandlerMetadata {
  readonly handlerClass: ClassConstructor;
  readonly eventClasses: readonly ClassConstructor[];
}

export interface InjectableMetadata {
  readonly scope: 'singleton' | 'transient' | 'scoped';
  readonly token?: string | symbol;
}

export interface ModuleMetadata {
  readonly imports: readonly ClassConstructor[];
  readonly exports: readonly ClassConstructor[];
  readonly providers: readonly ClassConstructor[];
}
