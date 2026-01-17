import { Metadata } from '../metadata/Metadata.js';
import { DecoratorKindError } from '../shared/errors/DecoratorKindError.js';
import { CommandHandlerMetadata } from '../metadata/registry.js';
import { MetadataKeys } from '../metadata/keys.js';
import { Command } from '../cqrs/command/Command.js';
import type { CommandHandler } from '../cqrs/command/CommandHandler.js';

export interface CommandHandlerOptions<TCommand extends Command = Command> {
  command: new (...args: any[]) => TCommand;
}

export function CommandHandler<TCommand extends Command, TResult = void>(
  options: CommandHandlerOptions<TCommand>
) {
  return function <T extends new (...args: any[]) => CommandHandler<TCommand, TResult>>(
    target: T,
    context: ClassDecoratorContext
  ): T {
    if (context.kind !== 'class') {
      throw new DecoratorKindError('CommandHandler', 'class', context.kind);
    }

    // Type-safe metadata construction
    const metadata: CommandHandlerMetadata = {
      handlerClass: target,
      commandClass: options.command
    };

    // Compiler ensures type correctness
    Metadata.set(target, MetadataKeys.CommandHandler, metadata);

    return target;
  };
}
