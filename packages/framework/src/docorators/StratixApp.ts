import { MetadataStorage } from '../runtime/MetadataStorage.js';
import { StratixError } from '../errors/StratixError.js';
import { Error } from '../errors/Error.js';
import { StratixAppOptions } from './StratixAppOptions.js';

export type Options = StratixAppOptions | undefined;

export function StratixApp(options: Options = undefined) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext
  ) {
    if (context.kind !== 'class') {
      throw new StratixError(Error.RUNTIME_ERROR, '@StratixApp can only be applied to classes');
    }

    const stratixAppMetadata: Options = {
      name: options?.name,
      version: options?.version
    };

    context.addInitializer(() => {
      MetadataStorage.setAppMetadata(target, stratixAppMetadata);
    });

    return target;
  };
}
