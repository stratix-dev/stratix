import { ClassConstructor, ConfigurationSource } from '@stratix/core';

export interface AppMetadata {
  name: string;
  version: string;
  configuration?: {
    sources?: ConfigurationSource[];
    configFile?: string;
    envPrefix?: string;
  };
  contexts?: ClassConstructor[];
}

export interface CommandHandlerMetadata {
  handlerClass?: ClassConstructor;
  commandClass?: ClassConstructor;
}

export interface ContextMetadata {
  contextClass?: ClassConstructor;
  commandHandlers?: ClassConstructor[];
}
