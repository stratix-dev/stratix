import type { Logger } from '@stratix/core';
import type { AwilixContainer } from 'awilix';
import { LifecycleOrchestrator } from './LifecycleOrchestrator.js';

/**
 * The Stratix application instance.
 *
 * Manages the application lifecycle (start, stop).
 */
export class StratixApplication {
  private isRunning = false;
  private lifecycleOrchestrator: LifecycleOrchestrator;

  constructor(
    private readonly container: AwilixContainer,
    private readonly logger: Logger,
    lifecycleOrchestrator?: LifecycleOrchestrator
  ) {
    this.lifecycleOrchestrator = lifecycleOrchestrator || new LifecycleOrchestrator(logger);
  }

  /**
   * Starts the application.
   *
   * Executes lifecycle phases:
   * 1. Initialize (plugins → modules)
   * 2. Start (plugins → modules)
   * 3. Ready (modules + plugins notified)
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Application is already running');
    }

    this.logger.info('Starting application...');

    // Execute lifecycle phases
    await this.lifecycleOrchestrator.initialize();
    await this.lifecycleOrchestrator.start();
    await this.lifecycleOrchestrator.ready();

    this.isRunning = true;
    this.logger.info('Application started successfully');
  }

  /**
   * Stops the application gracefully.
   *
   * Executes lifecycle phases:
   * 1. Shutdown notification (modules → plugins)
   * 2. Stop (reverse order: modules → plugins)
   * 3. Dispose container
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping application...');

    // Execute lifecycle phases
    await this.lifecycleOrchestrator.shutdown();
    await this.lifecycleOrchestrator.stop();

    // Dispose container
    await this.container.dispose();

    this.isRunning = false;
    this.logger.info('Application stopped');
  }

  /**
   * Gets the DI container.
   */
  getContainer(): AwilixContainer {
    return this.container;
  }

  /**
   * Resolves a service from the container.
   */
  resolve<T>(token: string): T {
    return this.container.resolve<T>(token);
  }

  /**
   * Gets the lifecycle orchestrator (for testing).
   */
  getLifecycleOrchestrator(): LifecycleOrchestrator {
    return this.lifecycleOrchestrator;
  }
}
