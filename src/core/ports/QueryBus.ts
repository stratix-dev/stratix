export interface Query {}

export interface QueryHandler<TQuery extends Query, TResult = unknown> {
  handle(query: TQuery): Promise<TResult>;
}

export interface QueryBus {
  execute<TResult = unknown>(query: Query): Promise<TResult>;
}
