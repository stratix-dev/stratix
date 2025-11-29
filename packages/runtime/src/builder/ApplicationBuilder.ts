import type { Container, Logger, Plugin, Context, ConfigProvider } from '@stratix/core';
import { ServiceLifetime } from '@stratix/core';
import { PluginRegistry } from '../registry/PluginRegistry.js';
import { ContextRegistry } from '../context/ContextRegistry.js';
import { LifecycleManager } from '../lifecycle/LifecycleManager.js';
import { DefaultPluginContext } from './DefaultPluginContext.js';
import { Application } from './Application.js';

/**
 * Application builder options.
 */
export interface ApplicationBuilderOptions {
  /**
   * The dependency injection container.
   * Must be provided before building.
   */
  container?: Container;

  /**
   * The logger instance.
   * Must be provided before building.
   */
  logger?: Logger;

  /**
   * The configuration provider.
   * Optional, can be set via useConfig().
   */
  config?: ConfigProvider;

  /**
   * Plugin configurations.
   */
  pluginConfigs?: Map<string, unknown>;
}

/**
 * Builder for creating Stratix applications.
 *
 * Provides a fluent API for configuring and building applications.
 *
 * @example
 * ```typescript
 * const app = await ApplicationBuilder.create()
 *   .useContainer(container)
 *   .useLogger(logger)
 *   .usePlugin(new PostgresPlugin())
 *   .usePlugin(new RabbitMQPlugin())
 *   .useContext(new OrdersContext())
 *   .useContext(new ProductsContext())
 *   .build();
 *
 * await app.start();
 * ```
 */
export class ApplicationBuilder {
  private container?: Container;
  private logger?: Logger;
  private config?: ConfigProvider;
  private pluginRegistry = new PluginRegistry();
  private contextRegistry = new ContextRegistry();
  private pluginConfigs = new Map<string, unknown>();
  private contextConfigs = new Map<string, unknown>();

  private constructor() {}

  /**
   * Creates a new ApplicationBuilder.
   *
   * @returns A new ApplicationBuilder instance
   */
  static create(): ApplicationBuilder {
    return new ApplicationBuilder();
  }

  /**
   * Sets the dependency injection container.
   *
   * @param container - The container to use
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.useContainer(new AwilixContainer());
   * ```
   */
  useContainer(container: Container): this {
    this.container = container;
    return this;
  }

  /**
   * Sets the logger.
   *
   * @param logger - The logger to use
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.useLogger(new ConsoleLogger());
   * ```
   */
  useLogger(logger: Logger): this {
    this.logger = logger;
    return this;
  }

  /**
   * Sets the configuration provider.
   *
   * The configuration provider will be registered in the DI container
   * and available to all plugins and contexts.
   *
   * @param config - The configuration provider to use
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * import { EnvConfigProvider } from '@stratix/config-env';
   *
   * builder.useConfig(new EnvConfigProvider({
   *   prefix: 'APP_',
   *   autoTransform: true,
   * }));
   * ```
   *
   * @example
   * ```typescript
   * import { CompositeConfigProvider } from '@stratix/config-composite';
   * import { EnvConfigProvider } from '@stratix/config-env';
   * import { FileConfigProvider } from '@stratix/config-file';
   *
   * builder.useConfig(new CompositeConfigProvider({
   *   providers: [
   *     new EnvConfigProvider({ prefix: 'APP_' }),
   *     new FileConfigProvider({ files: ['./config.json'] }),
   *   ],
   *   strategy: 'first-wins',
   * }));
   * ```
   */
  useConfig(config: ConfigProvider): this {
    this.config = config;
    return this;
  }

  /**
   * Registers a plugin.
   *
   * @param plugin - The plugin to register
   * @param config - Optional configuration for the plugin
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.usePlugin(new DatabasePlugin(), {
   *   host: 'localhost',
   *   port: 5432
   * });
   * ```
   */
  usePlugin(plugin: Plugin, config?: unknown): this {
    this.pluginRegistry.register(plugin);

    if (config) {
      this.pluginConfigs.set(plugin.metadata.name, config);
    }

    return this;
  }

  /**
   * Registers multiple plugins.
   *
   * @param plugins - The plugins to register
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.usePlugins([
   *   new LoggerPlugin(),
   *   new DatabasePlugin(),
   *   new ApiPlugin()
   * ]);
   * ```
   */
  usePlugins(plugins: Plugin[]): this {
    for (const plugin of plugins) {
      this.pluginRegistry.register(plugin);
    }
    return this;
  }

  /**
   * Registers a context.
   *
   * Contexts are domain/business logic units that encapsulate
   * a complete domain (domain layer, application layer, infrastructure).
   *
   * @param context - The context to register
   * @param config - Optional configuration for the context
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.useContext(new OrdersContext());
   * builder.useContext(new ProductsContext());
   * ```
   */
  useContext(context: Context, config?: unknown): this {
    this.contextRegistry.register(context);

    if (config) {
      this.contextConfigs.set(context.metadata.name, config);
    }

    return this;
  }

  /**
   * Registers multiple contexts.
   *
   * @param contexts - The contexts to register
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.useContexts([
   *   new OrdersContext(),
   *   new ProductsContext(),
   *   new InventoryContext()
   * ]);
   * ```
   */
  useContexts(contexts: Context[]): this {
    for (const context of contexts) {
      this.contextRegistry.register(context);
    }
    return this;
  }

  /**
   * Sets configuration for a plugin.
   *
   * @param pluginName - The plugin name
   * @param config - The configuration
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.configurePlugin('database', {
   *   host: 'localhost',
   *   port: 5432
   * });
   * ```
   */
  configurePlugin(pluginName: string, config: unknown): this {
    this.pluginConfigs.set(pluginName, config);
    return this;
  }

  /**
   * Builds and initializes the application.
   *
   * Initializes all plugins in dependency order.
   *
   * @returns The initialized application
   * @throws {Error} If container or logger is not set
   * @throws {PluginLifecycleError} If a plugin fails to initialize
   *
   * @example
   * ```typescript
   * const app = await builder.build();
   * ```
   */
  async build(): Promise<Application> {
    if (!this.container) {
      throw new Error('Container must be set before building');
    }

    if (!this.logger) {
      throw new Error('Logger must be set before building');
    }

    // Register config provider in container if provided
    if (this.config) {
      this.container.register('config', () => this.config, { lifetime: ServiceLifetime.SINGLETON });
    }

    const lifecycleManager = new LifecycleManager(this.pluginRegistry, this.contextRegistry);
    const pluginContext = new DefaultPluginContext(this.container, this.logger, this.pluginConfigs);

    // Initialize plugins first
    await lifecycleManager.initializePlugins(pluginContext);

    // Initialize contexts after plugins (if any)
    if (this.contextRegistry.size > 0) {
      await lifecycleManager.initializeContexts(this.container, this.logger, this.contextConfigs);
    }

    return new Application(this.container, this.pluginRegistry, this.contextRegistry, lifecycleManager);
  }

  /**
   * Gets the number of registered plugins.
   */
  get pluginCount(): number {
    return this.pluginRegistry.size;
  }

  /**
   * Gets the number of registered contexts.
   */
  get contextCount(): number {
    return this.contextRegistry.size;
  }
}
