import { LogEntry } from './LogEntry.js';

/**
 * Transport for writing log entries to a destination.
 * Transports can write to console, files, databases, remote services, etc.
 *
 * @category Infrastructure
 *
 * @example
 * ```typescript
 * class ConsoleTransport implements LogTransport {
 *   readonly name = 'console';
 *
 *   write(entry: LogEntry): void {
 *     console.log(JSON.stringify(entry));
 *   }
 * }
 * ```
 */
export interface LogTransport {
  /**
   * Unique name for this transport
   */
  readonly name: string;

  /**
   * Write a log entry to the transport destination.
   * Can be synchronous or asynchronous.
   *
   * @param entry - Log entry to write
   */
  write(entry: LogEntry): void | Promise<void>;

  /**
   * Flush any buffered logs.
   * Optional - implement if transport buffers writes.
   */
  flush?(): void | Promise<void>;

  /**
   * Close the transport and release resources.
   * Optional - implement if transport holds resources (file handles, connections).
   */
  close?(): void | Promise<void>;
}
