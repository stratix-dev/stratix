import type { Entity, EntityId, Event, CommandBus, QueryBus, EventBus } from '@stratix/core';
import { InMemoryCommandBus } from '../messaging/InMemoryCommandBus.js';
import { InMemoryQueryBus } from '../messaging/InMemoryQueryBus.js';
import { InMemoryEventBus } from '../messaging/InMemoryEventBus.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/require-await */

/**
 * Test helpers for common testing patterns in Stratix applications.
 *
 * Provides utilities to simplify test setup, entity creation, and event testing.
 *
 * @example
 * ```typescript
 * describe('ProductService', () => {
 *   it('should create product and emit event', async () => {
 *     const { bus, events } = TestHelpers.createEventBusCapture();
 *     const handler = new CreateProductHandler(mockRepo, bus);
 *     
 *     await handler.handle(new CreateProductCommand('Product', 100));
 *     
 *     const event = await TestHelpers.waitForEvent(bus, ProductCreatedEvent);
 *     expect(event).toBeDefined();
 *   });
 * });
 * ```
 */
export class TestHelpers {
    /**
     * Creates an entity with minimal boilerplate for testing.
     *
     * @param EntityClass - The entity class to instantiate
     * @param id - Entity ID (string or EntityId)
     * @param props - Entity properties
     * @param timestamps - Optional timestamps (defaults to now)
     * @returns The created entity
     *
     * @example
     * ```typescript
     * const product = TestHelpers.createEntity(
     *   Product,
     *   'product-123',
     *   { name: 'Test Product', price: 100 }
     * );
     * ```
     */
    static createEntity<TEntity extends Entity<string>, TProps>(
        EntityClass: new (
            id: EntityId<string>,
            props: TProps,
            createdAt: Date,
            updatedAt: Date
        ) => TEntity,
        id: EntityId<string> | string,
        props: TProps,
        timestamps?: { createdAt?: Date; updatedAt?: Date }
    ): TEntity {
        const entityId =
            typeof id === 'string'
                ? ({ value: id } as EntityId<string>)
                : id;

        const now = new Date();
        const createdAt = timestamps?.createdAt ?? now;
        const updatedAt = timestamps?.updatedAt ?? now;

        return new EntityClass(entityId, props, createdAt, updatedAt);
    }

    /**
     * Creates an in-memory command bus for testing.
     *
     * @returns A new InMemoryCommandBus instance
     *
     * @example
     * ```typescript
     * const commandBus = TestHelpers.createCommandBus();
     * commandBus.register(CreateProductCommand, new CreateProductHandler(repo));
     * await commandBus.execute(new CreateProductCommand('Product', 100));
     * ```
     */
    static createCommandBus(): CommandBus {
        return new InMemoryCommandBus();
    }

    /**
     * Creates an in-memory query bus for testing.
     *
     * @returns A new InMemoryQueryBus instance
     *
     * @example
     * ```typescript
     * const queryBus = TestHelpers.createQueryBus();
     * queryBus.register(GetProductQuery, new GetProductHandler(repo));
     * const product = await queryBus.execute(new GetProductQuery('product-id'));
     * ```
     */
    static createQueryBus(): QueryBus {
        return new InMemoryQueryBus();
    }

    /**
     * Creates an event bus that captures all published events.
     *
     * Useful for asserting that specific events were published during a test.
     *
     * @returns Object with the event bus and array of captured events
     *
     * @example
     * ```typescript
     * const { bus, events } = TestHelpers.createEventBusCapture();
     * 
     * await handler.handle(command);
     * 
     * expect(events).toHaveLength(1);
     * expect(events[0]).toBeInstanceOf(ProductCreatedEvent);
     * ```
     */
    static createEventBusCapture(): {
        bus: EventBus;
        events: Event[];
    } {
        const events: Event[] = [];
        const bus = new InMemoryEventBus();

        // Capture all events by subscribing to base Event type
        const originalPublish = bus.publish.bind(bus);
        bus.publish = async (event: Event) => {
            events.push(event);
            return originalPublish(event);
        };

        return { bus, events };
    }

    /**
     * Waits for a specific event type to be published on an event bus.
     *
     * Useful for async event testing where you need to wait for an event
     * before making assertions.
     *
     * @param bus - The event bus to monitor
     * @param EventType - The event class to wait for
     * @param timeoutMs - Maximum time to wait in milliseconds (default: 5000)
     * @returns Promise that resolves with the event or null if timeout
     *
     * @example
     * ```typescript
     * const bus = new InMemoryEventBus();
     * 
     * // Trigger async operation that will publish event
     * handler.handle(command);
     * 
     * const event = await TestHelpers.waitForEvent(bus, ProductCreatedEvent);
     * expect(event.productId).toBe('product-123');
     * ```
     */
    static async waitForEvent<TEvent extends Event>(
        bus: EventBus,
        EventType: new (...args: any[]) => TEvent,
        timeoutMs: number = 5000
    ): Promise<TEvent | null> {
        return new Promise((resolve) => {
            let resolved = false;
            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    resolve(null);
                }
            }, timeoutMs);

            // Subscribe to the specific event type
            const handler = {
                handle: async (event: TEvent) => {
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timeout);
                        resolve(event);
                    }
                },
            };

            bus.subscribe(EventType, handler);
        });
    }

    /**
     * Creates a spy/mock event bus that tracks all published events.
     *
     * Different from createEventBusCapture in that it doesn't actually
     * publish events to handlers, just captures them for inspection.
     *
     * @returns Object with the mock bus and captured events
     *
     * @example
     * ```typescript
     * const { bus, events } = TestHelpers.createEventBusSpy();
     * 
     * await service.createProduct(data); // This publishes events
     * 
     * expect(events).toContainEqual(expect.objectContaining({
     *   type: 'ProductCreated'
     * }));
     * ```
     */
    static createEventBusSpy(): {
        bus: EventBus;
        events: Event[];
    } {
        const events: Event[] = [];

        const bus: EventBus = {
            publish: async (event: Event) => {
                events.push(event);
            },
            publishAll: async (evts: Event[]) => {
                events.push(...evts);
            },
            subscribe: () => { },
            unsubscribe: () => { },
        };

        return { bus, events };
    }
}
