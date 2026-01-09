import { Event } from '@stratix/core';
import { Error } from '../../errors/Error.js';
import { StratixError } from '../../errors/StratixError.js';
import { MetadataStorage, ExtendedEventHandlerMetadata } from '../../runtime/MetadataStorage.js';

export interface EventHandlerOptions<TEvent extends Event = Event> {
  /**
   * The event type/class to handle (required)
   */
  eventType: new (...args: any[]) => TEvent;

  /**
   * Optional name for the event handler
   * If not provided, uses the handler class name
   */
  eventName?: string;

  /**
   * Optional priority for event handler execution order
   */
  priority?: number;
}

export function EventHandler<TEvent extends Event = Event>(
  options: EventHandlerOptions<TEvent>
) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext
  ) {
    if (context.kind !== 'class') {
      throw new StratixError(Error.RUNTIME_ERROR, '@EventHandler can only be applied to classes');
    }

    const eventHandlerMetadata: ExtendedEventHandlerMetadata<TEvent> = {
      eventType: options.eventType,
      eventName: options.eventName ?? target.name,
      priority: options.priority
    };

    context.addInitializer(() => {
      MetadataStorage.setEventHandlerMetadata(target, eventHandlerMetadata);
    });

    return target;
  };
}
