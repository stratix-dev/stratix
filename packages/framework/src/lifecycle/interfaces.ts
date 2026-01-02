/**
 * Lifecycle hook interfaces for modules and plugins.
 *
 * These interfaces allow classes to hook into different stages
 * of the application lifecycle.
 */

/**
 * Lifecycle hook called when a module is being initialized.
 *
 * Use this to register services in the DI container.
 *
 * @example
 * ```typescript
 * @Module({})
 * export class UserModule implements OnModuleInit {
 *   async onModuleInit(): Promise<void> {
 *     console.log('UserModule initializing...');
 *   }
 * }
 * ```
 *
 * @category Lifecycle
 */
export interface OnModuleInit {
  /**
   * Called during module initialization phase.
   */
  onModuleInit(): Promise<void> | void;
}

/**
 * Lifecycle hook called when a module is being started.
 *
 * Use this to connect to external resources (databases, message queues, etc.).
 *
 * @example
 * ```typescript
 * @Module({})
 * export class DatabaseModule implements OnModuleStart {
 *   async onModuleStart(): Promise<void> {
 *     await this.connection.connect();
 *   }
 * }
 * ```
 *
 * @category Lifecycle
 */
export interface OnModuleStart {
  /**
   * Called during module start phase.
   */
  onModuleStart(): Promise<void> | void;
}

/**
 * Lifecycle hook called when a module is being stopped.
 *
 * Use this to close connections and clean up resources.
 *
 * @example
 * ```typescript
 * @Module({})
 * export class DatabaseModule implements OnModuleStop {
 *   async onModuleStop(): Promise<void> {
 *     await this.connection.close();
 *   }
 * }
 * ```
 *
 * @category Lifecycle
 */
export interface OnModuleStop {
  /**
   * Called during module stop phase.
   */
  onModuleStop(): Promise<void> | void;
}

/**
 * Lifecycle hook called when a plugin is being initialized.
 *
 * Use this to register services and prepare the plugin.
 *
 * @example
 * ```typescript
 * @Plugin({ name: 'cache' })
 * export class CachePlugin implements OnPluginInit {
 *   async onPluginInit(): Promise<void> {
 *     console.log('Cache plugin initialized');
 *   }
 * }
 * ```
 *
 * @category Lifecycle
 */
export interface OnPluginInit {
  /**
   * Called during plugin initialization phase.
   */
  onPluginInit(): Promise<void> | void;
}

/**
 * Lifecycle hook called when a plugin is being started.
 *
 * Use this to connect to external resources.
 *
 * @example
 * ```typescript
 * @Plugin({ name: 'cache' })
 * export class CachePlugin implements OnPluginStart {
 *   async onPluginStart(): Promise<void> {
 *     await this.redis.connect();
 *   }
 * }
 * ```
 *
 * @category Lifecycle
 */
export interface OnPluginStart {
  /**
   * Called during plugin start phase.
   */
  onPluginStart(): Promise<void> | void;
}

/**
 * Lifecycle hook called when a plugin is being stopped.
 *
 * Use this to disconnect from resources and clean up.
 *
 * @example
 * ```typescript
 * @Plugin({ name: 'cache' })
 * export class CachePlugin implements OnPluginStop {
 *   async onPluginStop(): Promise<void> {
 *     await this.redis.disconnect();
 *   }
 * }
 * ```
 *
 * @category Lifecycle
 */
export interface OnPluginStop {
  /**
   * Called during plugin stop phase.
   */
  onPluginStop(): Promise<void> | void;
}

/**
 * Lifecycle hook called when the application is ready.
 *
 * All modules and plugins have been initialized and started.
 *
 * @example
 * ```typescript
 * @Module({})
 * export class AppModule implements OnApplicationReady {
 *   async onApplicationReady(): Promise<void> {
 *     console.log('Application is ready to handle requests');
 *   }
 * }
 * ```
 *
 * @category Lifecycle
 */
export interface OnApplicationReady {
  /**
   * Called when the application is fully started and ready.
   */
  onApplicationReady(): Promise<void> | void;
}

/**
 * Lifecycle hook called when the application is shutting down.
 *
 * @example
 * ```typescript
 * @Module({})
 * export class AppModule implements OnApplicationShutdown {
 *   async onApplicationShutdown(): Promise<void> {
 *     console.log('Application shutting down...');
 *   }
 * }
 * ```
 *
 * @category Lifecycle
 */
export interface OnApplicationShutdown {
  /**
   * Called when the application is shutting down.
   */
  onApplicationShutdown(): Promise<void> | void;
}

/**
 * Type guard to check if an object implements OnModuleInit.
 */
export function hasOnModuleInit(obj: any): obj is OnModuleInit {
  return typeof obj.onModuleInit === 'function';
}

/**
 * Type guard to check if an object implements OnModuleStart.
 */
export function hasOnModuleStart(obj: any): obj is OnModuleStart {
  return typeof obj.onModuleStart === 'function';
}

/**
 * Type guard to check if an object implements OnModuleStop.
 */
export function hasOnModuleStop(obj: any): obj is OnModuleStop {
  return typeof obj.onModuleStop === 'function';
}

/**
 * Type guard to check if an object implements OnPluginInit.
 */
export function hasOnPluginInit(obj: any): obj is OnPluginInit {
  return typeof obj.onPluginInit === 'function';
}

/**
 * Type guard to check if an object implements OnPluginStart.
 */
export function hasOnPluginStart(obj: any): obj is OnPluginStart {
  return typeof obj.onPluginStart === 'function';
}

/**
 * Type guard to check if an object implements OnPluginStop.
 */
export function hasOnPluginStop(obj: any): obj is OnPluginStop {
  return typeof obj.onPluginStop === 'function';
}

/**
 * Type guard to check if an object implements OnApplicationReady.
 */
export function hasOnApplicationReady(obj: any): obj is OnApplicationReady {
  return typeof obj.onApplicationReady === 'function';
}

/**
 * Type guard to check if an object implements OnApplicationShutdown.
 */
export function hasOnApplicationShutdown(obj: any): obj is OnApplicationShutdown {
  return typeof obj.onApplicationShutdown === 'function';
}
