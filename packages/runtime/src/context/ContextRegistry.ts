import type { Context } from '@stratix/core';
import { DependencyGraph } from '../graph/DependencyGraph.js';
import { DuplicatePluginError } from '../errors/RuntimeError.js';

/**
 * Registry for managing contexts and their dependencies.
 *
 * Maintains the dependency graph and provides contexts in initialization order.
 *
 * @example
 * ```typescript
 * const registry = new ContextRegistry();
 *
 * registry.register(productsContext);
 * registry.register(ordersContext);
 * registry.register(inventoryContext);
 *
 * const contexts = registry.getContextsInOrder();
 * // Contexts in dependency order
 * ```
 */
export class ContextRegistry {
  private contexts = new Map<string, Context>();
  private dependencyGraph = new DependencyGraph();

  /**
   * Registers a context.
   *
   * @param context - The context to register
   * @throws {DuplicatePluginError} If a context with the same name is already registered
   *
   * @example
   * ```typescript
   * registry.register(new ProductsContext());
   * ```
   */
  register(context: Context): void {
    const name = context.metadata.name;

    if (this.contexts.has(name)) {
      throw new DuplicatePluginError(name);
    }

    this.contexts.set(name, context);

    const dependencies = [
      ...(context.metadata.requiredPlugins || []),
      ...(context.metadata.requiredContexts || []),
    ];

    this.dependencyGraph.addNode(name, dependencies);
  }

  /**
   * Gets a context by name.
   *
   * @param name - The context name
   * @returns The context if found, undefined otherwise
   *
   * @example
   * ```typescript
   * const context = registry.get('products-context');
   * ```
   */
  get(name: string): Context | undefined {
    return this.contexts.get(name);
  }

  /**
   * Checks if a context is registered.
   *
   * @param name - The context name
   * @returns true if the context is registered
   */
  has(name: string): boolean {
    return this.contexts.has(name);
  }

  /**
   * Gets all registered context names.
   *
   * @returns Array of context names
   */
  getContextNames(): string[] {
    return Array.from(this.contexts.keys());
  }

  /**
   * Gets all registered contexts.
   *
   * @returns Array of contexts (order not guaranteed)
   */
  getAll(): Context[] {
    return Array.from(this.contexts.values());
  }

  /**
   * Gets contexts in topological order (dependency order).
   *
   * Contexts are returned in the order they should be initialized.
   * Plugins are initialized before contexts that depend on them.
   *
   * @returns Array of contexts in dependency order
   * @throws {CircularDependencyError} If circular dependencies exist
   * @throws {MissingDependencyError} If a dependency is not found
   *
   * @example
   * ```typescript
   * const contexts = registry.getContextsInOrder();
   * for (const context of contexts) {
   *   await context.initialize(config);
   * }
   * ```
   */
  getContextsInOrder(): Context[] {
    const sortedNames = this.dependencyGraph.topologicalSort();
    return sortedNames.map((name) => this.contexts.get(name)!).filter(Boolean);
  }

  /**
   * Gets contexts in reverse topological order.
   *
   * Useful for shutdown (shutdown in reverse initialization order).
   *
   * @returns Array of contexts in reverse dependency order
   */
  getContextsInReverseOrder(): Context[] {
    const sortedNames = this.dependencyGraph.reverseTopologicalSort();
    return sortedNames.map((name) => this.contexts.get(name)!).filter(Boolean);
  }

  /**
   * Gets the number of registered contexts.
   *
   * @returns The context count
   */
  get size(): number {
    return this.contexts.size;
  }

  /**
   * Clears all contexts from the registry.
   */
  clear(): void {
    this.contexts.clear();
    this.dependencyGraph.clear();
  }
}
