import { describe, it, expect } from 'vitest';
import { ApplicationBuilderHelpers } from '../ApplicationBuilderHelpers.js';
import { createContainer } from '../../di/awilix.js';

describe('ApplicationBuilderHelpers', () => {
    describe('createWithDefaults', () => {
        it('should create ApplicationBuilder with container and logger', () => {
            const container = createContainer();
            const builder = ApplicationBuilderHelpers.createWithDefaults(container);

            expect(builder).toBeDefined();
            expect(builder.pluginCount).toBe(0);
            expect(builder.contextCount).toBe(0);
        });

        it('should register commandBus in container', () => {
            const container = createContainer();
            ApplicationBuilderHelpers.createWithDefaults(container);

            const commandBus = container.resolve('commandBus');
            expect(commandBus).toBeDefined();
        });

        it('should register queryBus in container', () => {
            const container = createContainer();
            ApplicationBuilderHelpers.createWithDefaults(container);

            const queryBus = container.resolve('queryBus');
            expect(queryBus).toBeDefined();
        });

        it('should register eventBus in container', () => {
            const container = createContainer();
            ApplicationBuilderHelpers.createWithDefaults(container);

            const eventBus = container.resolve('eventBus');
            expect(eventBus).toBeDefined();
        });

        it('should register logger in container', () => {
            const container = createContainer();
            ApplicationBuilderHelpers.createWithDefaults(container);

            const logger = container.resolve('logger');
            expect(logger).toBeDefined();
        });

        it('should return builder that can build application', async () => {
            const container = createContainer();
            const builder = ApplicationBuilderHelpers.createWithDefaults(container);

            const app = await builder.build();
            expect(app).toBeDefined();
        });

        it('should allow chaining with plugins', () => {
            const container = createContainer();
            const builder = ApplicationBuilderHelpers.createWithDefaults(container);

            // Should be able to chain
            const chained = builder.usePlugins([]);
            expect(chained).toBe(builder);
        });
    });

    describe('createForTesting', () => {
        it('should create ApplicationBuilder with container and logger', () => {
            const container = createContainer();
            const builder = ApplicationBuilderHelpers.createForTesting(container);

            expect(builder).toBeDefined();
            expect(builder.pluginCount).toBe(0);
            expect(builder.contextCount).toBe(0);
        });

        it('should register commandBus in container', () => {
            const container = createContainer();
            ApplicationBuilderHelpers.createForTesting(container);

            const commandBus = container.resolve('commandBus');
            expect(commandBus).toBeDefined();
        });

        it('should register queryBus in container', () => {
            const container = createContainer();
            ApplicationBuilderHelpers.createForTesting(container);

            const queryBus = container.resolve('queryBus');
            expect(queryBus).toBeDefined();
        });

        it('should register eventBus in container', () => {
            const container = createContainer();
            ApplicationBuilderHelpers.createForTesting(container);

            const eventBus = container.resolve('eventBus');
            expect(eventBus).toBeDefined();
        });

        it('should register logger in container', () => {
            const container = createContainer();
            ApplicationBuilderHelpers.createForTesting(container);

            const logger = container.resolve('logger');
            expect(logger).toBeDefined();
        });

        it('should return builder that can build application', async () => {
            const container = createContainer();
            const builder = ApplicationBuilderHelpers.createForTesting(container);

            const app = await builder.build();
            expect(app).toBeDefined();
        });

        it('should be suitable for test setup', async () => {
            const container = createContainer();
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
            const container1 = createContainer();
            const container2 = createContainer();

            ApplicationBuilderHelpers.createWithDefaults(container1);
            ApplicationBuilderHelpers.createForTesting(container2);

            const logger1 = container1.resolve('logger');
            const logger2 = container2.resolve('logger');

            // They should be different instances
            expect(logger1).not.toBe(logger2);
        });
    });
});
