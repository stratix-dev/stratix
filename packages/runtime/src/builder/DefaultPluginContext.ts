import type { Container, Logger, PluginContext } from '@stratix/core';
import type { AwilixContainer } from '../di/awilix.js';

/**
 * Default implementation of PluginContext.
 */
export class DefaultPluginContext implements PluginContext {
  private currentPluginName?: string;

  constructor(
    // Accept AwilixContainer internally but expose as Container interface
    private readonly awilixContainer: AwilixContainer,
    public readonly logger: Logger,
    private readonly config: Map<string, unknown>
  ) {}

  /**
   * Expose container as the minimal Container interface.
   * PluginContext consumers only see the minimal interface.
   */
  get container(): Container {
    return this.awilixContainer;
  }

  /**
   * Sets the current plugin name (used internally by LifecycleManager).
   * @internal
   */
  setCurrentPluginName(name: string): void {
    this.currentPluginName = name;
  }

  getConfig<T = Record<string, unknown>>(): T {
    const pluginName = this.currentPluginName || 'unknown';
    return (this.config.get(pluginName) as T) || ({} as T);
  }

  getService<T>(name: string): T | undefined {
    try {
      return this.awilixContainer.hasRegistration(name)
        ? this.awilixContainer.resolve<T>(name)
        : undefined;
    } catch {
      return undefined;
    }
  }
}
