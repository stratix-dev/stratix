export interface Event {
  occurredAt: Date;
  [key: string]: unknown;
}

export interface EventHandler<TEvent extends Event> {
  handle(event: TEvent): Promise<void>;
}

export interface EventBus {
  subscribe<TEvent extends Event>(
    eventType: new (...args: unknown[]) => TEvent,
    handler: EventHandler<TEvent>
  ): void;
  publish(event: Event): Promise<void>;
  publishAll(events: Event[]): Promise<void>;
  unsubscribe<TEvent extends Event>(
    eventType: new (...args: unknown[]) => TEvent,
    handler: EventHandler<TEvent>
  ): void;
}
