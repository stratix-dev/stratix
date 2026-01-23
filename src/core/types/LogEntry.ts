import { LogLevel } from './LogLevel.js';

/**
 * Structured log entry.
 * Represents a single log message with all its metadata.
 *
 * @category Infrastructure
 */
export interface LogEntry {
  /**
   * Log level
   */
  readonly level: LogLevel;

  /**
   * Log message
   */
  readonly message: string;

  /**
   * Timestamp when log was created
   */
  readonly timestamp: Date;

  /**
   * Logger context (e.g., service name, class name)
   */
  readonly context?: string;

  /**
   * Additional structured metadata
   */
  readonly metadata?: Record<string, unknown>;

  /**
   * Error object (if logging an error)
   */
  readonly error?: Error;

  /**
   * Correlation ID for tracing related logs
   */
  readonly correlationId?: string;

  /**
   * Distributed trace ID
   */
  readonly traceId?: string;

  /**
   * Span ID for distributed tracing
   */
  readonly spanId?: string;
}
