
import { MetadataStorage } from '../../runtime/MetadataStorage.js';

/**
 * Decorator to mark a class as a Query.
 *
 * Queries represent read operations (data retrieval) in CQRS.
 * Each query should have exactly one handler decorated with @QueryHandler.
 *
 * @example
 * ```typescript
 * @Query()
 * export class GetUserById {
 *   constructor(public readonly userId: string) {}
 * }
 * ```
 *
 * @category Application Decorators
 */
export function Query() {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext<T>
  ) {
    // Store in context metadata
    if (context.metadata) {
      context.metadata['query'] = {
        name: context.name || target.name,
      };
    }

    // Register query metadata in global storage
    MetadataStorage.registerQuery(target, {
      target,
      name: target.name,
    });

    return target;
  };
}
