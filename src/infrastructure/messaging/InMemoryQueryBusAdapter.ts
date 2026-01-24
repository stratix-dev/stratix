import { Container } from '../../core/ports/Container.js';
import { Query, QueryBus, QueryHandler } from '../../core/ports/QueryBus.js';
import { MetadataRegistry } from '../../metadata/MetadataRegistry.js';

export class InMemoryQueryBus implements QueryBus {
  private readonly container: Container;
  private readonly registry: MetadataRegistry;

  constructor({ container, registry }: { container: Container; registry: MetadataRegistry }) {
    this.container = container;
    this.registry = registry;
  }

  async execute<TResult = void>(query: Query): Promise<TResult> {
    const queryClass = query.constructor as new (...args: unknown[]) => Query;
    const handlerClass = this.registry.queryToHandler.get(queryClass);

    if (!handlerClass) {
      throw new Error(`No handler registered for query: ${queryClass.name}`);
    }

    const handler = this.container.resolve<QueryHandler<Query, TResult>>(handlerClass.name);

    return handler.handle(query);
  }
}
