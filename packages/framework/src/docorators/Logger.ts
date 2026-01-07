import { MetadataStorage } from '../runtime/MetadataStorage.js';
import { StratixError } from '../errors/StratixError.js';
import { Error } from '../errors/Error.js';
import type { Logger as ILogger } from '@stratix/core';

/**
 * Options for @Logger decorator
 */
export interface LoggerOptions {
  /**
   * Custom context name for the logger.
   * If not provided, uses the class name.
   */
  context?: string;

  /**
   * Minimum log level. Logs below this level will be ignored.
   * @default 'debug'
   */
  level?: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
}

/**
 * Property decorator that injects a Logger instance from the DI container.
 *
 * The logger is lazily initialized and includes the class context automatically.
 *
 * @example
 * ```typescript
 * @CommandHandler(CreateUserCommand)
 * export class CreateUserHandler {
 *   @Logger()
 *   private readonly logger!: ILogger;
 *
 *   async execute(command: CreateUserCommand) {
 *     this.logger.info('Creating user', { email: command.email });
 *     // ...
 *   }
 * }
 * ```
 *
 * @example With custom context
 * ```typescript
 * export class OrderService {
 *   @Logger({ context: 'OrderProcessing' })
 *   private readonly logger!: ILogger;
 * }
 * ```
 */
export function Logger(options?: LoggerOptions) {
  return function (
    _target: unknown,
    context: ClassAccessorDecoratorContext | ClassFieldDecoratorContext
  ): any {
    if (context.kind !== 'accessor' && context.kind !== 'field') {
      throw new StratixError(
        Error.RUNTIME_ERROR,
        '@Logger can only be applied to class properties or accessors'
      );
    }

    const propertyName = String(context.name);

    // Store metadata for this logger injection
    context.addInitializer(function (this: any) {
      const contextName = options?.context ?? this.constructor.name;

      MetadataStorage.addLoggerMetadata(this.constructor, {
        propertyKey: propertyName,
        context: contextName,
        level: options?.level ?? 'debug',
        target: this.constructor
      });

      // Initialize a lazy-loaded logger
      Object.defineProperty(this, propertyName, {
        get(): ILogger {
          // Check if logger is already cached
          const cacheKey = `__logger_${propertyName}`;
          if (this[cacheKey]) {
            return this[cacheKey];
          }

          // Get the base logger from DI container
          const baseLogger = this.getLogger?.() ?? (this.container?.resolve('logger') as ILogger);

          if (!baseLogger) {
            // Fallback to console if no logger is available
            console.warn(`[Stratix] No logger found in DI container for ${contextName}`);
            return createConsoleLogger(contextName);
          }

          // Create a contextual logger wrapper
          const contextualLogger = createContextualLogger(baseLogger, contextName);

          // Cache it
          Object.defineProperty(this, cacheKey, {
            value: contextualLogger,
            writable: false,
            enumerable: false,
            configurable: false
          });

          return contextualLogger;
        },
        enumerable: true,
        configurable: true
      });
    });

    // For accessor decorator, return getter/setter
    if (context.kind === 'accessor') {
      return {
        get(this: any): ILogger {
          const propertyKey = `__logger_${propertyName}`;
          return this[propertyKey];
        },
        set() {
          throw new StratixError(Error.RUNTIME_ERROR, 'Logger property is read-only');
        }
      };
    }
  };
}

/**
 * Creates a contextual logger that wraps a base logger with context information
 */
function createContextualLogger(baseLogger: ILogger, context: string): ILogger {
  return {
    debug(message: string, ctx?: Record<string, unknown>): void {
      baseLogger.debug(message, { ...ctx, context });
    },

    info(message: string, ctx?: Record<string, unknown>): void {
      baseLogger.info(message, { ...ctx, context });
    },

    warn(message: string, ctx?: Record<string, unknown>): void {
      baseLogger.warn(message, { ...ctx, context });
    },

    error(message: string, ctx?: Record<string, unknown>): void {
      baseLogger.error(message, { ...ctx, context });
    },

    fatal(message: string, ctx?: Record<string, unknown>): void {
      baseLogger.fatal(message, { ...ctx, context });
    },

    log(level: any, message: string, ctx?: Record<string, unknown>): void {
      baseLogger.log(level, message, { ...ctx, context });
    }
  };
}

/**
 * Fallback console logger when DI container is not available
 */
function createConsoleLogger(context: string): ILogger {
  return {
    debug(message: string, ctx?: Record<string, unknown>): void {
      console.debug(`[DEBUG][${context}] ${message}`, ctx ?? {});
    },

    info(message: string, ctx?: Record<string, unknown>): void {
      console.info(`[INFO][${context}] ${message}`, ctx ?? {});
    },

    warn(message: string, ctx?: Record<string, unknown>): void {
      console.warn(`[WARN][${context}] ${message}`, ctx ?? {});
    },

    error(message: string, ctx?: Record<string, unknown>): void {
      console.error(`[ERROR][${context}] ${message}`, ctx ?? {});
    },

    fatal(message: string, ctx?: Record<string, unknown>): void {
      console.error(`[FATAL][${context}] ${message}`, ctx ?? {});
    },

    log(level: any, message: string, ctx?: Record<string, unknown>): void {
      const prefix = `[${String(level).toUpperCase()}][${context}]`;
      console.log(`${prefix} ${message}`, ctx ?? {});
    }
  };
}
