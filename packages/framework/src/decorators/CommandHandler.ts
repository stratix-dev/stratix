import { DecoratorKindError } from '../errors/DecoratorKindError.js';
import { MetadataWriter } from '../metadata/MetadataWriter.js';
import { CommandHandler as ICommandHandler, Command } from '@stratix/core';

export interface CommandHandlerOptions<TCommand extends Command = Command> {
  commandClass: new (...args: any[]) => TCommand;
}

export function CommandHandler<TCommand extends Command = Command, TResult = void>(
  options: CommandHandlerOptions<TCommand>
) {
  return function <T extends new (...args: any[]) => ICommandHandler<TCommand, TResult>>(
    target: T,
    context: ClassDecoratorContext
  ) {
    if (context.kind !== 'class') {
      throw new DecoratorKindError('CommandHandler', 'class', context.kind);
    }

    MetadataWriter.setCommandHandlerMetadata(target, {
      handlerClass: target,
      commandClass: options.commandClass
    });

    return target;
  };
}
