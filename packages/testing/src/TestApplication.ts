import { Application, ApplicationBuilder, ConsoleLogger, createContainer } from '@stratix/runtime';
import type { AwilixContainer } from '@stratix/runtime';
import type { Plugin, Logger } from '@stratix/core';
import { LogLevel } from '@stratix/core';

/**
 * Test Application Builder
 *
 * Provides a simplified way to create test applications with in-memory implementations.
 *
 * @example
 * ```typescript
 * const app = await TestApplication.create()
 *   .useInMemoryDefaults()
 *   .build();
 *
 * await app.start();
 * // Run tests
 * await app.stop();
 * ```
 *
 * @category Testing
 */
export class TestApplication {
  private builder: ApplicationBuilder;
  private testContainer?: AwilixContainer;
  private testLogger?: Logger;

  private constructor() {
    this.builder = ApplicationBuilder.create();
  }

  /**
   * Create a new test application builder
   */
  static create(): TestApplication {
    return new TestApplication();
  }

  /**
   * Use in-memory defaults for testing
   *
   * Includes:
   * - Awilix Container
   * - Console Logger (error level only)
   */
  useInMemoryDefaults(): this {
    this.testContainer = createContainer();
    this.testLogger = new ConsoleLogger({ level: LogLevel.ERROR });

    this.builder.useContainer(this.testContainer).useLogger(this.testLogger);

    return this;
  }

  /**
   * Set a custom container
   */
  useContainer(container: AwilixContainer): this {
    this.builder.useContainer(container);
    return this;
  }

  /**
   * Set a custom logger
   */
  useLogger(logger: Logger): this {
    this.builder.useLogger(logger);
    return this;
  }

  /**
   * Add a custom plugin
   */
  usePlugin(plugin: Plugin, config?: unknown): this {
    this.builder.usePlugin(plugin, config);
    return this;
  }

  /**
   * Build the application
   */
  async build(): Promise<Application> {
    return await this.builder.build();
  }
}

/**
 * Create and start a test application
 *
 * @example
 * ```typescript
 * const app = await createTestApp();
 * // Run tests
 * await app.stop();
 * ```
 */
export async function createTestApp(): Promise<Application> {
  const app = await TestApplication.create().useInMemoryDefaults().build();

  await app.start();

  return app;
}
