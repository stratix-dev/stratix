import { ApplicationBuilder } from './ApplicationBuilder.js';
import { InMemoryCommandBus } from '../messaging/InMemoryCommandBus.js';
import { InMemoryQueryBus } from '../messaging/InMemoryQueryBus.js';
import { InMemoryEventBus } from '../messaging/InMemoryEventBus.js';
import { ConsoleLogger } from '../infrastructure/ConsoleLogger.js';
import type { AwilixContainer } from '../di/awilix.js';
import { asClass, asValue } from '../di/awilix.js';

/**
 * Helper functions for creating ApplicationBuilder instances with sensible defaults.
 *
 * These helpers reduce boilerplate when setting up applications, especially for
 * development and testing scenarios.
 *
 * @example
 * ```typescript
 * import { createContainer } from '@stratix/runtime';
 * import { ApplicationBuilderHelpers } from '@stratix/runtime';
 *
 * const container = createContainer();
 * const app = await ApplicationBuilderHelpers.createWithDefaults(container)
 *   .usePlugin(new PostgresPlugin())
 *   .build();
 * ```
 */
export class ApplicationBuilderHelpers {
    /**
     * Creates an ApplicationBuilder with in-memory defaults for development.
     *
     * Automatically registers:
     * - InMemoryCommandBus
     * - InMemoryQueryBus
     * - InMemoryEventBus
     * - ConsoleLogger
     *
     * @param container - The Awilix DI container to use
     * @returns ApplicationBuilder with defaults configured
     *
     * @example
     * ```typescript
     * import { createContainer, ApplicationBuilderHelpers } from '@stratix/runtime';
     *
     * const container = createContainer();
     * const app = await ApplicationBuilderHelpers.createWithDefaults(container)
     *   .usePlugin(new MyPlugin())
     *   .build();
     * ```
     */
    static createWithDefaults(container: AwilixContainer): ApplicationBuilder {
        const logger = new ConsoleLogger();

        // Register default messaging infrastructure using Awilix
        container.register({
            commandBus: asClass(InMemoryCommandBus).singleton(),
            queryBus: asClass(InMemoryQueryBus).singleton(),
            eventBus: asClass(InMemoryEventBus).singleton(),
            logger: asValue(logger)
        });

        return ApplicationBuilder.create()
            .useContainer(container)
            .useLogger(logger);
    }

    /**
     * Creates an ApplicationBuilder optimized for testing.
     *
     * Similar to createWithDefaults but with test-specific configuration:
     * - Reduced log level
     * - In-memory implementations for all infrastructure
     *
     * @param container - The Awilix DI container to use
     * @returns ApplicationBuilder configured for testing
     *
     * @example
     * ```typescript
     * import { createContainer, ApplicationBuilderHelpers } from '@stratix/runtime';
     *
     * describe('My Integration Tests', () => {
     *   let app: Application;
     *
     *   beforeEach(async () => {
     *     const container = createContainer();
     *     app = await ApplicationBuilderHelpers.createForTesting(container)
     *       .useContext(new MyModule())
     *       .build();
     *     await app.start();
     *   });
     *
     *   afterEach(async () => {
     *     await app.stop();
     *   });
     * });
     * ```
     */
    static createForTesting(container: AwilixContainer): ApplicationBuilder {
        // For testing, we want minimal logging
        const logger = new ConsoleLogger();

        // Register in-memory implementations using Awilix
        container.register({
            commandBus: asClass(InMemoryCommandBus).singleton(),
            queryBus: asClass(InMemoryQueryBus).singleton(),
            eventBus: asClass(InMemoryEventBus).singleton(),
            logger: asValue(logger)
        });

        return ApplicationBuilder.create()
            .useContainer(container)
            .useLogger(logger);
    }
}
