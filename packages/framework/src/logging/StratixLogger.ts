import { LogEntry, Logger, LoggerConfig, LogLevel, LogTransport } from '@stratix/core';

export class StratixLogger implements Logger {
  private readonly levelPriority: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
    [LogLevel.FATAL]: 4
  };

  constructor(
    private readonly config: Required<LoggerConfig>,
    private readonly transports: LogTransport[],
    public readonly context?: string
  ) {}

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, metadata);
  }

  fatal(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.FATAL, message, metadata);
  }

  log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    // Level filtering
    if (!this.shouldLog(level)) {
      return;
    }

    // Create entry
    const entry = this.createEntry(level, message, metadata);

    // Write to all transports
    this.write(entry);
  }

  /**
   * Crea un child logger con contexto adicional
   */
  child(childContext: string): Logger {
    const fullContext = this.context ? `${this.context}.${childContext}` : childContext;
    return new StratixLogger(this.config, this.transports, fullContext);
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.config.level];
  }

  private createEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>
  ): LogEntry {
    // Sanitize metadata
    const sanitized = this.config.sanitize.enabled ? this.sanitizeMetadata(metadata) : metadata;

    // Enrich with global metadata
    const enriched = this.enrichMetadata(sanitized);

    return {
      level,
      message,
      timestamp: new Date(),
      context: this.context,
      metadata: enriched
    };
  }

  private sanitizeMetadata(
    metadata?: Record<string, unknown>
  ): Record<string, unknown> | undefined {
    if (!metadata) return metadata;

    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (this.shouldSanitize(key)) {
        result[key] = this.config.sanitize.replacement;
      } else if (this.config.sanitize.customSanitizer) {
        result[key] = this.config.sanitize.customSanitizer(key, value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private shouldSanitize(key: string): boolean {
    if (!this.config.sanitize?.patterns) {
      return false;
    }

    return this.config.sanitize.patterns.some((pattern) => {
      if (typeof pattern === 'string') {
        return key.toLowerCase().includes(pattern.toLowerCase());
      }
      return pattern.test(key);
    });
  }

  private enrichMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (Object.keys(this.config.enrichment).length === 0) {
      return metadata;
    }

    const enrichment: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(this.config.enrichment)) {
      enrichment[key] = typeof value === 'function' ? value() : value;
    }

    return { ...enrichment, ...metadata };
  }

  private write(entry: LogEntry): void {
    for (const transport of this.transports) {
      try {
        transport.write(entry);
      } catch (error) {
        // Fallback to console.error if transport fails
        console.error('[Stratix] Transport error:', error);
        console.error('[Stratix] Original log:', entry);
      }
    }
  }
}
