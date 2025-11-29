import type { ValidationError } from './ConfigSchema.js';

/**
 * Base configuration error
 */
export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly key?: string
  ) {
    super(message);
    this.name = 'ConfigError';
    Object.setPrototypeOf(this, ConfigError.prototype);
  }
}

/**
 * Error thrown when a required configuration key is not found
 */
export class ConfigNotFoundError extends ConfigError {
  constructor(key: string) {
    super(`Configuration key not found: ${key}`, key);
    this.name = 'ConfigNotFoundError';
    Object.setPrototypeOf(this, ConfigNotFoundError.prototype);
  }
}

/**
 * Error thrown when configuration validation fails
 */
export class ConfigValidationError extends ConfigError {
  constructor(
    message: string,
    public readonly errors: ValidationError[]
  ) {
    super(message);
    this.name = 'ConfigValidationError';
    Object.setPrototypeOf(this, ConfigValidationError.prototype);
  }

  /**
   * Format validation errors as a readable string
   */
  formatErrors(): string {
    return this.errors
      .map(err => `  - ${err.path}: ${err.message}`)
      .join('\n');
  }
}

/**
 * Error thrown when configuration parsing fails
 */
export class ConfigParseError extends ConfigError {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ConfigParseError';
    Object.setPrototypeOf(this, ConfigParseError.prototype);
  }
}
