import { ClassConstructor } from '@stratix/core';
import { DecoratorKindError } from '../errors/DecoratorKindError.js';
import { MetadataKeys } from '../metadata/keys.js';
import { Metadata } from '../metadata/Metadata.js';
import { ContextMetadata } from '../metadata/registry.js';

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

    const metadata: ContextMetadata = {
      contextClass: target,
      commandHandlers: options.commandHandlers ?? [],
      queryHandlers: [],
      eventHandlers: [],
      providers: []
    };

    Metadata.set(target, MetadataKeys.Context, metadata);

    return target;
  };
}
