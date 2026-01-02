
import { MetadataStorage } from '../../runtime/MetadataStorage.js';

/**
 * Decorator to mark a method as a domain event emitter.
 *
 * When a method decorated with @DomainEvent is called:
 * 1. The method executes normally
 * 2. A domain event is automatically recorded
 * 3. The aggregate's touch() method is called
 *
 * This works for both static factory methods and instance methods.
 *
 * @param eventName - The name of the domain event to record
 *
 * @example
 * ```typescript
 * @Aggregate()
 * export class User {
 *   @DomainEvent('UserCreated')
 *   static create(email: Email, name: string): User {
 *     const user = new User();
 *     user.email = email;
 *     user.name = name;
 *     return user; // Event auto-recorded
 *   }
 *
 *   @DomainEvent('UserEmailChanged')
 *   changeEmail(newEmail: Email): void {
 *     this.email = newEmail; // Event auto-recorded + touch()
 *   }
 * }
 * ```
 *
 * @category Domain Decorators
 */
export function DomainEvent(eventName: string) {
  return function <T>(
    target: (...args: any[]) => T,
    context: ClassMethodDecoratorContext<any, (...args: any[]) => T>
  ) {
    const isStatic = context.static;

    // Store in context metadata
    if (context.metadata) {
      context.metadata[`domainEvent:${String(context.name)}`] = {
        eventName,
        isStatic,
      };
    }

    // Register metadata (will be called during class initialization)
    context.addInitializer(function(this: any) {
      MetadataStorage.registerDomainEvent(this.constructor || this, {
        eventName,
        target: this.constructor || this,
        methodName: context.name,
        isStatic,
      });
    });

    // Return a wrapper function
    return function(this: any, ...args: any[]): T {
      // Execute original method
      const result = target.apply(this, args);

      // Determine the aggregate instance
      let aggregateInstance: any;

      if (isStatic) {
        // For static methods (factory methods), the result is the aggregate
        aggregateInstance = result;
      } else {
        // For instance methods, 'this' is the aggregate
        aggregateInstance = this;
      }

      // Auto-record domain event
      if (
        aggregateInstance &&
        typeof aggregateInstance.record === 'function'
      ) {
        const event = {
          occurredAt: new Date(),
          eventName,
          aggregateId: aggregateInstance.id?.value,
          data: args,
        };

        aggregateInstance.record(event);
      }

      // Auto-touch (for instance methods only)
      if (
        !isStatic &&
        aggregateInstance &&
        typeof aggregateInstance.touch === 'function'
      ) {
        aggregateInstance.touch();
      }

      return result;
    } as typeof target;
  };
}
