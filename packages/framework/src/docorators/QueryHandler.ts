import { Error } from '../errors/Error.js';
import { StratixError } from '../errors/StratixError.js';
import { MetadataStorage, QueryHandlerMetadata } from '../runtime/MetadataStorage.js';

export interface QueryHandlerOptions {
  queryName?: string;
}

export function QueryHandler(options?: QueryHandlerOptions) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext
  ) {
    if (context.kind !== 'class') {
      throw new StratixError(Error.RUNTIME_ERROR, '@QueryHandler can only be applied to classes');
    }

    const queryHandlerMetadata: QueryHandlerMetadata = {
      queryName: options?.queryName ?? target.name
    };

    context.addInitializer(() => {
      MetadataStorage.setQueryHandlerMetadata(target, queryHandlerMetadata);
    });

    return target;
  };
}
