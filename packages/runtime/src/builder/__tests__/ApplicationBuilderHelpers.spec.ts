import { describe, it, expect } from 'vitest';
import { ApplicationBuilderHelpers } from '../ApplicationBuilderHelpers.js';
import type { Container } from '@stratix/core';

// Mock container for testing
class MockContainer implements Container {
    private services = new Map<string, any>();

    register(name: string, factory: (context: any) => any, _options?: any): void {
        this.services.set(name, factory(this));
    }

    resolve(name: string): any {
        return this.services.get(name);
    }

    has(name: string): boolean {
        return this.services.has(name);
    }

    createScope(): Container {
        return this;
    }

    dispose(): Promise<void> {
        return Promise.resolve();
    }

    singleton<T>(_token: string, _value: T | (() => T)): void { }
    scoped<T>(_token: string, _factory: () => T): void { }
    transient<T>(_token: string, _factory: () => T): void { }
    registerClass<T>(_classType: new (...args: unknown[]) => T, _options?: any): void { }
    registerAll(_services: Record<string, unknown>): void { }
    tryResolve<T>(_token: string): T | undefined {
        return undefined;
    }
}

describe('ApplicationBuilderHelpers', () => {
    describe('createWithDefaults', () => {
        it('should create ApplicationBuilder with container and logger', () => {
            const container = new MockContainer();
            const builder = ApplicationBuilderHelpers.createWithDefaults(container);

            expect(builder).toBeDefined();
            expect(builder.pluginCount).toBe(0);
            expect(builder.contextCount).toBe(0);
        });

        it('should register commandBus in container', () => {
            const container = new MockContainer();
            ApplicationBuilderHelpers.createWithDefaults(container);

            const commandBus = container.resolve('commandBus');
            expect(commandBus).toBeDefined();
        });

        it('should register queryBus in container', () => {
            const container = new MockContainer();
            ApplicationBuilderHelpers.createWithDefaults(container);

            const queryBus = container.resolve('queryBus');
            expect(queryBus).toBeDefined();
        });

        it('should register eventBus in container', () => {
            const container = new MockContainer();
            ApplicationBuilderHelpers.createWithDefaults(container);

            const eventBus = container.resolve('eventBus');
            expect(eventBus).toBeDefined();
        });

        it('should register logger in container', () => {
            const container = new MockContainer();
            ApplicationBuilderHelpers.createWithDefaults(container);

            const logger = container.resolve('logger');
            expect(logger).toBeDefined();
        });

        it('should return builder that can build application', async () => {
            const container = new MockContainer();
            const builder = ApplicationBuilderHelpers.createWithDefaults(container);

            const app = await builder.build();
            expect(app).toBeDefined();
        });

        it('should allow chaining with plugins', () => {
            const container = new MockContainer();
            const builder = ApplicationBuilderHelpers.createWithDefaults(container);

            // Should be able to chain
            const chained = builder.usePlugins([]);
            expect(chained).toBe(builder);
        });
    });

    describe('createForTesting', () => {
        it('should create ApplicationBuilder with container and logger', () => {
            const container = new MockContainer();
            const builder = ApplicationBuilderHelpers.createForTesting(container);

            expect(builder).toBeDefined();
            expect(builder.pluginCount).toBe(0);
            expect(builder.contextCount).toBe(0);
        });

        it('should register commandBus in container', () => {
            const container = new MockContainer();
            ApplicationBuilderHelpers.createForTesting(container);

            const commandBus = container.resolve('commandBus');
            expect(commandBus).toBeDefined();
        });

        it('should register queryBus in container', () => {
            const container = new MockContainer();
            ApplicationBuilderHelpers.createForTesting(container);

            const queryBus = container.resolve('queryBus');
            expect(queryBus).toBeDefined();
        });

        it('should register eventBus in container', () => {
            const container = new MockContainer();
            ApplicationBuilderHelpers.createForTesting(container);

            const eventBus = container.resolve('eventBus');
            expect(eventBus).toBeDefined();
        });

        it('should register logger in container', () => {
            const container = new MockContainer();
            ApplicationBuilderHelpers.createForTesting(container);

            const logger = container.resolve('logger');
            expect(logger).toBeDefined();
        });

        it('should return builder that can build application', async () => {
            const container = new MockContainer();
            const builder = ApplicationBuilderHelpers.createForTesting(container);

            const app = await builder.build();
            expect(app).toBeDefined();
        });

        it('should be suitable for test setup', async () => {
            const container = new MockContainer();
            // Simulate test setup
            const builder = ApplicationBuilderHelpers.createForTesting(container);
            const app = await builder.build();

            await app.start();
            await app.stop();

            // Should complete without errors
            expect(true).toBe(true);
        });
    });

    describe('comparison', () => {
        it('should create different logger instances', () => {
            const container1 = new MockContainer();
            const container2 = new MockContainer();

            ApplicationBuilderHelpers.createWithDefaults(container1);
            ApplicationBuilderHelpers.createForTesting(container2);

            const logger1 = container1.resolve('logger');
            const logger2 = container2.resolve('logger');

            // They should be different instances
            expect(logger1).not.toBe(logger2);
        });
    });
});
