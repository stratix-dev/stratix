import type { Plugin, PluginContext, Context, Container, Logger } from '@stratix/core';
import type { AwilixContainer } from '../di/awilix.js';
import { asValue } from '../di/awilix.js';
import { PluginRegistry } from '../registry/PluginRegistry.js';
import { ContextRegistry } from '../context/ContextRegistry.js';
import { DefaultContextConfig } from '../context/DefaultContextConfig.js';
import { PluginLifecycleError } from '../errors/RuntimeError.js';

/**
 * Lifecycle phases for plugins.
 */
export enum LifecyclePhase {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  INITIALIZED = 'initialized',
  STARTING = 'starting',
  STARTED = 'started',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
}

/**
 * Manages the lifecycle of plugins and contexts.
 *
 * Handles initialization, startup, and shutdown in the correct order:
 * 1. Plugins (infrastructure)
 * 2. Contexts (domain logic)
 *
 * @example
 * ```typescript
 * const manager = new LifecycleManager(pluginRegistry, contextRegistry);
 *
 * await manager.initializePlugins(pluginContext);
 * await manager.initializeContexts(container, logger, configs);
 * await manager.startAll();
 * await manager.stopAll();
 * ```
 */
export class LifecycleManager {
  private phase = LifecyclePhase.UNINITIALIZED;
  private pluginPhases = new Map<string, LifecyclePhase>();
  private contextPhases = new Map<string, LifecyclePhase>();

  constructor(
    private readonly pluginRegistry: PluginRegistry,
    private readonly contextRegistry: ContextRegistry
  ) {}

  /**
   * Gets the current lifecycle phase.
   */
  get currentPhase(): LifecyclePhase {
    return this.phase;
  }

  /**
   * Gets the lifecycle phase of a specific plugin.
   *
   * @param pluginName - The plugin name
   * @returns The plugin's lifecycle phase
   */
  getPluginPhase(pluginName: string): LifecyclePhase {
    return this.pluginPhases.get(pluginName) || LifecyclePhase.UNINITIALIZED;
  }

  /**
   * Initializes all plugins in dependency order.
   *
   * @param context - The plugin context
   * @throws {PluginLifecycleError} If a plugin fails to initialize
   *
   * @example
   * ```typescript
   * await manager.initializePlugins(pluginContext);
   * ```
   */
  async initializePlugins(context: PluginContext): Promise<void> {
    if (this.phase !== LifecyclePhase.UNINITIALIZED) {
      return; // Already initialized
    }

    this.phase = LifecyclePhase.INITIALIZING;

    const plugins = this.pluginRegistry.getPluginsInOrder();

    for (const plugin of plugins) {
      await this.initializePlugin(plugin, context);
    }

    this.phase = LifecyclePhase.INITIALIZED;
  }

  /**
   * Initializes all contexts in dependency order.
   * Contexts are initialized after plugins since they depend on infrastructure.
   *
   * @param container - The DI container
   * @param logger - The logger
   * @param configs - Context configurations
   * @throws {PluginLifecycleError} If a context fails to initialize
   *
   * @example
   * ```typescript
   * await manager.initializeContexts(container, logger, contextConfigs);
   * ```
   */
  async initializeContexts(
    container: Container,
    logger: Logger,
    configs: Map<string, unknown>
  ): Promise<void> {
    if (this.phase !== LifecyclePhase.INITIALIZED) {
      throw new Error('Plugins must be initialized before contexts');
    }

    const contexts = this.contextRegistry.getContextsInOrder();

    for (const context of contexts) {
      await this.initializeContext(context, container, logger, configs);
    }
  }

  /**
   * @deprecated Use initializePlugins instead
   */
  async initializeAll(context: PluginContext): Promise<void> {
    return this.initializePlugins(context);
  }

  /**
   * Starts all plugins and contexts in dependency order.
   *
   * @throws {PluginLifecycleError} If a plugin or context fails to start
   *
   * @example
   * ```typescript
   * await manager.startAll();
   * ```
   */
  async startAll(): Promise<void> {
    if (this.phase !== LifecyclePhase.INITIALIZED) {
      throw new Error('Plugins must be initialized before starting');
    }

    this.phase = LifecyclePhase.STARTING;

    // Start plugins first
    const plugins = this.pluginRegistry.getPluginsInOrder();
    for (const plugin of plugins) {
      await this.startPlugin(plugin);
    }

    // Start contexts after plugins
    const contexts = this.contextRegistry.getContextsInOrder();
    for (const context of contexts) {
      await this.startContext(context);
    }

    this.phase = LifecyclePhase.STARTED;
  }

  /**
   * Stops all contexts and plugins in reverse dependency order.
   *
   * @throws {PluginLifecycleError} If a plugin or context fails to stop
   *
   * @example
   * ```typescript
   * await manager.stopAll();
   * ```
   */
  async stopAll(): Promise<void> {
    if (this.phase !== LifecyclePhase.STARTED) {
      // Allow stopping from any phase for graceful shutdown
    }

    this.phase = LifecyclePhase.STOPPING;

    // Stop contexts first (reverse order)
    const contexts = this.contextRegistry.getContextsInReverseOrder();
    for (const context of contexts) {
      await this.stopContext(context);
    }

    // Stop plugins after contexts (reverse order)
    const plugins = this.pluginRegistry.getPluginsInReverseOrder();
    for (const plugin of plugins) {
      await this.stopPlugin(plugin);
    }

    this.phase = LifecyclePhase.STOPPED;
  }

