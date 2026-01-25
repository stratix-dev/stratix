/**
 * Metadata describing a context.
 * @category Runtime & Application
 *
 * @example
 * ```TypeScript
 * {
 *   name: 'products-context',
 *   description: 'Products management',
 *   version: '1.0.0',
 *   requiredPlugins: ['postgres', 'redis'],
 *   requiredContexts: ['users-context']
 * }
 * ```
 */
export interface ContextMetadata {
  /**
   * Unique name of the context.
   * Convention: '{context}-context' (e.g., 'products-context', 'orders-context')
   */
  name: string;

  /**
   * Context version (semver).
   */
  version: string;

  /**
   * Description of what the context does.
   */
  description?: string;

  /**
   * Names of plugins that this context requires.
   * Plugins must be initialized before this context.
   *
   * @example ['postgres', 'redis', 'rabbitmq']
   */
  requiredPlugins?: string[];

  /**
   * Names of other contexts that this context depends on.
   * Contexts must be initialized before this context.
   *
   * @example ['users-context', 'inventory-context']
   */
  requiredContexts?: string[];

  /**
   * Tags for categorization and filtering.
   *
   * @example ['core', 'commerce', 'api']
   */
  tags?: string[];
}
