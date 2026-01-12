import { MetadataStorage, StratixAppMetadata } from '../runtime/MetadataStorage.js';
import { StratixError } from '../errors/StratixError.js';
import { Error } from '../errors/Error.js';
import { ClassConstructor, ConfigurationSource } from '@stratix/core';

export interface StratixAppOptions {
  name?: string;
  version?: string;
  contexts?: ClassConstructor[];
  configuration?: {
    sources?: ConfigurationSource[];
    configFile?: string;
    envPrefix?: string;
  };
}

export function StratixApp(options: StratixAppOptions = {}) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext
  ) {
    if (context.kind !== 'class') {
      throw new StratixError(Error.RUNTIME_ERROR, '@StratixApp can only be applied to classes');
    }

    const stratixAppMetadata: StratixAppMetadata = {
      name: options?.name || 'Stratix Application',
      version: options?.version || '1.0.0',
      configuration: options?.configuration || {},
      contexts: options?.contexts || []
    };

    context.addInitializer(() => {
      MetadataStorage.setAppMetadata(target, stratixAppMetadata);
    });

    return target;
  };
}
