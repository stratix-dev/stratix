import type { Command, CommandHandler, Query, QueryHandler } from '@stratix/core';
import type { AwilixContainer } from '../di/awilix.js';
import { asFunction, asValue, asClass } from '../di/awilix.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */

/**
 * Registration configuration for commands.
 */
export interface CommandRegistration {
  /**
   * The command type (class).
   */
  commandType: new (...args: any[]) => Command;

  /**
   * The handler instance or class.
   */
  handler: CommandHandler<any, any> | (new (...args: any[]) => CommandHandler<any, any>);

  /**
   * Whether to register as singleton (default: false, uses transient).
   */
  singleton?: boolean;
}

/**
 * Registration configuration for queries.
 */
export interface QueryRegistration {
  /**
   * The query type (class).
   */
  queryType: new (...args: any[]) => Query;

  /**
   * The handler instance or class.
   */
  handler: QueryHandler<any, any> | (new (...args: any[]) => QueryHandler<any, any>);

  /**
   * Whether to register as singleton (default: false, uses transient).
   */
  singleton?: boolean;
}

/**
 * Helpers for common DI container operations using Awilix.
 *
 * Simplifies registration of commands, queries, and common services
 * following Stratix patterns.
 *
 * @example
 * ```typescript
 * import { createContainer } from '@stratix/runtime';
 * import { ContainerHelpers } from '@stratix/runtime';
 *
 * const container = createContainer();
 *
 * // Register multiple commands at once
 * ContainerHelpers.registerCommands(container, commandBus, [
 *   { commandType: CreateProductCommand, handler: CreateProductHandler },
 *   { commandType: UpdateProductCommand, handler: UpdateProductHandler }
 * ]);
 * ```
 */
export class ContainerHelpers {
  /**
   * Registers default infrastructure services in the container.
   *
   * Registers common services like command bus, query bus, event bus, and logger
   * with sensible defaults for development and testing.
   *
   * @param container - The Awilix DI container
   * @param options - Optional configuration for default services
   *
   * @example
   * ```typescript
   * import { createContainer } from '@stratix/runtime';
   * const container = createContainer();
   * ContainerHelpers.registerDefaults(container, {
   *   useInMemoryBuses: true,
   *   logger: new ConsoleLogger()
   * });
   * ```
   */
  static registerDefaults(
    container: AwilixContainer,
    options: {
      /**
       * Whether to use in-memory buses (default: true).
       */
      useInMemoryBuses?: boolean;

      /**
       * Custom logger instance.
       */
      logger?: any;
    } = {}
  ): void {
    const { useInMemoryBuses = true, logger } = options;

    // Register buses if using in-memory
    if (useInMemoryBuses) {
      // Note: Actual bus implementations would be imported and registered here
      // For now, this is a placeholder showing the pattern
      container.register({
        commandBus: asFunction(() => {
          throw new Error('InMemoryCommandBus not available in this context. Import from messaging package.');
        }).singleton(),

        queryBus: asFunction(() => {
          throw new Error('InMemoryQueryBus not available in this context. Import from messaging package.');
        }).singleton(),

        eventBus: asFunction(() => {
          throw new Error('InMemoryEventBus not available in this context. Import from messaging package.');
        }).singleton()
      });
    }

    // Register logger
    if (logger) {
      container.register({
        logger: asValue(logger)
      });
    }
  }

  /**
   * Registers multiple commands and their handlers with the command bus.
   *
   * Simplifies bulk registration of command handlers following Stratix patterns.
   *
   * @param container - The Awilix DI container
   * @param commandBus - The command bus instance
   * @param registrations - Array of command registrations
   *
   * @example
   * ```typescript
   * ContainerHelpers.registerCommands(container, commandBus, [
   *   {
   *     commandType: CreateProductCommand,
   *     handler: CreateProductHandler, // Class for auto-wiring
   *     singleton: false
   *   },
   *   {
   *     commandType: UpdateProductCommand,
   *     handler: new UpdateProductHandler(repo), // Instance
   *     singleton: true
   *   }
   * ]);
   * ```
   */
  static registerCommands(
    container: AwilixContainer,
    commandBus: { register: (commandType: any, handler: any) => void },
    registrations: CommandRegistration[]
  ): void {
    for (const registration of registrations) {
      const { commandType, handler, singleton = false } = registration;

      // Register handler in container
      const handlerKey = `commandHandler:${commandType.name}`;

      // Check if handler is a class or instance
      if (typeof handler === 'function' && handler.prototype) {
        // It's a class - use asClass for auto-wiring
        container.register({
          [handlerKey]: singleton
            ? asClass(handler as any).singleton()
            : asClass(handler as any).transient()
        });
      } else {
        // It's an instance - use asValue
        container.register({
          [handlerKey]: asValue(handler)
        });
      }

      // Register with command bus
      const resolvedHandler = container.resolve(handlerKey);
      commandBus.register(commandType, resolvedHandler);
    }
  }

