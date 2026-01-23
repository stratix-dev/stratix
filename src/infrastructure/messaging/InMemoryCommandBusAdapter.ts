import { Command, CommandBus, CommandHandler } from '../../core/ports/CommandBus.js';
import { Container } from '../../core/ports/Container.js';
import { MetadataRegistry } from '../../metadata/MetadataRegistry.js';

export class InMemoryCommandBus implements CommandBus {
  private readonly container: Container;
  private readonly registry: MetadataRegistry;

  constructor({ container, registry }: { container: Container; registry: MetadataRegistry }) {
    this.container = container;
    this.registry = registry;
  }

  async dispatch<TResult = void>(command: Command): Promise<TResult> {
    const CommandClass = command.constructor as new (...args: any[]) => Command;

    if (!CommandClass) {
      throw new Error(`Invalid command instance.`);
    }
    const HandlerClass = this.registry.commandToHandler.get(CommandClass);
    if (!HandlerClass) {
      throw new Error(`No handler registered for command: ${command.constructor.name}`);
    }
    const handler = this.container.resolve<CommandHandler<Command, TResult>>(HandlerClass.name);
    return (await handler.handle(command)) as TResult;
  }
}
