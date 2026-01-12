import { CommandMetadata, MetadataStorage } from '../runtime/MetadataStorage.js';

export interface CommandOptions {
  commandName?: string;
}

export function Command(options?: CommandOptions) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext
  ) {
    if (context.kind !== 'class') {
      throw new Error('@Command can only be applied to classes');
    }

    const commandMetadata: CommandMetadata = {
      commandName: options?.commandName ?? target.name,
      target: target
    };

    context.addInitializer(() => {
      MetadataStorage.setCommandMetadata(target, commandMetadata);
    });

    return target;
  };
}
