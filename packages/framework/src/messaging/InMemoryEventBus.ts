import type { Event, EventBus, EventHandler } from '@stratix/core';

/**
 * In-memory event bus implementation.
 *
 * Provides a simple, synchronous event bus for publishing and subscribing to events.
 * Multiple handlers can subscribe to the same event.
 *
 * @category Messaging
 */
export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<string, EventHandler<Event>[]>();

  subscribe<TEvent extends Event>(
    eventType: new (...args: unknown[]) => TEvent,
    handler: EventHandler<TEvent>
  ): void {
    const eventName = eventType.name;
    const existing = this.handlers.get(eventName) || [];
    existing.push(handler as EventHandler<Event>);
    this.handlers.set(eventName, existing);
  }

  async publish<TEvent extends Event>(event: TEvent): Promise<void> {
    const eventName = event.constructor.name;
    const handlers = this.handlers.get(eventName) || [];

    await Promise.all(handlers.map((handler) => handler.handle(event)));
  }

  async publishAll<TEvent extends Event>(events: TEvent[]): Promise<void> {
    await Promise.all(events.map((event) => this.publish(event)));
  }

  unsubscribe<TEvent extends Event>(
    eventType: new (...args: unknown[]) => TEvent,
    handler: EventHandler<TEvent>
  ): void {
    const eventName = eventType.name;
    const handlers = this.handlers.get(eventName) || [];
    const index = handlers.indexOf(handler as EventHandler<Event>);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Helper method for subscribing by event name (string).
   * Used internally by the framework for @On decorator.
   */
  subscribeByName<TEvent extends Event>(
    eventName: string,
    handler: EventHandler<TEvent>
  ): void {
    const existing = this.handlers.get(eventName) || [];
    existing.push(handler as EventHandler<Event>);
    this.handlers.set(eventName, existing);
  }
}
