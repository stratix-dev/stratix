import type { Logger } from '@stratix/core';
import { LogLevel } from '@stratix/core';

const Colors = {
  Reset: '\x1b[0m',
  Bright: '\x1b[1m',
  FgRed: '\x1b[31m',
  FgGreen: '\x1b[32m',
  FgYellow: '\x1b[33m',
  FgBlue: '\x1b[34m',
  FgCyan: '\x1b[36m',
  FgGray: '\x1b[90m',
} as const;

/**
 * Console-based logger implementation.
 *
 * Provides colored, formatted console output with configurable log levels.
 *
 * @category Infrastructure
 */
export class ConsoleLogger implements Logger {
  private readonly level: LogLevel;
  private readonly useColors: boolean;

  private readonly levelPriority: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
    [LogLevel.FATAL]: 4,
  };

  constructor(level: LogLevel = LogLevel.INFO, useColors = true) {
    this.level = level;
    this.useColors = useColors;
  }

  log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message);
    const output = context
      ? `${formattedMessage} ${JSON.stringify(context)}`
      : formattedMessage;

    this.writeToConsole(level, output);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  fatal(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.FATAL, message, context);
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.level];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const levelLabel = this.formatLevel(level);
    return `${this.useColors ? Colors.FgGray : ''}${timestamp}${this.useColors ? Colors.Reset : ''} ${levelLabel} ${message}`;
  }

  private formatLevel(level: LogLevel): string {
    const label = `[${level.toUpperCase()}]`;

    if (!this.useColors) return label;

    switch (level) {
      case LogLevel.DEBUG:
        return `${Colors.FgBlue}${label}${Colors.Reset}`;
      case LogLevel.INFO:
        return `${Colors.FgGreen}${label}${Colors.Reset}`;
      case LogLevel.WARN:
        return `${Colors.FgYellow}${label}${Colors.Reset}`;
      case LogLevel.ERROR:
        return `${Colors.FgRed}${label}${Colors.Reset}`;
      case LogLevel.FATAL:
        return `${Colors.Bright}${Colors.FgRed}${label}${Colors.Reset}`;
      default:
        return label;
    }
  }

  private writeToConsole(level: LogLevel, output: string): void {
    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(output);
        break;
    }
  }
}
