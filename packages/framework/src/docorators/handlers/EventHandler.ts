import { Error } from '../../errors/Error.js';
import { StratixError } from '../../errors/StratixError.js';
import { MetadataStorage } from '../../runtime/MetadataStorage.js';

export interface EventHandlerOptions {
  /**
   * The name of the event to handle.
   * If not provided, uses the class name.
   */
  eventName?: string;
}

export type Options = EventHandlerOptions | undefined;

export function EventHandler(options: Options = undefined) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext
  ) {
    if (context.kind !== 'class') {
      throw new StratixError(Error.RUNTIME_ERROR, '@EventHandler can only be applied to classes');
    }

    const eventHandlerMetadata: Options = {
      eventName: options?.eventName ?? target.name
    };

    context.addInitializer(() => {
      MetadataStorage.setEventHandlerMetadata(target, eventHandlerMetadata);
    });

    return target;
  };
}
