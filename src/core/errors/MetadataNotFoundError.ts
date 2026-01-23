import { FrameworkError } from './FrameworkError.js';

export class MetadataNotFoundError extends FrameworkError {
  constructor(className: string, keyName: string) {
    super('METADATA_NOT_FOUND_ERROR', `Metadata '${keyName}' not found on class '${className}'.`);
    this.name = 'MetadataNotFoundError';
  }
}
