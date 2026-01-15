import { ClassConstructor } from '@stratix/core';
import { MetadataReader } from '../metadata/MetadataReader.js';
import { DecoratorMissingError } from '../errors/DecoratorMissingError.js';
import { InvalidMetadataError } from '../errors/InvalidMetadataError.js';

export class MetadataRegistry {
  public readonly appClass: ClassConstructor;
  public readonly commandToHandler: Map<ClassConstructor, ClassConstructor> = new Map();
  public readonly handlerToCommand: Map<ClassConstructor, ClassConstructor> = new Map();

  constructor({ appClass }: { appClass: ClassConstructor }) {
    this.appClass = appClass;

    const appMetadata = MetadataReader.getAppMetadata(appClass);
    if (!appMetadata) {
      throw new DecoratorMissingError('@StratixApp', appClass.name);
    }

    for (const contextClass of appMetadata.contexts || []) {
      const contextMetadata = MetadataReader.getContextMetadata(contextClass);

      if (!contextMetadata) {
        throw new DecoratorMissingError('@Context', contextClass.name);
      }

      for (const handlerClass of contextMetadata.commandHandlers || []) {
        const handlerMetadata = MetadataReader.getCommandHandlerMetadata(handlerClass);
        if (!handlerMetadata) {
          throw new DecoratorMissingError('@CommandHandler', handlerClass.name);
        }
        if (!handlerMetadata.commandClass || !handlerMetadata.handlerClass) {
          throw new InvalidMetadataError(
            'CommandHandler',
            `Missing commandClass or handlerClass in metadata for ${handlerClass.name}`
          );
        }

        // Usa this. en lugar de MetadataRegistry.
        this.commandToHandler.set(handlerMetadata.commandClass, handlerMetadata.handlerClass);
        this.handlerToCommand.set(handlerMetadata.handlerClass, handlerMetadata.commandClass);
      }
    }
  }
}
