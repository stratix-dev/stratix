import { ClassConstructor } from '@stratix/core';
import { METADATA_KEYS, STRATIX_METADATA } from './metadataKeys.js';
import { AppMetadata, CommandHandlerMetadata, ContextMetadata } from './types.js';

export class MetadataWriter {
  static setAppMetadata(target: ClassConstructor, metadata: AppMetadata): void {
    if (!(target as any)[STRATIX_METADATA]) {
      (target as any)[STRATIX_METADATA] = {};
    }
    (target as any)[STRATIX_METADATA][METADATA_KEYS.APP] = metadata;
  }

  static setContextMetadata(target: ClassConstructor, metadata: ContextMetadata): void {
    if (!(target as any)[STRATIX_METADATA]) {
      (target as any)[STRATIX_METADATA] = {};
    }
    (target as any)[STRATIX_METADATA][METADATA_KEYS.CONTEXT] = metadata;
  }

  static setCommandHandlerMetadata(
    target: ClassConstructor,
    metadata: CommandHandlerMetadata
  ): void {
    if (!(target as any)[STRATIX_METADATA]) {
      (target as any)[STRATIX_METADATA] = {};
    }
    (target as any)[STRATIX_METADATA][METADATA_KEYS.COMMAND_HANDLER] = metadata;
  }
}
