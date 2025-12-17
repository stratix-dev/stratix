import {
  Context,
  ContextCommandDefinition,
  ContextQueryDefinition,
  ContextEventHandlerDefinition,
  ContextRepositoryDefinition,
  ContextConfig,
  ContextMetadata,
  HealthCheckResult,
  HealthStatus,
} from '@stratix/core';
import type { AwilixContainer } from '../di/awilix.js';
import { asValue } from '../di/awilix.js';

/**
 * Base implementation for contexts.
 *
 * Provides automatic registration of commands, queries, event handlers,
 * and repositories during the initialize phase.
 *
 * Subclasses only need to:
 * 1. Define metadata (name, dependencies)
 * 2. Set name property
 * 3. Implement getCommands(), getQueries(), getEventHandlers(), getRepositories()
 *
 * The base class handles all the wiring automatically.
 *
 * Note: Context is different from Plugin:
 * - Plugin: Infrastructure extensions (Postgres, Redis, RabbitMQ)
 * - Context: Domain/business logic contexts (Orders, Products, Inventory)
 *
 * @example
 * ```typescript
 * export class ProductsContext extends BaseContext {
 *   readonly metadata: ContextMetadata = {
 *     name: 'products-context',
 *     description: 'Products Domain Context',
 *     requiredPlugins: ['postgres'],
 *     requiredContexts: []
 *   };
 *
 *   readonly name = 'Products';
 *
 *   private productRepository!: ProductRepository;
 *
 *   getCommands(): ContextCommandDefinition[] {
 *     return [
 *       {
 *         name: 'CreateProduct',
 *         commandType: CreateProductCommand,
 *         handler: new CreateProductHandler(this.productRepository)
 *       },
 *       {
 *         name: 'UpdateProduct',
 *         commandType: UpdateProductCommand,
 *         handler: new UpdateProductHandler(this.productRepository)
 *       }
 *     ];
 *   }
 *
 *   getQueries(): ContextQueryDefinition[] {
 *     return [
 *       {
 *         name: 'GetProductById',
 *         queryType: GetProductByIdQuery,
 *         handler: new GetProductByIdHandler(this.productRepository)
 *       },
 *       {
 *         name: 'ListProducts',
 *         queryType: ListProductsQuery,
 *         handler: new ListProductsHandler(this.productRepository)
 *       }
 *     ];
 *   }
 *
 *   getEventHandlers(): ContextEventHandlerDefinition[] {
 *     return [
 *       {
 *         eventName: 'ProductCreated',
 *         eventType: ProductCreatedEvent,
 *         handler: new ProductCreatedHandler()
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
 *
 *   async initialize(config: ContextConfig): Promise<void> {
 *     // Repositories are registered first, so we can resolve them
 *     this.productRepository = config.container.resolve<ProductRepository>('productRepository');
 *
 *     // Call super to register all commands, queries, events
 *     await super.initialize(config);
 *   }
 * }
 * ```
 */
export abstract class BaseContext implements Context {
  /**
   * Context metadata (name, dependencies).
   * Must be implemented by subclasses.
   */
  abstract readonly metadata: ContextMetadata;

  /**
   * The name of the context.
   * Must be implemented by subclasses.
   */
  abstract readonly name: string;

  /**
   * Reference to the context configuration, available after initialize.
   */
  protected config?: ContextConfig;

  /**
   * Returns all command definitions for this context.
   * Override to provide commands for this context.
   *
   * @returns Array of command definitions (empty by default)
   */
  getCommands(): ContextCommandDefinition[] {
    return [];
  }

  /**
   * Returns all query definitions for this context.
   * Override to provide queries for this context.
   *
   * @returns Array of query definitions (empty by default)
   */
  getQueries(): ContextQueryDefinition[] {
    return [];
  }

  /**
   * Returns all event handler definitions for this context.
   * Override to provide event handlers for this context.
   *
   * @returns Array of event handler definitions (empty by default)
   */
  getEventHandlers(): ContextEventHandlerDefinition[] {
    return [];
  }

  /**
   * Returns all repository definitions for this context.
   * Override to provide repositories for this context.
   *
   * @returns Array of repository definitions (empty by default)
   */
  getRepositories(): ContextRepositoryDefinition[] {
    return [];
  }

  /**
   * Initializes the context.
   *
   * This method:
   * 1. Registers all repositories in the DI container
   * 2. Registers all commands with the command bus
   * 3. Registers all queries with the query bus
   * 4. Subscribes all event handlers to the event bus
   *
   * Subclasses can override this method but should call super.initialize()
   * to ensure automatic registration happens.
   *
   * @param config - The context configuration
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async initialize(config: ContextConfig): Promise<void> {
    this.config = config;

    // Cast to AwilixContainer for registration
    const container = config.container as unknown as AwilixContainer;

    // 1. Register repositories first (other things depend on them)
    const repositories = this.getRepositories();
    for (const repo of repositories) {
      // Register using Awilix directly
      container.register({
        [repo.token]: asValue(repo.instance)
      });
    }

    // 2. Get the buses from container
    const commandBus = config.container.resolve<{
      register: (commandType: new (...args: unknown[]) => unknown, handler: unknown) => void;
    }>('commandBus');

    const queryBus = config.container.resolve<{
      register: (queryType: new (...args: unknown[]) => unknown, handler: unknown) => void;
    }>('queryBus');

    const eventBus = config.container.resolve<{
      subscribe: (eventType: new (...args: unknown[]) => unknown, handler: unknown) => void;
    }>('eventBus');

    // 3. Register commands
    const commands = this.getCommands();
    for (const cmd of commands) {
      commandBus.register(cmd.commandType, cmd.handler);
    }

    // 4. Register queries
    const queries = this.getQueries();
    for (const query of queries) {
      queryBus.register(query.queryType, query.handler);
    }

    // 5. Subscribe event handlers
    const eventHandlers = this.getEventHandlers();
    for (const handler of eventHandlers) {
      eventBus.subscribe(handler.eventType, handler.handler);
    }
  }

  /**
   * Starts the context.
   * Override if your context needs to start external resources.
   *
   * @example
   * ```typescript
   * async start(): Promise<void> {
   *   await super.start();
   *   // Start any context-specific resources
   *   await this.myService.connect();
   * }
   * ```
   */
  async start(): Promise<void> {
    // Default implementation does nothing
    // Subclasses can override if needed
  }

  /**
   * Stops the context.
   * Override if your context needs to clean up resources.
   *
   * @example
   * ```typescript
   * async stop(): Promise<void> {
   *   await this.myService.disconnect();
   *   await super.stop();
   * }
   * ```
   */
  async stop(): Promise<void> {
    // Default implementation does nothing
    // Subclasses can override if needed
  }

  /**
   * Health check for the context.
   * Default implementation returns healthy.
   * Override to provide custom health checks.
   *
   * @returns Health check result
   *
   * @example
   * ```typescript
   * async healthCheck(): Promise<HealthCheckResult> {
   *   try {
   *     await this.productRepository.findAll();
   *     return { status: HealthStatus.UP };
   *   } catch (error) {
   *     return {
   *       status: HealthStatus.DOWN,
   *       message: `Repository error: ${error.message}`
   *     };
   *   }
   * }
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async healthCheck(): Promise<HealthCheckResult> {
    return {
      status: HealthStatus.UP,
      message: `${this.name} context is healthy`,
    };
  }
}
