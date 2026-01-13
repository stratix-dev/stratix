import { ClassConstructor } from '@stratix/core';
import { Error } from '../errors/Error.js';
import { StratixError } from '../errors/StratixError.js';
import { MetadataWriter } from '../metadata/MetadataWriter.js';

export interface CommandHandlerOptions {
  commandClass: ClassConstructor;
}

export function CommandHandler(options: CommandHandlerOptions) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext
  ) {
    if (context.kind !== 'class') {
      throw new StratixError(Error.RUNTIME_ERROR, '@CommandHandler can only be applied to classes');
    }

    MetadataWriter.setCommandHandlerMetadata(target, {
      handlerClass: target,
      commandClass: options.commandClass
    });

    return target;
  };
}
