import type { Logger } from '@stratix/core';
import {
  hasOnModuleInit,
  hasOnModuleStart,
  hasOnModuleStop,
  hasOnPluginInit,
  hasOnPluginStart,
  hasOnPluginStop,
  hasOnApplicationReady,
  hasOnApplicationShutdown,
} from '../lifecycle/interfaces.js';

/**
 * Orchestrates the lifecycle of modules and plugins.
 *
 * Ensures proper initialization and shutdown order.
 */
export class LifecycleOrchestrator {
  private moduleInstances: any[] = [];
  private pluginInstances: any[] = [];

  constructor(private readonly logger: Logger) {}

  /**
   * Registers a module instance for lifecycle management.
   */
  registerModule(moduleInstance: any): void {
    this.moduleInstances.push(moduleInstance);
  }

  /**
   * Registers a plugin instance for lifecycle management.
   */
  registerPlugin(pluginInstance: any): void {
    this.pluginInstances.push(pluginInstance);
  }

  /**
   * Executes the initialization phase.
   *
   * Order:
   * 1. Plugins (in dependency order)
   * 2. Modules (in import order)
   */
  async initialize(): Promise<void> {
    this.logger.info('Starting initialization phase...');

    // Initialize plugins
    for (const plugin of this.pluginInstances) {
      if (hasOnPluginInit(plugin)) {
        const pluginName = plugin.constructor.name;
        this.logger.info(`Initializing plugin: ${pluginName}`);
        await plugin.onPluginInit();
      }
    }

    // Initialize modules
    for (const module of this.moduleInstances) {
      if (hasOnModuleInit(module)) {
        const moduleName = module.constructor.name;
        this.logger.info(`Initializing module: ${moduleName}`);
        await module.onModuleInit();
      }
    }

    this.logger.info('Initialization phase completed');
  }

  /**
   * Executes the start phase.
   *
   * Order:
   * 1. Plugins (in dependency order)
   * 2. Modules (in import order)
   */
  async start(): Promise<void> {
    this.logger.info('Starting start phase...');

    // Start plugins
    for (const plugin of this.pluginInstances) {
      if (hasOnPluginStart(plugin)) {
        const pluginName = plugin.constructor.name;
        this.logger.info(`Starting plugin: ${pluginName}`);
        await plugin.onPluginStart();
      }
    }

    // Start modules
    for (const module of this.moduleInstances) {
      if (hasOnModuleStart(module)) {
        const moduleName = module.constructor.name;
        this.logger.info(`Starting module: ${moduleName}`);
        await module.onModuleStart();
      }
    }

    this.logger.info('Start phase completed');
  }

  /**
   * Executes the ready phase.
   *
   * Called after all modules and plugins are started.
   */
  async ready(): Promise<void> {
    this.logger.info('Application ready phase...');

    // Notify modules
    for (const module of this.moduleInstances) {
      if (hasOnApplicationReady(module)) {
        const moduleName = module.constructor.name;
        this.logger.info(`Module ready: ${moduleName}`);
        await module.onApplicationReady();
      }
    }

    // Notify plugins
    for (const plugin of this.pluginInstances) {
      if (hasOnApplicationReady(plugin)) {
        const pluginName = plugin.constructor.name;
        this.logger.info(`Plugin ready: ${pluginName}`);
        await plugin.onApplicationReady();
      }
    }

    this.logger.info('Application is ready');
  }

  /**
   * Executes the shutdown phase.
   *
   * Order (reverse of startup):
   * 1. Modules (in reverse order)
   * 2. Plugins (in reverse order)
   */
  async shutdown(): Promise<void> {
    this.logger.info('Starting shutdown phase...');

    // Notify modules of shutdown
    for (const module of this.moduleInstances) {
      if (hasOnApplicationShutdown(module)) {
        const moduleName = module.constructor.name;
        this.logger.info(`Module shutting down: ${moduleName}`);
        await module.onApplicationShutdown();
      }
    }

    // Notify plugins of shutdown
    for (const plugin of this.pluginInstances) {
      if (hasOnApplicationShutdown(plugin)) {
        const pluginName = plugin.constructor.name;
        this.logger.info(`Plugin shutting down: ${pluginName}`);
        await plugin.onApplicationShutdown();
      }
    }

    this.logger.info('Shutdown notification completed');
  }

  /**
   * Executes the stop phase.
   *
   * Order (reverse of startup):
   * 1. Modules (in reverse order)
   * 2. Plugins (in reverse order)
   */
  async stop(): Promise<void> {
    this.logger.info('Starting stop phase...');

    // Stop modules (reverse order)
    for (let i = this.moduleInstances.length - 1; i >= 0; i--) {
      const module = this.moduleInstances[i];
      if (hasOnModuleStop(module)) {
        const moduleName = module.constructor.name;
        this.logger.info(`Stopping module: ${moduleName}`);
        await module.onModuleStop();
      }
    }

    // Stop plugins (reverse order)
    for (let i = this.pluginInstances.length - 1; i >= 0; i--) {
      const plugin = this.pluginInstances[i];
      if (hasOnPluginStop(plugin)) {
        const pluginName = plugin.constructor.name;
        this.logger.info(`Stopping plugin: ${pluginName}`);
        await plugin.onPluginStop();
      }
    }

    this.logger.info('Stop phase completed');
  }
}
