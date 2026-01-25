import { Container } from '../../core/ports/Container.js';
import { Query, QueryBus, QueryHandler } from '../../core/ports/QueryBus.js';
import { toCamelCase } from '../../functions/strings.js';

export class InMemoryQueryBus implements QueryBus {
  private readonly container: Container;

  constructor({ container }: { container: Container }) {
    this.container = container;
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  async execute<T extends Query>(query: T): Promise<any> {
    const queryName = query.constructor.name;
    const handlerName = `${queryName}Handler`;
    const handlerId = toCamelCase(handlerName);

    const handler = this.container.resolve<QueryHandler<Query, unknown>>(handlerId);

    return handler.handle(query);
  }
}
