import { METADATA_KEYS } from './metadataKeys.js';
import { AppMetadata, CommandHandlerMetadata, ContextMetadata } from './types.js';

export class MetadataWriter {
  static setAppMetadata(context: ClassDecoratorContext, metadata: AppMetadata): void {
    context.addInitializer(function (this: any) {
      this[Symbol.metadata] = this[Symbol.metadata] || {};
      this[Symbol.metadata][METADATA_KEYS.APP] = metadata;
    });
  }

  static setContextMetadata(context: ClassDecoratorContext, metadata: ContextMetadata): void {
    context.addInitializer(function (this: any) {
      this[Symbol.metadata] = this[Symbol.metadata] || {};
      this[Symbol.metadata][METADATA_KEYS.CONTEXT] = metadata;
    });
  }

  static setCommandHandlerMetadata(
    context: ClassDecoratorContext,
    metadata: CommandHandlerMetadata
  ): void {
    context.addInitializer(function (this: any) {
      this[Symbol.metadata] = this[Symbol.metadata] || {};
      this[Symbol.metadata][METADATA_KEYS.COMMAND_HANDLER] = metadata;
    });
  }
}
