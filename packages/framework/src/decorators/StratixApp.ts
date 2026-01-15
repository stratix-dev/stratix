import { ClassConstructor, ConfigurationSource } from '@stratix/core';
import { MetadataWriter } from '../metadata/MetadataWriter.js';
import { DecoratorKindError } from '../errors/DecoratorKindError.js';
import { APP_DEFAULTS } from '../defaults/AppDefaults.js';

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
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext
  ) {
    if (context.kind !== 'class') {
      throw new DecoratorKindError('StratixApp', 'class', context.kind);
    }

    MetadataWriter.setAppMetadata(target, {
      name: options?.name || APP_DEFAULTS.name,
      version: options?.version || APP_DEFAULTS.version,
      configuration: {
        sources: options?.configuration?.sources || APP_DEFAULTS.configuration.sources,
        configFile: options?.configuration?.configFile || APP_DEFAULTS.configuration.configFile,
        envPrefix: options?.configuration?.envPrefix || APP_DEFAULTS.configuration.envPrefix
      },
      contexts: options?.contexts || APP_DEFAULTS.contexts,
      di: {
        injectionMode: options?.di?.injectionMode || APP_DEFAULTS.di.injectionMode,
        strict: options?.di?.strict ?? APP_DEFAULTS.di.strict
      }
    });

    return target;
  };
}
