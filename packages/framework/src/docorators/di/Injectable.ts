import { DependencyLifetime } from '@stratix/core';
import { MetadataStorage } from '../../runtime/MetadataStorage.js';

export interface InjectableOptions {
  name?: string;
  lifetime?: DependencyLifetime;
}

export const Injectable = (options: InjectableOptions = {}) => {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext
  ) {
    if (context.kind !== 'class') {
      throw new Error('@Injectable can only be applied to classes');
    }

    const injectableMetadata: InjectableOptions = {
      name: options?.name ?? target.name,
      lifetime: options?.lifetime ?? DependencyLifetime.TRANSIENT
    };

    context.addInitializer(() => {
      MetadataStorage.setInjectableMetadata(target, injectableMetadata);
    });

    return target;
  };
};
