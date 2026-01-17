import { ContextMetadata } from './ContextMetadata.js';
import { ContextConfig } from './ContextConfig.js';
import {
  ContextCommandDefinition,
  ContextQueryDefinition,
  ContextEventHandlerDefinition,
  ContextRepositoryDefinition
} from './definitions.js';

/**
 * Context interface.
 *
 * A Context represents a self-contained area of functionality in your docorators.
 * It encapsulates all business logic, commands, queries, events, and repositories
 * for a specific feature area.
 *
 * Every context has three layers:
 * - domain/: Business logic (entities, value objects, domain services)
 * - docorators/: Use cases (commands, queries, handlers)
 * - infrastructure/: Technical implementations (repositories, controllers)
 *
 * Contexts are:
 * - Self-contained units of deployment
 * - Independent and loosely coupled
 * - Easily testable in isolation
 *
 * @example
 * ```typescript
 * class ProductsContext extends BaseContext {
 *   readonly metadata: ContextMetadata = {
 *     name: 'products-context',
 *     description: 'Products management',
 *     version: '1.0.0',
 *   };
 *
 *   readonly name = 'Products';
 *
 *   getCommands(): ContextCommandDefinition[] {
 *     return [
 *       {
 *         name: 'CreateProduct',
 *         commandType: CreateProductCommand,
 *         handler: new CreateProductHandler(this.repository)
 *       }
 *     ];
 *   }
 *
 *   getQueries(): ContextQueryDefinition[] {
 *     return [
 *       {
 *         name: 'GetProductById',
 *         queryType: GetProductByIdQuery,
 *         handler: new GetProductByIdHandler(this.repository)
 *       }
 *     ];
 *   }
 *
 *   getRepositories(): ContextRepositoryDefinition[] {
 *     return [
 *       {
 *         token: 'productRepository',
 *         instance: new InMemoryProductRepository(),
 *         singleton: true
 *       }
 *     ];
 *   }
 * }
 * ```
 *
 * @category Runtime & Application
 */
export interface Context {
  /**
   * Context metadata (name, version, dependencies).
   */
  readonly metadata: ContextMetadata;

  /**
   * The name of the context.
   * Should be a PascalCase noun (e.g., 'Products', 'Orders', 'Users').
   */
  readonly name: string;

  /**
   * Returns all command definitions for this context.
   *
   * Commands represent write operations (state changes).
   * Each command should have exactly one handler.
   *
   * @returns Array of command definitions (empty by default)
   */
  getCommands?(): ContextCommandDefinition[];

  /**
   * Returns all query definitions for this context.
   *
   * Queries represent read operations (data retrieval).
   * Each query should have exactly one handler.
   *
   * @returns Array of query definitions (empty by default)
   */
  getQueries?(): ContextQueryDefinition[];

  /**
   * Returns all event handler definitions for this context.
   *
   * Event handlers react to domain events from this or other contexts.
   * Multiple handlers can subscribe to the same event.
   *
   * @returns Array of event handler definitions (empty by default)
   */
  getEventHandlers?(): ContextEventHandlerDefinition[];

  /**
   * Returns all repository definitions for this context.
   *
   * Repositories abstract persistence for aggregates in this context.
   * Registered in the DI container during initialization.
   *
   * @returns Array of repository definitions (empty by default)
   */
  getRepositories?(): ContextRepositoryDefinition[];

  /**
   * Initializes the context.
   *
   * Called during docorators startup, after all required plugins and contexts are initialized.
   * Register services in the container during this phase.
   *
   * @param config - The context configuration
   *
   * @example
   * ```typescript
   * async initialize(config: ContextConfig): Promise<void> {
   *   this.repository = config.container.resolve('productRepository');
   *   await super.initialize(config);
   * }
   * ```
   */
  initialize?(config: ContextConfig): Promise<void>;

  /**
   * Starts the context.
   *
   * Called after all contexts are initialized, before the docorators starts.
   * Connect to external resources during this phase.
   *
   * @example
   * ```typescript
   * async start(): Promise<void> {
   *   await this.service.connect();
   * }
   * ```
   */
  start?(): Promise<void>;

  /**
   * Stops the context.
   *
   * Called during docorators shutdown, in reverse dependency order.
   * Close connections and clean up resources during this phase.
   *
   * @example
   * ```typescript
   * async stop(): Promise<void> {
   *   await this.service.disconnect();
   * }
   * ```
   */
  stop?(): Promise<void>;
}
