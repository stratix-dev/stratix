import { ClassConstructor } from '@stratix/core';
import { AppMetadata, CommandHandlerMetadata, ContextMetadata } from './types.js';
import { METADATA_KEYS } from './metadataKeys.js';

export class MetadataReader {
  static getAppMetadata(target: ClassConstructor): AppMetadata {
    return (target as any)[Symbol.metadata]?.[METADATA_KEYS.APP];
  }

  static getContextMetadata(target: ClassConstructor): ContextMetadata | undefined {
    return (target as any)[Symbol.metadata]?.[METADATA_KEYS.CONTEXT];
  }

  static getCommandHandlerMetadata(target: ClassConstructor): CommandHandlerMetadata | undefined {
    return (target as any)[Symbol.metadata]?.[METADATA_KEYS.COMMAND_HANDLER];
  }
  static hasMetadata(target: ClassConstructor, key: string): boolean {
    return (target as any)[Symbol.metadata]?.[key] !== undefined;
  }

  static isStratixApp(target: ClassConstructor): boolean {
    return this.hasMetadata(target, METADATA_KEYS.APP);
  }

  static isContext(target: ClassConstructor): boolean {
    return this.hasMetadata(target, METADATA_KEYS.CONTEXT);
  }
}
