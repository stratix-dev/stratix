import { MetadataKeys } from '../../metadata/keys.js';
import { Metadata } from '../../metadata/Metadata.js';
import { AppMetadata } from '../../metadata/registry.js';
import { DecoratorKindError } from '../errors/DecoratorKindError.js';
import { ClassConstructorType } from '../types/UtilityTypes.js';

export type InjectionMode = 'classic' | 'proxy';

export interface StratixAppOptions {
  name?: string;
  version?: string;
  contexts?: ClassConstructorType[];
  di?: {
    strict?: boolean;
    injectionMode?: InjectionMode;
  };
}

export function StratixApp(options: StratixAppOptions = {}) {
  return function <T extends new (...args: unknown[]) => unknown>(
    target: T,
    context: ClassDecoratorContext
  ): T {
    if (context.kind !== 'class') {
      throw new DecoratorKindError('StratixApp', 'class', context.kind);
    }

    const metadata: AppMetadata = {
      name: options.name ?? 'Stratix application',
      version: options.version ?? '1.0.0',
      contexts: options.contexts ?? [],
      di: {
        strict: options.di?.strict ?? true,
        injectionMode: options.di?.injectionMode ?? 'proxy'
      }
    };

    Metadata.set(target, MetadataKeys.App, metadata);

    return target;
  };
}
