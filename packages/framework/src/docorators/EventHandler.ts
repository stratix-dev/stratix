import { Error } from '../errors/Error.js';
import { StratixError } from '../errors/StratixError.js';
import { EventHandlerMetadata, MetadataStorage } from '../runtime/MetadataStorage.js';

export interface EventHandlerOptions {
  eventName: string;
}

export function EventHandler(options: EventHandlerOptions) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext
  ) {
    if (context.kind !== 'class') {
      throw new StratixError(Error.RUNTIME_ERROR, '@EventHandler can only be applied to classes');
    }

    const eventHandlerMetadata: EventHandlerMetadata = {
      eventHandlerName: options.eventName ?? target.name,
      eventHandlerType: target
    };

    context.addInitializer(() => {
      MetadataStorage.setEventHandlerMetadata(target, eventHandlerMetadata);
    });

    return target;
  };
}
