import { Logger, LogLevel } from '@stratix/core';

export class StratixLogger implements Logger {
  debug(message: string, context?: Record<string, unknown>): void {
    console.debug(`[DEBUG] ${message}`, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    console.error(`[ERROR] ${message}`, context);
  }

  fatal(message: string, context?: Record<string, unknown>): void {
    console.error(`[FATAL] ${message}`, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    console.info(`[INFO] ${message}`, context);
  }

  log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    switch (level) {
      case LogLevel.DEBUG:
        this.debug(message, context);
        break;
      case LogLevel.INFO:
        this.info(message, context);
        break;
      case LogLevel.WARN:
        this.warn(message, context);
        break;
      case LogLevel.ERROR:
        this.error(message, context);
        break;
      case LogLevel.FATAL:
        this.fatal(message, context);
        break;
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(`[WARN] ${message}`, context);
  }

}
