
import { MetadataStorage } from '../../runtime/MetadataStorage.js';

const EVENT_HANDLER_METHODS_KEY = Symbol('eventHandlerMethods');

/**
 * Decorator to mark a class as an Event Handler.
 *
 * Event handlers react to domain events and are automatically registered
 * with the EventBus during application bootstrap.
 *
 * Use @On decorator on methods to specify which events they handle.
 *
 * @example
 * ```typescript
 * @EventHandler()
 * export class UserCreatedEventHandler {
 *   @Inject() private emailService!: EmailService;
 *
 *   @On('UserCreated')
 *   async handle(event: UserCreatedEvent): Promise<void> {
 *     await this.emailService.sendWelcomeEmail(event.email);
 *   }
 * }
 * ```
 *
 * @category Application Decorators
 */
export function EventHandler() {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext<T>
  ) {
    // Get event methods from @On decorator metadata stored in context.metadata
    const eventMethods: Map<string, string> = 
      (context.metadata?.[EVENT_HANDLER_METHODS_KEY] as Map<string, string>) || new Map();

    // Store in context metadata
    if (context.metadata) {
      context.metadata['eventHandler'] = {
        eventMethods,
      };
    }

    // Register handler metadata in global storage
    MetadataStorage.registerEventHandler(target, {
      target,
      handlerClass: target,
      eventMethods,
    });

    return target;
  };
}

/**
 * Decorator to mark a method as an event handler for a specific event.
 *
 * Must be used inside a class decorated with @EventHandler.
 *
 * @param eventName - The name of the event to handle
 *
 * @example
 * ```typescript
 * @EventHandler()
 * export class NotificationHandler {
 *   @On('UserCreated')
 *   async onUserCreated(event: UserCreatedEvent): Promise<void> {
 *     // Handle event
 *   }
 *
 *   @On('UserEmailChanged')
 *   async onEmailChanged(event: UserEmailChangedEvent): Promise<void> {
 *     // Handle event
 *   }
 * }
 * ```
 *
 * @category Application Decorators
 */
export function On(eventName: string) {
  return function <T>(
    target: (...args: any[]) => T,
    context: ClassMethodDecoratorContext<any, (...args: any[]) => T>
  ) {
    if (!context.metadata) {
      return target;
    }

    // Get or create event methods map in metadata
    let eventMethods: Map<string, string> =
      context.metadata[EVENT_HANDLER_METHODS_KEY] as Map<string, string>;

    if (!eventMethods) {
      eventMethods = new Map();
      context.metadata[EVENT_HANDLER_METHODS_KEY] = eventMethods;
    }

    // Store the event -> method mapping
    eventMethods.set(eventName, context.name as string);

    return target;
  };
}
