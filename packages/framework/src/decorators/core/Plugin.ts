
import { MetadataStorage } from '../../runtime/MetadataStorage.js';

/**
 * Metadata for the @Plugin decorator.
 */
export interface PluginDecoratorMetadata {
  /**
   * Unique name of the plugin.
   */
  name: string;

  /**
   * Description of what the plugin does.
   */
  description?: string;

  /**
   * Version of the plugin.
   */
  version?: string;

  /**
   * Other plugins this plugin depends on.
   */
  dependencies?: string[];
}

/**
 * Decorator to mark a class as a Plugin.
 *
 * Plugins extend framework capabilities and have a lifecycle:
 * initialize → start → (running) → stop
 *
 * @param metadata - Plugin configuration
 *
 * @example
 * ```typescript
 * @Plugin({
 *   name: 'database',
 *   description: 'PostgreSQL database connection',
 *   version: '1.0.0',
 *   dependencies: []
 * })
 * export class DatabasePlugin implements OnPluginInit, OnPluginStart, OnPluginStop {
 *   private connection?: DatabaseConnection;
 *
 *   async onPluginInit(): Promise<void> {
 *     console.log('Initializing database plugin...');
 *   }
 *
 *   async onPluginStart(): Promise<void> {
 *     this.connection = await createConnection({
 *       host: 'localhost',
 *       port: 5432
 *     });
 *     console.log('Database connected');
 *   }
 *
 *   async onPluginStop(): Promise<void> {
 *     await this.connection?.close();
 *     console.log('Database disconnected');
 *   }
 * }
 * ```
 *
 * @category Core Decorators
 */
export function Plugin(metadata: PluginDecoratorMetadata) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext<T>
  ) {
    const { name, description, version, dependencies = [] } = metadata;

    // Store in context metadata
    if (context.metadata) {
      context.metadata['plugin'] = {
        name,
        description,
        version,
        dependencies,
      };
    }

    // Register plugin metadata in global storage
    MetadataStorage.registerPlugin(target, {
      target,
      name,
      description,
      version,
      dependencies,
    });

    return target;
  };
}
