import { ClassConstructor, ConfigurationSource } from '@stratix/core';
import { METADATA_KEYS, STRATIX_METADATA } from './metadataKeys.js';

export interface AppMetadata {
  name: string;
  version: string;
  configuration: {
    sources: (new (...args: any[]) => ConfigurationSource)[];
    configFile: string;
    envPrefix: string;
  };
  di: {
    injectionMode: string;
    strict: boolean;
  };
  contexts: ClassConstructor[];
}

export interface CommandHandlerMetadata {
  handlerClass: ClassConstructor;
  commandClass: ClassConstructor;
}

export interface ContextMetadata {
  contextClass: ClassConstructor;
  commandHandlers: ClassConstructor[];
}

export interface MetadataStorage {
  [METADATA_KEYS.APP]?: AppMetadata;
  [METADATA_KEYS.CONTEXT]?: ContextMetadata;
  [METADATA_KEYS.COMMAND_HANDLER]?: CommandHandlerMetadata;
}

export interface ClassWithMetadata extends ClassConstructor {
  [STRATIX_METADATA]?: MetadataStorage;
}
