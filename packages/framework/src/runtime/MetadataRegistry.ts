import { ClassConstructor } from '@stratix/core';
import { MetadataReader } from '../metadata/MetadataReader.js';

export class MetadataRegistry {
  public readonly appClass: ClassConstructor;
  public readonly commandToHandler: Map<ClassConstructor, ClassConstructor> = new Map();
  public readonly handlerToCommand: Map<ClassConstructor, ClassConstructor> = new Map();

  constructor(appClass: ClassConstructor) {
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

        // Usa this. en lugar de MetadataRegistry.
        this.commandToHandler.set(handlerMetadata.commandClass, handlerMetadata.handlerClass);
        this.handlerToCommand.set(handlerMetadata.handlerClass, handlerMetadata.commandClass);
      }
    }
  }
}
