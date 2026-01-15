import { Logger } from './Logger.js';

/**
 * Factory for creating logger instances.
 * Used for creating loggers with specific configurations or contexts.
 *
 * @category Infrastructure
 *
 * @example
 * ```typescript
 * class MyLoggerFactory implements LoggerFactory {
 *   create(context?: string): Logger {
 *     return new MyLogger(context);
 *   }
 *
 *   child(parent: Logger, context: string): Logger {
 *     return parent.child?.(context) ?? this.create(context);
 *   }
 * }
 * ```
 */
export interface LoggerFactory {
  /**
   * Create a new logger instance.
   *
   * @param context - Optional context for the logger
   * @returns New logger instance
   */
  create(context?: string): Logger;

  /**
   * Create a child logger from an existing logger.
   *
   * @param parent - Parent logger instance
   * @param context - Child context to append
   * @returns New child logger instance
   */
  child?(parent: Logger, context: string): Logger;

  /**
   * Close the factory and cleanup resources.
   * Optional - implement if factory manages resources.
   */
  close?(): void | Promise<void>;
}
