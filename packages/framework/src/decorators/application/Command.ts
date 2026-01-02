
import { MetadataStorage } from '../../runtime/MetadataStorage.js';

/**
 * Decorator to mark a class as a Command.
 *
 * Commands represent write operations (state changes) in CQRS.
 * Each command should have exactly one handler decorated with @CommandHandler.
 *
 * @example
 * ```typescript
 * @Command()
 * export class CreateUser {
 *   constructor(
 *     public readonly email: string,
 *     public readonly name: string
 *   ) {}
 * }
 * ```
 *
 * @category Application Decorators
 */
export function Command() {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext<T>
  ) {
    // Store in context metadata
    if (context.metadata) {
      context.metadata['command'] = {
        name: context.name || target.name,
      };
    }

    // Register command metadata in global storage
    MetadataStorage.registerCommand(target, {
      target,
      name: target.name,
    });

    return target;
  };
}
