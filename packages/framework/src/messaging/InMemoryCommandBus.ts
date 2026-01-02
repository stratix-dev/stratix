import type { Command, CommandBus, CommandHandler } from '@stratix/core';

/**
 * In-memory command bus implementation.
 *
 * Provides a simple, synchronous command bus for handling commands.
 * Each command type can have only one handler.
 *
 * @category Messaging
 */
export class InMemoryCommandBus implements CommandBus {
  private readonly handlers = new Map<
    new (...args: never[]) => Command,
    CommandHandler<Command, unknown>
  >();

  register<TCommand extends Command, TResult = void>(
    commandType: new (...args: never[]) => TCommand,
    handler: CommandHandler<TCommand, TResult> | { execute: (command: TCommand) => Promise<TResult> }
  ): void {
    if (this.handlers.has(commandType)) {
      throw new Error(`Handler already registered for command: ${commandType.name}`);
    }

    // Support both handler.handle() and handler.execute()
    const wrappedHandler: CommandHandler<Command, unknown> = {
      handle: async (command: Command) => {
        if ('handle' in handler && typeof handler.handle === 'function') {
          return await handler.handle(command as TCommand);
        } else if ('execute' in handler && typeof handler.execute === 'function') {
          return await handler.execute(command as TCommand);
        }
        throw new Error('Handler must have either handle() or execute() method');
      },
    };

    this.handlers.set(commandType, wrappedHandler);
  }

  async dispatch<TResult = void>(command: Command): Promise<TResult> {
    const commandType = command.constructor as new (...args: never[]) => Command;
    const handler = this.handlers.get(commandType);

    if (!handler) {
      throw new Error(`No handler registered for command: ${commandType.name}`);
    }

    return (await handler.handle(command)) as TResult;
  }
}