  /**
   * Registers multiple queries and their handlers with the query bus.
   *
   * Simplifies bulk registration of query handlers following Stratix patterns.
   *
   * @param container - The Awilix DI container
   * @param queryBus - The query bus instance
   * @param registrations - Array of query registrations
   *
   * @example
   * ```typescript
   * ContainerHelpers.registerQueries(container, queryBus, [
   *   {
   *     queryType: GetProductByIdQuery,
   *     handler: GetProductByIdHandler, // Class for auto-wiring
   *     singleton: true
   *   },
   *   {
   *     queryType: ListProductsQuery,
   *     handler: new ListProductsHandler(repo) // Instance
   *   }
   * ]);
   * ```
   */
  static registerQueries(
    container: AwilixContainer,
    queryBus: { register: (queryType: any, handler: any) => void },
    registrations: QueryRegistration[]
  ): void {
    for (const registration of registrations) {
      const { queryType, handler, singleton = false } = registration;

      // Register handler in container
      const handlerKey = `queryHandler:${queryType.name}`;

      // Check if handler is a class or instance
      if (typeof handler === 'function' && handler.prototype) {
        // It's a class - use asClass for auto-wiring
        container.register({
          [handlerKey]: singleton
            ? asClass(handler as any).singleton()
            : asClass(handler as any).transient()
        });
      } else {
        // It's an instance - use asValue
        container.register({
          [handlerKey]: asValue(handler)
        });
      }

      // Register with query bus
      const resolvedHandler = container.resolve(handlerKey);
      queryBus.register(queryType, resolvedHandler);
    }
  }

  /**
   * Registers a repository in the container with a specific token.
   *
   * @param container - The Awilix DI container
   * @param token - The registration token (e.g., 'productRepository')
   * @param repository - The repository instance, class, or factory
   * @param options - Registration options
   *
   * @example
   * ```typescript
   * // Register instance
   * ContainerHelpers.registerRepository(
   *   container,
   *   'productRepository',
   *   new InMemoryProductRepository()
   * );
   *
   * // Register class (with auto-wiring)
   * ContainerHelpers.registerRepository(
   *   container,
   *   'userRepository',
   *   PostgresUserRepository
   * );
   *
   * // Register factory
   * ContainerHelpers.registerRepository(
   *   container,
   *   'orderRepository',
   *   () => new InMemoryOrderRepository(),
   *   { singleton: false }
   * );
   * ```
   */
  static registerRepository(
    container: AwilixContainer,
    token: string,
    repository: any | (() => any) | (new (...args: any[]) => any),
    options: { singleton?: boolean } = {}
  ): void {
    const { singleton = true } = options;

    // Determine type of repository
    if (typeof repository === 'function') {
      // Could be a class or factory function
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (repository.prototype && repository.prototype.constructor === repository) {
        // It's a class
        container.register({
          [token]: singleton
            ? asClass(repository).singleton()
            : asClass(repository).transient()
        });
      } else {
        // It's a factory function
        container.register({
          [token]: singleton
            ? asFunction(repository).singleton()
            : asFunction(repository).transient()
        });
      }
    } else {
      // It's an instance
      container.register({
        [token]: asValue(repository)
      });
    }
  }

  /**
   * Registers multiple repositories at once.
   *
   * @param container - The Awilix DI container
   * @param repositories - Map of token to repository (instance, class, or factory)
   * @param options - Default registration options
   *
   * @example
   * ```typescript
   * ContainerHelpers.registerRepositories(container, {
   *   productRepository: new InMemoryProductRepository(),
   *   userRepository: PostgresUserRepository, // Class
   *   orderRepository: () => new InMemoryOrderRepository() // Factory
   * });
   * ```
   */
  static registerRepositories(
    container: AwilixContainer,
    repositories: Record<string, any | (() => any) | (new (...args: any[]) => any)>,
    options: { singleton?: boolean } = {}
  ): void {
    for (const [token, repository] of Object.entries(repositories)) {
      ContainerHelpers.registerRepository(container, token, repository, options);
    }
  }
}
