import { ApplicationBuilder } from './ApplicationBuilder.js';
import { InMemoryCommandBus } from '../messaging/InMemoryCommandBus.js';
import { InMemoryQueryBus } from '../messaging/InMemoryQueryBus.js';
import { InMemoryEventBus } from '../messaging/InMemoryEventBus.js';
import { ConsoleLogger } from '../infrastructure/ConsoleLogger.js';
import type { Container } from '@stratix/core';
import { ServiceLifetime } from '@stratix/core';

/**
 * Helper functions for creating ApplicationBuilder instances with sensible defaults.
 *
 * These helpers reduce boilerplate when setting up applications, especially for
 * development and testing scenarios.
 *
 * @example
 * ```typescript
 * // Quick setup for development
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
     * @param container - The DI container to use
     * @returns ApplicationBuilder with defaults configured
     *
     * @example
     * ```typescript
     * import { AwilixContainer } from '@stratix/di-awilix';
     *
     * const container = new AwilixContainer();
     * const app = await ApplicationBuilderHelpers.createWithDefaults(container)
     *   .usePlugin(new MyPlugin())
     *   .build();
     * ```
     */
    static createWithDefaults(container: Container): ApplicationBuilder {
        const logger = new ConsoleLogger();

        // Register default messaging infrastructure
        container.register(
            'commandBus',
            () => new InMemoryCommandBus(),
            { lifetime: ServiceLifetime.SINGLETON }
        );

        container.register(
            'queryBus',
            () => new InMemoryQueryBus(),
            { lifetime: ServiceLifetime.SINGLETON }
        );

        container.register(
            'eventBus',
            () => new InMemoryEventBus(),
            { lifetime: ServiceLifetime.SINGLETON }
        );

        container.register('logger', () => logger, { lifetime: ServiceLifetime.SINGLETON });

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
     * @param container - The DI container to use
     * @returns ApplicationBuilder configured for testing
     *
     * @example
     * ```typescript
     * describe('My Integration Tests', () => {
     *   let app: Application;
     *
     *   beforeEach(async () => {
     *     const container = new AwilixContainer();
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
    static createForTesting(container: Container): ApplicationBuilder {
        // For testing, we want minimal logging
        const logger = new ConsoleLogger();

        // Register in-memory implementations
        container.register(
            'commandBus',
            () => new InMemoryCommandBus(),
            { lifetime: ServiceLifetime.SINGLETON }
        );

        container.register(
            'queryBus',
            () => new InMemoryQueryBus(),
            { lifetime: ServiceLifetime.SINGLETON }
        );

        container.register(
            'eventBus',
            () => new InMemoryEventBus(),
            { lifetime: ServiceLifetime.SINGLETON }
        );

        container.register('logger', () => logger, { lifetime: ServiceLifetime.SINGLETON });

        return ApplicationBuilder.create()
            .useContainer(container)
            .useLogger(logger);
    }
}
