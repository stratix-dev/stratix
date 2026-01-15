import { LoggerConfig, LogLevel, LogTransport } from '@stratix/core';
import { LoggerFactory } from './LoggerFactory.js';
import { ConsoleTransport } from './ConsoleTransport.js';
import { FileTransport } from './FileTransport.js';

/**
 * Builder fluent para configurar loggers
 */
export class LoggerBuilder {
  private config: Partial<LoggerConfig> = {};

  /**
   * Crea un builder vacío
   */
  static create(): LoggerBuilder {
    return new LoggerBuilder();
  }

  /**
   * Preset para desarrollo
   */
  static development(): LoggerFactory {
    return LoggerBuilder.create()
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
    const builder = LoggerBuilder.create()
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
    return LoggerBuilder.create()
      .withLevel(LogLevel.ERROR) // Solo errores en tests
      .withFormat('compact')
      .withConsole()
      .build();
  }

  /**
   * Logger silencioso (no output)
   */
  static silent(): LoggerFactory {
    return LoggerBuilder.create().withLevel(LogLevel.FATAL).build();
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
  withEnrichment(enrichment: Record<string, unknown | (() => unknown)>): this {
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
    return new LoggerFactory(this.config);
  }
}
