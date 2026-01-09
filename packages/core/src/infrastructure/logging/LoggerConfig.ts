import { LogLevel } from './LogLevel.js';
import { LogTransport } from './LogTransport.js';
import { SanitizeConfig } from './SanitizeConfig.js';

/**
 * Format for log output
 */
export type LogFormat = 'json' | 'pretty' | 'compact' | 'text';

/**
 * Configuration for a logger instance.
 * Implementations can extend this interface with additional options.
 *
 * @category Infrastructure
 */
export interface LoggerConfig {
  /**
   * Minimum log level to output
   * @default LogLevel.DEBUG
   */
  level?: LogLevel;

  /**
   * Output format
   * @default 'pretty' in development, 'json' in production
   */
  format?: LogFormat;

  /**
   * Include timestamp in logs
   * @default true
   */
  timestamp?: boolean;

  /**
   * Colorize output (terminal colors)
   * @default true in development, false in production
   */
  colorize?: boolean;

  /**
   * Global context for all logs from this logger
   */
  context?: string;

  /**
   * Transports to write logs to
   * @default [ConsoleTransport]
   */
  transports?: LogTransport[];

  /**
   * Configuration for sanitizing sensitive data
   */
  sanitize?: SanitizeConfig;

  /**
   * Global metadata added to all log entries
   */
  enrichment?: Record<string, unknown | (() => unknown)>;
}
