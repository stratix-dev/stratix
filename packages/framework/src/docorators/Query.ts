import { MetadataStorage, QueryMetadata } from '../runtime/MetadataStorage.js';

export interface QueryOptions {
  queryName?: string;
}

export function Query(options?: QueryOptions) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext
  ) {
    if (context.kind !== 'class') {
      throw new Error('@Query can only be applied to classes');
    }

    const queryMetadata: QueryMetadata = {
      queryName: options?.queryName ?? target.name,
      queryType: target
    };

    context.addInitializer(() => {
      MetadataStorage.setQueryMetadata(target, queryMetadata);
    });

    return target;
  };
}
