import { LogLevel, Logger as ILogger } from '@stratix/core';
import { StratixError } from '../errors/StratixError.js';
import { Error } from '../errors/Error.js';
import { MetadataStorage } from '../runtime/MetadataStorage.js';
import { CORE_TOKENS } from '../tokens/CoreTokens.js';

export interface LoggerOptions {
  context?: string;
  minLevel?: LogLevel;
}

export function Logger(options: LoggerOptions = {}) {
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

    context.addInitializer(function (this: any) {
      const contextName = options?.context ?? this.constructor.name;

      // Store metadata
      MetadataStorage.addLoggerMetadata(this.constructor, {
        propertyKey: propertyName,
        context: contextName,
        minLevel: options?.minLevel,
        target: this.constructor
      });

      // Define property getter
      const cacheKey = Symbol(`logger_${propertyName}`);

      Object.defineProperty(this, propertyName, {
        get(): ILogger {
          // Check cache
          if (this[cacheKey]) {
            return this[cacheKey];
          }

          // Resolve base logger (type-safe token)
          if (!this.container) {
            console.warn(`[Stratix] No DI container found for ${contextName}`);
            return createNoopLogger();
          }

          const baseLogger = this.container.resolve(CORE_TOKENS.LOGGER) as ILogger;

          // Create child logger with context
          const logger = baseLogger.child
            ? baseLogger.child(contextName)
            : createContextWrapper(baseLogger, contextName);

          // Apply minLevel filtering if specified
          const filtered = options?.minLevel ? createLevelFilter(logger, options.minLevel) : logger;

          // Cache
          this[cacheKey] = filtered;

          return filtered;
        },
        enumerable: false,
        configurable: true
      });
    });
  };
}

// Helper: Wrapper of context for loggers that don't support .child()
function createContextWrapper(logger: ILogger, context: string): ILogger {
  return {
    debug: (msg, meta) => logger.debug(msg, { ...meta, context }),
    info: (msg, meta) => logger.info(msg, { ...meta, context }),
    warn: (msg, meta) => logger.warn(msg, { ...meta, context }),
    error: (msg, meta) => logger.error(msg, { ...meta, context }),
    fatal: (msg, meta) => logger.fatal(msg, { ...meta, context }),
    log: (level, msg, meta) => logger.log(level, msg, { ...meta, context })
  };
}

// Helper: Filter logger by minimum level
function createLevelFilter(logger: ILogger, minLevel: LogLevel): ILogger {
  const priority: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
    [LogLevel.FATAL]: 4
  };

  const shouldLog = (level: LogLevel) => priority[level] >= priority[minLevel];

  return {
    debug: (msg, meta) => shouldLog(LogLevel.DEBUG) && logger.debug(msg, meta),
    info: (msg, meta) => shouldLog(LogLevel.INFO) && logger.info(msg, meta),
    warn: (msg, meta) => shouldLog(LogLevel.WARN) && logger.warn(msg, meta),
    error: (msg, meta) => shouldLog(LogLevel.ERROR) && logger.error(msg, meta),
    fatal: (msg, meta) => shouldLog(LogLevel.FATAL) && logger.fatal(msg, meta),
    log: (level, msg, meta) => shouldLog(level) && logger.log(level, msg, meta)
  };
}

function createNoopLogger(): ILogger {
  const noop = () => {};
  return {
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    fatal: noop,
    log: noop
  };
}
