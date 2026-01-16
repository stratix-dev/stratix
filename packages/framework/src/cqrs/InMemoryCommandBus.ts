import { Command, CommandBus, CommandHandler, Container } from '@stratix/core';
import { MetadataRegistry } from '../runtime/MetadataRegistry.js';

export class InMemoryCommandBus implements CommandBus {
  private readonly container: Container;
  private readonly registry: MetadataRegistry;

  constructor({ container, registry }: { container: Container; registry: MetadataRegistry }) {
    this.container = container;
    this.registry = registry;
  }

  async dispatch<TResult = void>(command: Command): Promise<TResult> {
    const CommandClass = command.constructor as new (...args: any[]) => Command;
    const HandlerClass = this.registry.commandToHandler.get(CommandClass);
    if (!HandlerClass) {
      throw new Error(`No handler registered for command: ${command.constructor.name}`);
    }
    const handler = this.container.resolve<CommandHandler<Command, TResult>>(HandlerClass.name);
    return (await handler.handle(command)) as TResult;
  }
}
