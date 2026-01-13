import { ClassConstructor } from '@stratix/core';
import { MetadataWriter } from '../metadata/MetadataWriter.js';

export interface ContextOptions {
  commandHandlers?: ClassConstructor[];
}

export function Context(options: ContextOptions = {}) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext
  ) {
    if (context.kind !== 'class') {
      throw new Error('@Context can only be applied to classes');
    }

    MetadataWriter.setContextMetadata(target, {
      contextClass: target,
      commandHandlers: options?.commandHandlers || []
    });

    return target;
  };
}
