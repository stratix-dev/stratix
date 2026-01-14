import { ClassConstructor } from '@stratix/core';
import { MetadataWriter } from '../metadata/MetadataWriter.js';
import { DecoratorKindError } from '../errors/DecoratorKindError.js';

export interface ContextOptions {
  commandHandlers?: ClassConstructor[];
}

export function Context(options: ContextOptions = {}) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext
  ) {
    if (context.kind !== 'class') {
      throw new DecoratorKindError('Context', 'class', context.kind);
    }

    MetadataWriter.setContextMetadata(target, {
      contextClass: target,
      commandHandlers: options?.commandHandlers || []
    });

    return target;
  };
}
