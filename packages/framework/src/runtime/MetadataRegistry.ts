import { ClassConstructor } from '@stratix/core';
import { MetadataReader } from '../metadata/MetadataReader.js';

export class MetadataRegistry {
  static appClass: ClassConstructor;
  static commandToHandler: Map<ClassConstructor, ClassConstructor> = new Map();
  static handlerToCommand: Map<ClassConstructor, ClassConstructor> = new Map();

  static buildFromApp(appClass: ClassConstructor): MetadataRegistry {
    this.appClass = appClass;

    const appMetadata = MetadataReader.getAppMetadata(appClass);
    if (!appMetadata) {
      throw new Error(`@StratixApp decorator not found on ${appClass.name}`);
    }

    for (const contextClass of appMetadata.contexts || []) {
      const contextMetadata = MetadataReader.getContextMetadata(contextClass);

      if (!contextMetadata) {
        throw new Error(`@Context decorator not found on ${contextClass.name}`);
      }

      for (const handlerClass of contextMetadata.commandHandlers || []) {
        const handlerMetadata = MetadataReader.getCommandHandlerMetadata(handlerClass);
        if (!handlerMetadata) {
          throw new Error(`@CommandHandler decorator not found on ${handlerClass.name}`);
        }
        if (!handlerMetadata.commandClass || !handlerMetadata.handlerClass) {
          throw new Error(`Invalid command handler metadata for ${handlerClass.name}`);
        }
        MetadataRegistry.commandToHandler.set(
          handlerMetadata.commandClass,
          handlerMetadata.handlerClass
        );
        MetadataRegistry.handlerToCommand.set(
          handlerMetadata.handlerClass,
          handlerMetadata.commandClass
        );
      }
    }

    return MetadataRegistry;
  }
}
