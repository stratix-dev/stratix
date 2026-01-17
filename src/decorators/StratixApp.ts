import { DecoratorKindError } from '../shared/errors/DecoratorKindError.js';
import { APP_DEFAULTS } from './Defaults.js';
import { AppMetadata } from '../metadata/registry.js';
import { Metadata } from '../metadata/Metadata.js';
import { MetadataKeys } from '../metadata/keys.js';
import { ConfigurationSource } from '../config/ConfigurationSource.js';

type ClassConstructor<T = any> = new (...args: any[]) => T;

export interface StratixAppOptions {
  name?: string;
  version?: string;
  contexts?: ClassConstructor[];
  configuration?: {
    sources?: (new (...args: any[]) => ConfigurationSource)[];
    configFile?: string;
    envPrefix?: string;
  };
  di?: {
    injectionMode?: 'CLASSIC' | 'PROXY';
    strict?: boolean;
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
      name: options.name ?? APP_DEFAULTS.name,
      version: options.version ?? APP_DEFAULTS.version,
      configuration: {
        sources: options.configuration?.sources ?? APP_DEFAULTS.configuration.sources,
        configFile: options.configuration?.configFile ?? APP_DEFAULTS.configuration.configFile,
        envPrefix: options.configuration?.envPrefix ?? APP_DEFAULTS.configuration.envPrefix
      },
      contexts: options.contexts ?? APP_DEFAULTS.contexts,
      di: {
        strict: options.di?.strict ?? APP_DEFAULTS.di.strict
      }
    };

    Metadata.set(target, MetadataKeys.App, metadata);

    return target;
  };
}
