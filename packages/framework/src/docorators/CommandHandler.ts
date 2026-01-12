import { ClassConstructor } from '@stratix/core';
import { Error } from '../errors/Error.js';
import { StratixError } from '../errors/StratixError.js';
import { CommandHandlerMetadata, MetadataStorage } from '../runtime/MetadataStorage.js';

export interface CommandHandlerOptions {
  commandClass?: ClassConstructor;
}

export type Options = CommandHandlerOptions;

export function CommandHandler(options: Options) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext
  ) {
    if (context.kind !== 'class') {
      throw new StratixError(Error.RUNTIME_ERROR, '@CommandHandler can only be applied to classes');
    }

    const commandHandlerMetadata: CommandHandlerMetadata = {
      commandClass: options?.commandClass,
      handlerClass: target
    };

    context.addInitializer(() => {
      MetadataStorage.setCommandHandlerMetadata(target, commandHandlerMetadata);
    });

    return target;
  };
}
