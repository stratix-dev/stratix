import { Error } from '../../errors/Error.js';
import { StratixError } from '../../errors/StratixError.js';
import { MetadataStorage } from '../../runtime/MetadataStorage.js';

export interface CommandHandlerOptions {
  /**
   * The name of the command to handle.
   * If not provided, uses the class name.
   */
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

    const commandHandlerMetadata: Options = {
      commandName: options?.commandName || target.name
    };

    context.addInitializer(() => {
      MetadataStorage.setCommandHandlerMetadata(target, commandHandlerMetadata);
    });

    return target;
  };
}
