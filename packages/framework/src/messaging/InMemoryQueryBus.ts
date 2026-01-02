import type { Query, QueryBus, QueryHandler } from '@stratix/core';

/**
 * In-memory query bus implementation.
 *
 * Provides a simple, synchronous query bus for handling queries.
 * Each query type can have only one handler.
 *
 * @category Messaging
 */
export class InMemoryQueryBus implements QueryBus {
  private readonly handlers = new Map<
    new (...args: never[]) => Query,
    QueryHandler<Query, unknown>
  >();

  register<TQuery extends Query, TResult = unknown>(
    queryType: new (...args: never[]) => TQuery,
    handler: QueryHandler<TQuery, TResult> | { execute: (query: TQuery) => Promise<TResult> }
  ): void {
    if (this.handlers.has(queryType)) {
      throw new Error(`Handler already registered for query: ${queryType.name}`);
    }

    // Support both handler.handle() and handler.execute()
    const wrappedHandler: QueryHandler<Query, unknown> = {
      handle: async (query: Query) => {
        if ('handle' in handler && typeof handler.handle === 'function') {
          return await handler.handle(query as TQuery);
        } else if ('execute' in handler && typeof handler.execute === 'function') {
          return await handler.execute(query as TQuery);
        }
        throw new Error('Handler must have either handle() or execute() method');
      },
    };

    this.handlers.set(queryType, wrappedHandler);
  }

  async dispatch<TResult = unknown>(query: Query): Promise<TResult> {
    const queryType = query.constructor as new (...args: never[]) => Query;
    const handler = this.handlers.get(queryType);

    if (!handler) {
      throw new Error(`No handler registered for query: ${queryType.name}`);
    }

    return (await handler.handle(query)) as TResult;
  }

  // Alias for dispatch to match QueryBus interface
  async execute<TResult = unknown>(query: Query): Promise<TResult> {
    return this.dispatch<TResult>(query);
  }
}
