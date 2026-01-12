import { Command, CommandBus, CommandHandler, Container } from '@stratix/core';
import { MetadataStorage } from '../runtime/MetadataStorage.js';

export class InMemoryCommandBus implements CommandBus {
  constructor(private container: Container) {}

  async dispatch<TResult = void>(command: Command): Promise<TResult> {
    const CommandClass = command.constructor as new (...args: unknown[]) => Command;
    const commandMetadata = MetadataStorage.getCommandMetadata(CommandClass);
    const commandName = commandMetadata?.commandName || CommandClass.name;

    const HandlerClass = MetadataStorage.getCommandHandlerByName(commandName);

    if (!HandlerClass) {
      throw new Error(`No handler registered for command: ${command.constructor.name}`);
    }

    const handler = this.container.resolve<CommandHandler<Command, TResult>>(HandlerClass.name);

    return (await handler.handle(command)) as TResult;
  }
}
