import type { Container, Logger, ContextConfig } from '@stratix/core';

/**
 * Default implementation of ContextConfig.
 */
export class DefaultContextConfig implements ContextConfig {
  constructor(
    private readonly _container: Container,
    private readonly _logger: Logger,
    private readonly configs: Map<string, unknown>,
    private readonly contextName: string
  ) {}

  get container(): Container {
    return this._container;
  }

  get logger(): Logger {
    return this._logger;
  }

  getConfig<T = unknown>(): T | undefined {
    return this.configs.get(this.contextName) as T | undefined;
  }
}
