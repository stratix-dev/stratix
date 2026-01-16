import { Logger, LoggerConfig, LogLevel, LogTransport } from '@stratix/core';
import { StratixLogger } from './StratixLogger.js';
import { ConsoleTransport } from './ConsoleTransport.js';

export class LoggerFactory {
  private readonly config: Required<LoggerConfig>;
  private readonly transports: LogTransport[];

  constructor({
    colorize,
    context,
    enrichment,
    format,
    level,
    transports,
    timestamp,
    sanitize
  }: LoggerConfig = {}) {
    this.config = this.normalizeConfig({
      colorize,
      context,
      enrichment,
      format,
      level,
      transports,
      timestamp,
      sanitize
    });
    this.transports = this.config.transports;
  }

  /**
   * Crea un nuevo logger con contexto
   */
  create(context?: string): Logger {
    return new StratixLogger({ config: this.config, transports: this.transports, context });
  }

  /**
   * Crea un child logger con contexto adicional
   */
  child(parent: StratixLogger, childContext: string): Logger {
    const fullContext = parent.context ? `${parent.context}.${childContext}` : childContext;

    return this.create(fullContext);
  }

  private normalizeConfig(config: LoggerConfig): Required<LoggerConfig> {
    const isDev = process.env.NODE_ENV !== 'production';

    return {
      level: config.level ?? LogLevel.DEBUG,
      format: config.format ?? (isDev ? 'pretty' : 'json'),
      timestamp: config.timestamp ?? true,
      colorize: config.colorize ?? isDev,
      context: config.context ?? '',
      transports: config.transports ?? [new ConsoleTransport({})],
      sanitize: {
        enabled: config.sanitize?.enabled ?? !isDev,
        patterns: config.sanitize?.patterns ?? [
          'password',
          'token',
          'secret',
          'apiKey',
          /credit.*card/i,
          /ssn/i
        ],
        replacement: config.sanitize?.replacement ?? '[REDACTED]',
        customSanitizer: config.sanitize?.customSanitizer
      },
      enrichment: config.enrichment ?? {}
    };
  }

  /**
   * Cierra todos los transports
   */
  async close(): Promise<void> {
    await Promise.all(this.transports.map((t) => t.close?.()));
  }
}
