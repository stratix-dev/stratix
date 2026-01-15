import { LogEntry, LogLevel, LogTransport } from '@stratix/core';
import { LogFormat } from '../../../core/dist/infrastructure/logging/LoggerConfig.js';

export class ConsoleTransport implements LogTransport {
  readonly name = 'console';

  constructor(
    private readonly format: LogFormat = 'pretty',
    private readonly colorize: boolean = true
  ) {}

  write(entry: LogEntry): void {
    const formatted = this.format === 'json' ? this.formatJson(entry) : this.formatPretty(entry);

    this.writeToConsole(entry.level, formatted);
  }

  private formatJson(entry: LogEntry): string {
    return JSON.stringify({
      level: entry.level,
      message: entry.message,
      timestamp: entry.timestamp.toISOString(),
      ...(entry.context && { context: entry.context }),
      ...(entry.metadata && { ...entry.metadata })
    });
  }

  private formatPretty(entry: LogEntry): string {
    const parts: string[] = [];

    // Timestamp
    parts.push(entry.timestamp.toISOString());

    // Level (colorized)
    const levelStr = this.colorize
      ? this.colorizeLevel(entry.level)
      : `[${entry.level.toUpperCase()}]`;
    parts.push(levelStr);

    // Context
    if (entry.context) {
      parts.push(`[${entry.context}]`);
    }

    // Message
    parts.push(entry.message);

    // Metadata
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      parts.push(JSON.stringify(entry.metadata));
    }

    return parts.join(' ');
  }

  private colorizeLevel(level: LogLevel): string {
    const colors: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m', // Green
      [LogLevel.WARN]: '\x1b[33m', // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.FATAL]: '\x1b[35m' // Magenta
    };

    const color = colors[level];
    return `${color}[${level.toUpperCase()}]\x1b[0m`;
  }

  private writeToConsole(level: LogLevel, message: string): void {
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(message);
        break;
      case LogLevel.INFO:
        console.info(message);
        break;
      case LogLevel.WARN:
        console.warn(message);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(message);
        break;
    }
  }
}
