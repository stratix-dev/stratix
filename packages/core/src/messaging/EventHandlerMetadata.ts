import { Event } from './Event.js';

export interface EventHandlerMetadata<TEvent extends Event> {
  eventType: new (...args: any[]) => TEvent;
  priority?: number; // Optional priority for the event handler
}
