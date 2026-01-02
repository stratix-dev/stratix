
import { MetadataStorage } from '../../runtime/MetadataStorage.js';

/**
 * Decorator to mark a class as a Query Handler.
 *
 * Query handlers execute queries and are automatically registered
 * with the QueryBus during application bootstrap.
 *
 * The handler class must have an `execute` method that accepts the query
 * and returns the result (can be async).
 *
 * @param queryClass - The query class this handler handles
 *
 * @example
 * ```typescript
 * @QueryHandler(GetUserById)
 * export class GetUserByIdHandler {
 *   @Inject() private userRepository!: UserRepository;
 *
 *   async execute(query: GetUserById): Promise<User | null> {
 *     const userId = EntityId.from<'User'>(query.userId);
 *     return this.userRepository.findById(userId);
 *   }
 * }
 * ```
 *
 * @category Application Decorators
 */
export function QueryHandler<TQuery>(
  queryClass: new (...args: any[]) => TQuery
) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext<T>
  ) {
    // Verify that the handler has an execute method
    if (!target.prototype.execute) {
      throw new Error(
        `QueryHandler ${target.name} must have an execute() method`
      );
    }

    // Store in context metadata
    if (context.metadata) {
      context.metadata['queryHandler'] = {
        queryClass,
      };
    }

    // Register handler metadata in global storage
    MetadataStorage.registerQueryHandler(target, {
      target,
      queryClass,
      handlerClass: target,
    });

    return target;
  };
}
