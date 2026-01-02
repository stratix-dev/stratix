
import { MetadataStorage } from '../../runtime/MetadataStorage.js';

/**
 * Decorator to mark a class as a Command Handler.
 *
 * Command handlers execute commands and are automatically registered
 * with the CommandBus during application bootstrap.
 *
 * The handler class must have an `execute` method that accepts the command
 * and returns the result (can be async).
 *
 * @param commandClass - The command class this handler handles
 *
 * @example
 * ```typescript
 * @CommandHandler(CreateUser)
 * export class CreateUserHandler {
 *   @Inject() private userRepository!: UserRepository;
 *
 *   async execute(command: CreateUser): Promise<User> {
 *     const user = User.create(command.email, command.name);
 *     return this.userRepository.save(user);
 *   }
 * }
 * ```
 *
 * @category Application Decorators
 */
export function CommandHandler<TCommand>(
  commandClass: new (...args: any[]) => TCommand
) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext<T>
  ) {
    // Verify that the handler has an execute method
    if (!target.prototype.execute) {
      throw new Error(
        `CommandHandler ${target.name} must have an execute() method`
      );
    }

    // Store in context metadata
    if (context.metadata) {
      context.metadata['commandHandler'] = {
        commandClass,
      };
    }

    // Register handler metadata in global storage
    MetadataStorage.registerCommandHandler(target, {
      target,
      commandClass,
      handlerClass: target,
    });

    return target;
  };
}
