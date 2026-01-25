import { Command, CommandBus, CommandHandler } from '../../core/ports/CommandBus.js';
import { Container } from '../../core/ports/Container.js';
import { toCamelCase } from '../../functions/strings.js';

export class InMemoryCommandBus implements CommandBus {
  private readonly container: Container;

  constructor({ container }: { container: Container }) {
    this.container = container;
  }

  async dispatch<T extends Command>(command: T): Promise<void> {
    const commandName = command.constructor.name;
    const handlerName = `${commandName}Handler`;
    const handlerId = toCamelCase(handlerName);

    try {
      const handler = this.container.resolve<CommandHandler<Command>>(handlerId);
      await handler.handle(command);
    } catch (error) {
      console.error(
        `No handler found for command: ${commandName} (expected handler id: ${handlerId})`
      );
      throw error;
    }
  }
}
