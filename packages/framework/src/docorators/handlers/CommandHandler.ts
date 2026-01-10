import { Error } from '../../errors/Error.js';
import { StratixError } from '../../errors/StratixError.js';
import { CommandHandlerMetadata, MetadataStorage } from '../../runtime/MetadataStorage.js';

export interface CommandHandlerOptions {
  commandName: string;
}

export type Options = CommandHandlerOptions;

export function CommandHandler(options: Options) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext
  ) {
    if (context.kind !== 'class') {
      throw new StratixError(Error.RUNTIME_ERROR, '@CommandHandler can only be applied to classes');
    }

    const commandHandlerMetadata: CommandHandlerMetadata = {
      commandName: options?.commandName || target.name,
      commandType: target
    };

    context.addInitializer(() => {
      MetadataStorage.setCommandHandlerMetadata(target, commandHandlerMetadata);
    });

    return target;
  };
}
