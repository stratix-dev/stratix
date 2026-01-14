import { Command, CommandBus, CommandHandler, Container } from '@stratix/core';
import { MetadataRegistry } from '../runtime/MetadataRegistry.js';

export interface InMemoryCommandBusOptions {
  container: Container;
  registry: MetadataRegistry;
}

export class InMemoryCommandBus implements CommandBus {
  constructor(private readonly inMemoryCommandBusOptions: InMemoryCommandBusOptions) {}

  async dispatch<TResult = void>(command: Command): Promise<TResult> {
    const CommandClass = command.constructor as new (...args: any[]) => Command;
    const HandlerClass = this.inMemoryCommandBusOptions.registry.commandToHandler.get(CommandClass);
    if (!HandlerClass) {
      throw new Error(`No handler registered for command: ${command.constructor.name}`);
    }
    const handler = this.inMemoryCommandBusOptions.container.resolve<
      CommandHandler<Command, TResult>
    >(HandlerClass.name);
    return (await handler.handle(command)) as TResult;
  }
}
