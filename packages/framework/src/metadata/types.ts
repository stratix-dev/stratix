import { ClassConstructor, ConfigurationSource } from '@stratix/core';

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
