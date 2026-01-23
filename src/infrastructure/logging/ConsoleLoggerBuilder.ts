import { ConsoleTransport } from './ConsoleTransport.js';
import { FileTransport } from './FileTransport.js';
import { LogLevel } from '../../core/types/LogLevel.js';
import { LoggerConfig, LogTransport } from '../../core/ports/Logger.js';
import { LoggerFactory } from '../../runtime/factories/LoggerFactory.js';
import { ConsoleLoggerFactory } from './ConsoleLoggerFactory.js';

/**
 * Builder fluent para configurar loggers
 */
export class ConsoleLoggerBuilder {
  private config: Partial<LoggerConfig> = {};

  /**
   * Crea un builder vacío
   */
  static create(): ConsoleLoggerBuilder {
    return new ConsoleLoggerBuilder();
  }

  /**
   * Preset para desarrollo
   */
  static development(): LoggerFactory {
    return ConsoleLoggerBuilder.create()
      .withLevel(LogLevel.DEBUG)
      .withFormat('pretty')
      .withColors()
      .withConsole()
      .build();
  }

  /**
   * Preset para producción
   */
  static production(logPath?: string): LoggerFactory {
    const builder = ConsoleLoggerBuilder.create()
      .withLevel(LogLevel.INFO)
      .withFormat('json')
      .withoutColors()
      .withSanitization()
      .withConsole();

    if (logPath) {
      builder.withFile(logPath);
    }

    return builder.build();
  }

  /**
   * Preset para testing
   */
  static testing(): LoggerFactory {
    return ConsoleLoggerBuilder.create()
      .withLevel(LogLevel.ERROR) // Solo errores en tests
      .withFormat('compact')
      .withConsole()
      .build();
  }

  /**
   * Logger silencioso (no output)
   */
  static silent(): LoggerFactory {
    return ConsoleLoggerBuilder.create().withLevel(LogLevel.FATAL).build();
  }

  /**
   * Configura nivel mínimo
   */
  withLevel(level: LogLevel): this {
    this.config.level = level;
    return this;
  }

  /**
   * Configura formato de salida
   */
  withFormat(format: 'json' | 'pretty' | 'compact'): this {
    this.config.format = format;
    return this;
  }

  /**
   * Habilita timestamps
   */
  withTimestamps(): this {
    this.config.timestamp = true;
    return this;
  }

  /**
   * Deshabilita timestamps
   */
  withoutTimestamps(): this {
    this.config.timestamp = false;
    return this;
  }

  /**
   * Habilita colores
   */
  withColors(): this {
    this.config.colorize = true;
    return this;
  }

  /**
   * Deshabilita colores
   */
  withoutColors(): this {
    this.config.colorize = false;
    return this;
  }

  /**
   * Añade contexto global
   */
  withContext(context: string): this {
    this.config.context = context;
    return this;
  }

  /**
   * Habilita sanitización de datos sensibles
   */
  withSanitization(patterns?: Array<string | RegExp>): this {
    this.config.sanitize = {
      enabled: true,
      patterns: patterns ?? ['password', 'token', 'secret', 'apiKey']
    };
    return this;
  }

  /**
   * Añade metadata global
   */
  withEnrichment(enrichment: Record<string, unknown>): this {
    this.config.enrichment = enrichment;
    return this;
  }

  /**
   * Añade transport de console
   */
  withConsole(): this {
    if (!this.config.transports) {
      this.config.transports = [];
    }
    this.config.transports.push(
      new ConsoleTransport({ colorize: this.config.colorize, format: this.config.format })
    );
    return this;
  }

  /**
   * Añade transport de archivo
   */
  withFile(filePath: string, maxSize?: number): this {
    if (!this.config.transports) {
      this.config.transports = [];
    }
    this.config.transports.push(new FileTransport({ filePath, maxSize }));
    return this;
  }

  /**
   * Añade transport personalizado
   */
  withTransport(transport: LogTransport): this {
    if (!this.config.transports) {
      this.config.transports = [];
    }
    this.config.transports.push(transport);
    return this;
  }

  /**
   * Construye la factory
   */
  build(): LoggerFactory {
    return new ConsoleLoggerFactory(this.config);
  }
}
