import { Error } from '../../errors/Error.js';
import { StratixError } from '../../errors/StratixError.js';
import { MetadataStorage } from '../../runtime/MetadataStorage.js';

export interface QueryHandlerOptions {
  /**
   * The name of the query to handle.
   * If not provided, uses the class name.
   */
  queryName: string;
}

export type Options = QueryHandlerOptions;

export function QueryHandler(options: Options) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext
  ) {
    if (context.kind !== 'class') {
      throw new StratixError(Error.RUNTIME_ERROR, '@QueryHandler can only be applied to classes');
    }

    const queryHandlerMetadata: Options = {
      queryName: options?.queryName ?? target.name
    };

    context.addInitializer(() => {
      MetadataStorage.setQueryHandlerMetadata(target, queryHandlerMetadata);
    });

    return target;
  };
}
