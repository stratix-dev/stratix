import { ClassConstructor } from '@stratix/core';
import { AppMetadata, CommandHandlerMetadata, ContextMetadata } from './types.js';
import { METADATA_KEYS, STRATIX_METADATA } from './metadataKeys.js';

export class MetadataReader {
  static getAppMetadata(target: ClassConstructor): AppMetadata {
    return (target as any)[STRATIX_METADATA]?.[METADATA_KEYS.APP];
  }

  static getContextMetadata(target: ClassConstructor): ContextMetadata | undefined {
    return (target as any)[STRATIX_METADATA]?.[METADATA_KEYS.CONTEXT];
  }

  static getCommandHandlerMetadata(target: ClassConstructor): CommandHandlerMetadata | undefined {
    return (target as any)[STRATIX_METADATA]?.[METADATA_KEYS.COMMAND_HANDLER];
  }
  static hasMetadata(target: ClassConstructor, key: symbol): boolean {
    return (target as any)[STRATIX_METADATA]?.[key] !== undefined;
  }

  static isStratixApp(target: ClassConstructor): boolean {
    return this.hasMetadata(target, METADATA_KEYS.APP);
  }

  static isContext(target: ClassConstructor): boolean {
    return this.hasMetadata(target, METADATA_KEYS.CONTEXT);
  }
}
