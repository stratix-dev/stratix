import { ClassConstructor, ConfigurationSource } from '@stratix/core';
import { MetadataWriter } from '../metadata/MetadataWriter.js';
import { DecoratorKindError } from '../errors/DecoratorKindError.js';

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
      throw new DecoratorKindError('StratixApp', 'class', context.kind);
    }

    MetadataWriter.setAppMetadata(target, {
      name: options?.name || 'Stratix Application',
      version: options?.version || '1.0.0',
      configuration: options?.configuration || {},
      contexts: options?.contexts || []
    });

    return target;
  };
}
