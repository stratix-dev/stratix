import { Container } from '../container/Container.js';
import { Logger } from '../logging/Logger.js';

/**
 * Configuration provided to contexts during initialization.
 *
 * Contexts can:
 * - Access the DI container to resolve dependencies
 * - Access the logger for logging
 * - Access config specific to the context
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
   * Gets config for this context.
   *
   * @returns The context config, or undefined if not set
   *
   * @example
   * ```typescript
   * const config = contextConfig.getConfig<ProductsConfig>();
   * ```
   */
  getConfig<T = unknown>(): T | undefined;
}
