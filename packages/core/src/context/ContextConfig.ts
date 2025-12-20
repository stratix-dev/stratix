import type { Container } from '../container/Container.js';
import type { Logger } from '../infrastructure/Logger.js';

/**
 * Configuration provided to contexts during initialization.
 *
 * Contexts can:
 * - Access the DI container to resolve dependencies
 * - Access the logger for logging
 * - Access configuration specific to the context
 * @category Runtime & Application
 */
export interface ContextConfig {
  /**
   * The dependency injection container.
   */
  readonly container: Container;

  /**
   * The logger instance.
   */
  readonly logger: Logger;

  /**
   * Gets configuration for this context.
   *
   * @returns The context configuration, or undefined if not set
   *
   * @example
   * ```typescript
   * const config = contextConfig.getConfig<ProductsConfig>();
   * ```
   */
  getConfig<T = unknown>(): T | undefined;
}
