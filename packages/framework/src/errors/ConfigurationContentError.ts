import { FrameworkError } from './FrameworkError.js';

export class ConfigurationContentError extends FrameworkError {
  constructor(filePath: string, message: string) {
    super('CONFIGURATION_CONTENT_ERROR', `Error in configuration file "${filePath}": ${message}`);
    this.name = 'ConfigurationContentError';
  }
}
