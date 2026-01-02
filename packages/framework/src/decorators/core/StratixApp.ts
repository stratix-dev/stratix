
import { MetadataStorage } from '../../runtime/MetadataStorage.js';

/**
 * Metadata for the @StratixApp decorator.
 */
export interface StratixAppMetadata {
  /**
   * Modules to load in this application.
   */
  modules: Array<{ new (...args: any[]): any }>;

  /**
   * Plugins to initialize (optional).
   */
  plugins?: any[];
}

/**
 * Decorator to mark a class as the main Stratix Application.
 *
 * This is the root of your application. It loads all modules and
 * bootstraps the framework.
 *
 * @param metadata - Application configuration
 *
 * @example
 * ```typescript
 * @StratixApp({
 *   modules: [UserModule, OrderModule, ProductModule]
 * })
 * export class App {}
 *
 * // Bootstrap
 * await bootstrap(App);
 * ```
 *
 * @category Core Decorators
 */
export function StratixApp(metadata: StratixAppMetadata) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext<T>
  ) {
    const { modules, plugins = [] } = metadata;

    // Store in context metadata
    if (context.metadata) {
      context.metadata['stratixApp'] = {
        modules,
        plugins,
      };
    }

    // Register app metadata in global storage
    MetadataStorage.registerApp(target, {
      target,
      modules,
      plugins,
    });

    return target;
  };
}
