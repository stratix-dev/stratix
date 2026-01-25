import { LogEntry } from '../types/LogEntry.js';
import { LogFormat } from '../types/LogFormat.js';
import { LogLevel } from '../types/LogLevel.js';

export interface LoggerConfig {
  level?: LogLevel;
  format?: LogFormat;
  timestamp?: boolean;
  colorize?: boolean;
  context?: string;
  transports?: LogTransport[];
  sanitize?: SanitizeConfig;
  enrichment?: Record<string, unknown>;
}

export interface LogTransport {
  readonly name: string;
  write(entry: LogEntry): void | Promise<void>;
  flush?(): void | Promise<void>;
  close?(): void | Promise<void>;
}

export interface SanitizeConfig {
  enabled?: boolean;
  patterns?: Array<string | RegExp>;
  replacement?: string;
  customSanitizer?: (key: string, value: unknown) => unknown;
}

export interface Logger {
  log(level: LogLevel, message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  fatal(message: string, context?: Record<string, unknown>): void;
  child?(context: string): Logger;
}
