import { describe, it, expect, vi } from 'vitest';
import { TestHelpers } from '../TestHelpers.js';
import { Entity, EntityId, Event } from '@stratix/core';

// Test fixtures
interface TestProductProps {
    name: string;
    price: number;
}

class TestProduct extends Entity<'Product'> {
    constructor(
        id: EntityId<'Product'>,
        private readonly props: TestProductProps,
        createdAt: Date,
        updatedAt: Date
    ) {
        super(id, createdAt, updatedAt);
    }

    get name(): string {
        return this.props.name;
    }

    get price(): number {
        return this.props.price;
    }
}

class TestEvent implements Event {
    constructor(public readonly data: string) { }
}

class OtherTestEvent implements Event {
    constructor(public readonly value: number) { }
}

describe('TestHelpers', () => {
    describe('createEntity', () => {
        it('should create entity with string ID', () => {
            const product = TestHelpers.createEntity(
                TestProduct,
                'product-123',
                { name: 'Test Product', price: 100 }
            );

            expect(product).toBeInstanceOf(TestProduct);
            expect(product.id.value).toBe('product-123');
            expect(product.name).toBe('Test Product');
            expect(product.price).toBe(100);
        });

        it('should create entity with EntityId', () => {
            const id = EntityId.from<'Product'>('product-456');
            const product = TestHelpers.createEntity(
                TestProduct,
                id,
                { name: 'Another Product', price: 200 }
            );

            expect(product.id).toBe(id);
            expect(product.name).toBe('Another Product');
        });

        it('should use current date by default', () => {
            const before = new Date();
            const product = TestHelpers.createEntity(
                TestProduct,
                'product-123',
                { name: 'Test', price: 100 }
            );
            const after = new Date();

            expect(product.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(product.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        it('should accept custom timestamps', () => {
            const createdAt = new Date('2024-01-01');
            const updatedAt = new Date('2024-01-15');

            const product = TestHelpers.createEntity(
                TestProduct,
                'product-123',
                { name: 'Test', price: 100 },
                { createdAt, updatedAt }
            );

            expect(product.createdAt).toEqual(createdAt);
            expect(product.updatedAt).toEqual(updatedAt);
        });
    });

    describe('createCommandBus', () => {
        it('should create a command bus', () => {
            const bus = TestHelpers.createCommandBus();

            expect(bus).toBeDefined();
        });
    });

    describe('createQueryBus', () => {
        it('should create a query bus', () => {
            const bus = TestHelpers.createQueryBus();

            expect(bus).toBeDefined();
        });
    });

    describe('createEventBusCapture', () => {
        it('should create event bus and capture array', () => {
            const { bus, events } = TestHelpers.createEventBusCapture();

            expect(bus).toBeDefined();
            expect(events).toEqual([]);
        });

        it('should capture published events', async () => {
            const { bus, events } = TestHelpers.createEventBusCapture();

            const event1 = new TestEvent('test1');
            const event2 = new TestEvent('test2');

            await bus.publish(event1);
            await bus.publish(event2);

            expect(events).toHaveLength(2);
            expect(events[0]).toBe(event1);
            expect(events[1]).toBe(event2);
        });

        it('should still notify subscribers', async () => {
            const { bus, events } = TestHelpers.createEventBusCapture();
            const handler = { handle: vi.fn() };

            bus.subscribe(TestEvent as any, handler);

            const event = new TestEvent('test');
            await bus.publish(event);

            expect(events).toContain(event);
            expect(handler.handle).toHaveBeenCalledWith(event);
        });
    });

    describe('waitForEvent', () => {
        it('should resolve with event when published', async () => {
            const eventBus = TestHelpers.createEventBusCapture().bus;

            // Simulate event being published after a delay
            setTimeout(() => {
                eventBus.publish(new TestEvent('delayed'));
            }, 100);

            const event = await TestHelpers.waitForEvent(eventBus, TestEvent as any, 1000);

            expect(event).toBeDefined();
            expect((event as TestEvent)?.data).toBe('delayed');
        });

        it('should return null on timeout', async () => {
            const eventBus = TestHelpers.createEventBusCapture().bus;

            const event = await TestHelpers.waitForEvent(eventBus, TestEvent as any, 100);

            expect(event).toBeNull();
        });

        it('should only resolve for matching event type', async () => {
            const eventBus = TestHelpers.createEventBusCapture().bus;

            // Publish wrong event type
            setTimeout(() => {
                eventBus.publish(new OtherTestEvent(123));
            }, 50);

            // Publish correct event type
            setTimeout(() => {
                eventBus.publish(new TestEvent('correct'));
            }, 100);

            const event = await TestHelpers.waitForEvent(eventBus, TestEvent as any, 200);

            expect(event).toBeDefined();
            expect(event).toBeInstanceOf(TestEvent);
            expect((event as TestEvent).data).toBe('correct');
        });
    });

    describe('createEventBusSpy', () => {
        it('should create spy bus and events array', () => {
            const { bus, events } = TestHelpers.createEventBusSpy();

            expect(bus).toBeDefined();
            expect(events).toEqual([]);
        });

        it('should capture events without notifying handlers', async () => {
            const { bus, events } = TestHelpers.createEventBusSpy();

            const event1 = new TestEvent('spy1');
            const event2 = new TestEvent('spy2');

            await bus.publish(event1);
            await bus.publish(event2);

            expect(events).toHaveLength(2);
            expect(events[0]).toBe(event1);
            expect(events[1]).toBe(event2);
        });

        it('should not notify subscribers (spy behavior)', async () => {
            const { bus } = TestHelpers.createEventBusSpy();
            const handler = { handle: vi.fn() };

            bus.subscribe(TestEvent as any, handler);
            await bus.publish(new TestEvent('test'));

            // Spy doesn't actually call handlers
            expect(handler.handle).not.toHaveBeenCalled();
        });
    });

    describe('integration scenarios', () => {
        it('should support complete test workflow', async () => {
            // Setup
            const { bus, events } = TestHelpers.createEventBusCapture();
            const product = TestHelpers.createEntity(
                TestProduct,
                'product-123',
                { name: 'Integration Test', price: 999 }
            );

            // Simulate service action
            await bus.publish(new TestEvent(product.name));

            // Assert
            expect(events).toHaveLength(1);
            expect(events[0]).toBeInstanceOf(TestEvent);
            expect((events[0] as TestEvent).data).toBe('Integration Test');
        });

        it('should work with async event waiting', async () => {
            const eventBus = TestHelpers.createEventBusCapture().bus;

            // Simulate async operation
            const operation = async () => {
                await new Promise((resolve) => setTimeout(resolve, 50));
                await eventBus.publish(new TestEvent('async-result'));
            };

            // Start operation and wait for event
            operation();
            const event = await TestHelpers.waitForEvent(eventBus, TestEvent, 200);

            expect(event).toBeDefined();
            expect(event?.data).toBe('async-result');
        });
    });
});
