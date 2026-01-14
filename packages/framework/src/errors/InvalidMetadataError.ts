import { FrameworkError } from './FrameworkError.js';

export class InvalidMetadataError extends FrameworkError {
  constructor(metadataName: string, details: string) {
    super('INVALID_METADATA_ERROR', `The metadata "${metadataName}" is invalid: ${details}`);
    this.name = 'InvalidMetadataError';
  }
}
