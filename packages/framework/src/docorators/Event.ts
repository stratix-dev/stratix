import { EventMetadata, MetadataStorage } from '../runtime/MetadataStorage.js';

export interface EventOptions {
  eventName?: string;
  eventType?: new (...args: any[]) => any;
}

export function Event(options?: EventOptions) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext
  ) {
    if (context.kind !== 'class') {
      throw new Error('@Event can only be applied to classes');
    }

    const eventMetadata: EventMetadata = {
      eventName: options?.eventName ?? options?.eventType?.name,
      eventType: options?.eventType
    };

    context.addInitializer(() => {
      MetadataStorage.setEventMetadata(target, eventMetadata);
    });

    return target;
  };
}
