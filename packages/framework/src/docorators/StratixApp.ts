import { MetadataStorage } from '../runtime/MetadataStorage.js';
import { StratixError } from '../errors/StratixError.js';
import { Error } from '../errors/Error.js';
import { ConfigurationSource, Logger, LoggerConfig, LoggerFactory } from '@stratix/core';

export interface StratixAppOptions {
  name?: string;
  version?: string;
  /**
   * Configuration sources
   */
  configuration?: {
    /**
     * Configuration sources (loaded in order)
     * Later sources override earlier ones
     */
    sources?: ConfigurationSource[];

    /**
     * Path to YAML config file (shorthand)
     * @default './config/app.yml'
     */
    configFile?: string;

    /**
     * Environment prefix for env vars
     * @default 'APP_'
     */
    envPrefix?: string;
  };
  services?: {
    logger?: LoggerFactory | LoggerConfig | Logger | false;
  };
  behavior?: {
    strictMode?: boolean;
    developmentMode?: boolean;
  };
}

export function StratixApp(options: StratixAppOptions = {}) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext
  ) {
    if (context.kind !== 'class') {
      throw new StratixError(Error.RUNTIME_ERROR, '@StratixApp can only be applied to classes');
    }

    const stratixAppMetadata: StratixAppOptions = {
      name: options?.name || 'Stratix Application',
      version: options?.version || '1.0.0',
      services: options?.services || {},
      configuration: options?.configuration || {},
      behavior: options?.behavior || {}
    };

    context.addInitializer(() => {
      MetadataStorage.setAppMetadata(target, stratixAppMetadata);
    });

    return target;
  };
}
