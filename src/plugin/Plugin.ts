import { PluginMetadata } from './PluginMetadata.js';
import { PluginContext } from './PluginContext.js';

/**
 * Plugin interface for extending Stratix applications.
 *
 * Plugins follow a lifecycle: initialize → start → stop
 *
 * @example
 * ```TypeScript
 * class DatabasePlugin implements Plugin {
 *   readonly metadata: PluginMetadata = {
 *     name: 'database',
 *     description: 'PostgresSQL database plugin',
 *     dependencies: ['logger']
 *   };
 *
 *   private database?: Database;
 *
 *   async initialize(context: PluginContext): Promise<void> {
 *     const config = context.getConfig<DatabaseConfig>();
 *     this.database = new Database(config);
 *
 *     context.container.register('database', () => this.database, {
 *       lifetime: ServiceLifetime.SINGLETON
 *     });
 *   }
 *
 *   async start(): Promise<void> {
 *     await this.database?.connect();
 *   }
 *
 *   async stop(): Promise<void> {
 *     await this.database?.disconnect();
 *   }
 *
 *   async healthCheck(): Promise<HealthCheckResult> {
 *     return await this.database?.ping();
 *   }
 * }
 * ```
 *
 * @category Runtime & Application
 */
export interface Plugin {
  /**
   * Plugin metadata (name, dependencies).
   */
  readonly metadata: PluginMetadata;

  /**
   * Initializes the plugin.
   *
   * Called during docorators startup, after all dependencies are initialized.
   * Register services in the container during this phase.
   *
   * @param context - The plugin context
   *
   * @example
   * ```TypeScript
   * async initialize(context: PluginContext): Promise<void> {
   *   const database = new Database(context.getConfig());
   *   context.container.register('database', () => database);
   * }
   * ```
   */
  initialize?(context: PluginContext): Promise<void>;

  /**
   * Starts the plugin.
   *
   * Called after all plugins are initialized, before the docorators starts.
   * Connect to external resources during this phase.
   *
   * @example
   * ```TypeScript
   * async start(): Promise<void> {
   *   await this.database.connect();
   *   console.log('Database connected');
   * }
   * ```
   */
  start?(): Promise<void>;

  /**
   * Stops the plugin.
   *
   * Called during docorators shutdown, in reverse dependency order.
   * Close connections and clean up resources during this phase.
   *
   * @example
   * ```TypeScript
   * async stop(): Promise<void> {
   *   await this.database.disconnect();
   *   console.log('Database disconnected');
   * }
   * ```
   */
  stop?(): Promise<void>;
}
