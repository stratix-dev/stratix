import { MetadataKeys } from '../../metadata/keys.js';
import { Metadata } from '../../metadata/Metadata.js';
import { ContextMetadata } from '../../metadata/registry.js';
import { DecoratorKindError } from '../errors/DecoratorKindError.js';
import { ClassConstructorType } from '../types/UtilityTypes.js';

export interface ContextOptions {
  name?: string;
  commandHandlers?: ClassConstructorType[];
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
      name: options.name ? Symbol.for(options.name) : Symbol.for(target.name),
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