  /**
   * Initializes a single plugin.
   *
   * @param plugin - The plugin to initialize
   * @param context - The plugin context
   * @private
   */
  private async initializePlugin(plugin: Plugin, context: PluginContext): Promise<void> {
    const name = plugin.metadata.name;

    try {
      this.pluginPhases.set(name, LifecyclePhase.INITIALIZING);

      if (plugin.initialize) {
        // Set current plugin name for config access
        if (
          'setCurrentPluginName' in context &&
          typeof context.setCurrentPluginName === 'function'
        ) {
          (context as { setCurrentPluginName: (name: string) => void }).setCurrentPluginName(name);
        }
        await plugin.initialize(context);
      }

      this.pluginPhases.set(name, LifecyclePhase.INITIALIZED);
    } catch (error) {
      this.pluginPhases.set(name, LifecyclePhase.UNINITIALIZED);
      throw new PluginLifecycleError(name, 'initialize', error as Error);
    }
  }

  /**
   * Starts a single plugin.
   *
   * @param plugin - The plugin to start
   * @private
   */
  private async startPlugin(plugin: Plugin): Promise<void> {
    const name = plugin.metadata.name;

    try {
      this.pluginPhases.set(name, LifecyclePhase.STARTING);

      if (plugin.start) {
        await plugin.start();
      }

      this.pluginPhases.set(name, LifecyclePhase.STARTED);
    } catch (error) {
      this.pluginPhases.set(name, LifecyclePhase.INITIALIZED);
      throw new PluginLifecycleError(name, 'start', error as Error);
    }
  }

  /**
   * Stops a single plugin.
   *
   * @param plugin - The plugin to stop
   * @private
   */
  private async stopPlugin(plugin: Plugin): Promise<void> {
    const name = plugin.metadata.name;

    try {
      this.pluginPhases.set(name, LifecyclePhase.STOPPING);

      if (plugin.stop) {
        await plugin.stop();
      }

      this.pluginPhases.set(name, LifecyclePhase.STOPPED);
    } catch (error) {
      // Continue stopping other plugins even if one fails
      console.error(`Failed to stop plugin '${name}':`, error);
      this.pluginPhases.set(name, LifecyclePhase.STOPPED);
    }
  }

  /**
   * Initializes a single context.
   *
   * @param context - The context to initialize
   * @param container - The DI container
   * @param logger - The logger
   * @param configs - Context configurations
   * @private
   */
  private async initializeContext(
    context: Context,
    container: Container,
    logger: Logger,
    configs: Map<string, unknown>
  ): Promise<void> {
    const name = context.metadata.name;

    try {
      this.contextPhases.set(name, LifecyclePhase.INITIALIZING);

      // Cast to AwilixContainer for registration
      const awilixContainer = container as unknown as AwilixContainer;

      // Register repositories first
      const repositories = context.getRepositories?.() || [];
      for (const repo of repositories) {
        awilixContainer.register({
          [repo.token]: asValue(repo.instance)
        });
      }

      // Get CQRS buses from container
      const commandBus = container.resolve<{
        register: (commandType: new (...args: unknown[]) => unknown, handler: unknown) => void;
      }>('commandBus');

      const queryBus = container.resolve<{
        register: (queryType: new (...args: unknown[]) => unknown, handler: unknown) => void;
      }>('queryBus');

      const eventBus = container.resolve<{
        subscribe: (eventType: new (...args: unknown[]) => unknown, handler: unknown) => void;
      }>('eventBus');

      // Register commands
      const commands = context.getCommands?.() || [];
      for (const cmd of commands) {
        commandBus.register(cmd.commandType, cmd.handler);
      }

      // Register queries
      const queries = context.getQueries?.() || [];
      for (const query of queries) {
        queryBus.register(query.queryType, query.handler);
      }

      // Subscribe event handlers
      const eventHandlers = context.getEventHandlers?.() || [];
      for (const handler of eventHandlers) {
        eventBus.subscribe(handler.eventType, handler.handler);
      }

      // Call context initialize if present
      if (context.initialize) {
        const contextConfig = new DefaultContextConfig(container, logger, configs, name);
        await context.initialize(contextConfig);
      }

      this.contextPhases.set(name, LifecyclePhase.INITIALIZED);
    } catch (error) {
      this.contextPhases.set(name, LifecyclePhase.UNINITIALIZED);
      throw new PluginLifecycleError(name, 'initialize', error as Error);
    }
  }

  /**
   * Starts a single context.
   *
   * @param context - The context to start
   * @private
   */
  private async startContext(context: Context): Promise<void> {
    const name = context.metadata.name;

    try {
      this.contextPhases.set(name, LifecyclePhase.STARTING);

      if (context.start) {
        await context.start();
      }

      this.contextPhases.set(name, LifecyclePhase.STARTED);
    } catch (error) {
      this.contextPhases.set(name, LifecyclePhase.INITIALIZED);
      throw new PluginLifecycleError(name, 'start', error as Error);
    }
  }

  /**
   * Stops a single context.
   *
   * @param context - The context to stop
   * @private
   */
  private async stopContext(context: Context): Promise<void> {
    const name = context.metadata.name;

    try {
      this.contextPhases.set(name, LifecyclePhase.STOPPING);

      if (context.stop) {
        await context.stop();
      }

      this.contextPhases.set(name, LifecyclePhase.STOPPED);
    } catch (error) {
      // Continue stopping other contexts even if one fails
      console.error(`Failed to stop context '${name}':`, error);
      this.contextPhases.set(name, LifecyclePhase.STOPPED);
    }
  }
}
