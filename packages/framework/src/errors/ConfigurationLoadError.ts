import { FrameworkError } from './FrameworkError.js';

export class ConfigurationLoadError extends FrameworkError {
  constructor(filePath: string, message: string) {
    super(
      'CONFIGURATION_LOAD_ERROR',
      `Failed to load configuration file "${filePath}": ${message}`
    );
    this.name = 'ConfigurationLoadError';
  }
}
