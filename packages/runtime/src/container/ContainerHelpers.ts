import type { Container, Command, CommandHandler, Query, QueryHandler, ServiceLifetime } from '@stratix/core';

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
   * The handler instance or factory function.
   */
  handler: CommandHandler<any, any> | (() => CommandHandler<any, any>);
  
  /**
   * Service lifetime (default: TRANSIENT).
   */
  lifetime?: ServiceLifetime;
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
   * The handler instance or factory function.
   */
  handler: QueryHandler<any, any> | (() => QueryHandler<any, any>);
  
  /**
   * Service lifetime (default: TRANSIENT).
   */
  lifetime?: ServiceLifetime;
}

/**
 * Helpers for common DI container operations.
 *
 * Simplifies registration of commands, queries, and common services
 * in the dependency injection container.
 *
 * @example
 * ```typescript
 * const container = new AwilixContainer();
 *
 * // Register multiple commands at once
 * ContainerHelpers.registerCommands(container, commandBus, [
 *   { commandType: CreateProductCommand, handler: new CreateProductHandler(repo) },
 *   { commandType: UpdateProductCommand, handler: new UpdateProductHandler(repo) }
 * ]);
 *
 * // Register default infrastructure
 * ContainerHelpers.registerDefaults(container);
 * ```
 */
export class ContainerHelpers {
  /**
   * Registers default infrastructure services in the container.
   *
   * Registers common services like command bus, query bus, event bus, and logger
   * with sensible defaults for development and testing.
   *
   * @param container - The DI container
   * @param options - Optional configuration for default services
   *
   * @example
   * ```typescript
   * const container = new AwilixContainer();
   * ContainerHelpers.registerDefaults(container, {
   *   logLevel: 'debug',
   *   useInMemoryBuses: true
   * });
   * ```
   */
  static registerDefaults(
    container: Container,
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
      container.register(
        'commandBus',
        () => {
          // Would return new InMemoryCommandBus()
          throw new Error('InMemoryCommandBus not available in this context');
        },
        { lifetime: 'SINGLETON' as ServiceLifetime }
      );

      container.register(
        'queryBus',
        () => {
          // Would return new InMemoryQueryBus()
          throw new Error('InMemoryQueryBus not available in this context');
        },
        { lifetime: 'SINGLETON' as ServiceLifetime }
      );

      container.register(
        'eventBus',
        () => {
          // Would return new InMemoryEventBus()
          throw new Error('InMemoryEventBus not available in this context');
        },
        { lifetime: 'SINGLETON' as ServiceLifetime }
      );
    }

    // Register logger
    if (logger) {
      container.register('logger', () => logger, {
        lifetime: 'SINGLETON' as ServiceLifetime,
      });
    }
  }

  /**
   * Registers multiple commands and their handlers with the command bus.
   *
   * Simplifies bulk registration of command handlers.
   *
   * @param container - The DI container
   * @param commandBus - The command bus instance
   * @param registrations - Array of command registrations
   *
   * @example
   * ```typescript
   * ContainerHelpers.registerCommands(container, commandBus, [
   *   {
   *     commandType: CreateProductCommand,
   *     handler: new CreateProductHandler(productRepo),
   *     lifetime: ServiceLifetime.TRANSIENT
   *   },
   *   {
   *     commandType: UpdateProductCommand,
   *     handler: () => new UpdateProductHandler(productRepo)
   *   }
   * ]);
   * ```
   */
  static registerCommands(
    container: Container,
    commandBus: { register: (commandType: any, handler: any) => void },
    registrations: CommandRegistration[]
  ): void {
    for (const registration of registrations) {
      const { commandType, handler, lifetime = 'TRANSIENT' as ServiceLifetime } = registration;

      // Register handler in container
      const handlerKey = `commandHandler:${commandType.name}`;
      const handlerFactory = typeof handler === 'function' && handler.constructor.name === 'Function'
        ? handler
        : () => handler;

      container.register(handlerKey, handlerFactory as () => any, { lifetime });

      // Register with command bus
      const resolvedHandler = container.resolve(handlerKey);
      commandBus.register(commandType, resolvedHandler);
    }
  }

  /**
   * Registers multiple queries and their handlers with the query bus.
   *
   * Simplifies bulk registration of query handlers.
   *
   * @param container - The DI container
   * @param queryBus - The query bus instance
   * @param registrations - Array of query registrations
   *
   * @example
   * ```typescript
   * ContainerHelpers.registerQueries(container, queryBus, [
   *   {
   *     queryType: GetProductByIdQuery,
   *     handler: new GetProductByIdHandler(productRepo),
   *     lifetime: ServiceLifetime.SINGLETON
   *   },
   *   {
   *     queryType: ListProductsQuery,
   *     handler: () => new ListProductsHandler(productRepo)
   *   }
   * ]);
   * ```
   */
  static registerQueries(
    container: Container,
    queryBus: { register: (queryType: any, handler: any) => void },
    registrations: QueryRegistration[]
  ): void {
    for (const registration of registrations) {
      const { queryType, handler, lifetime = 'TRANSIENT' as ServiceLifetime } = registration;

      // Register handler in container
      const handlerKey = `queryHandler:${queryType.name}`;
      const handlerFactory = typeof handler === 'function' && handler.constructor.name === 'Function'
        ? handler
        : () => handler;

      container.register(handlerKey, handlerFactory as () => any, { lifetime });

      // Register with query bus
      const resolvedHandler = container.resolve(handlerKey);
      queryBus.register(queryType, resolvedHandler);
    }
  }

  /**
   * Registers a repository in the container with a specific token.
   *
   * @param container - The DI container
   * @param token - The registration token (e.g., 'productRepository')
   * @param repository - The repository instance or factory
   * @param options - Registration options
   *
   * @example
   * ```typescript
   * ContainerHelpers.registerRepository(
   *   container,
   *   'productRepository',
   *   new InMemoryProductRepository(),
   *   { singleton: true }
   * );
   * ```
   */
  static registerRepository(
    container: Container,
    token: string,
    repository: any | (() => any),
    options: { singleton?: boolean } = {}
  ): void {
    const { singleton = true } = options;
    const factory = typeof repository === 'function' ? repository : () => repository;
    const lifetime = singleton ? ('SINGLETON' as ServiceLifetime) : ('TRANSIENT' as ServiceLifetime);

    container.register(token, factory, { lifetime });
  }

  /**
   * Registers multiple repositories at once.
   *
   * @param container - The DI container
   * @param repositories - Map of token to repository
   * @param options - Default registration options
   *
   * @example
   * ```typescript
   * ContainerHelpers.registerRepositories(container, {
   *   productRepository: new InMemoryProductRepository(),
   *   userRepository: new InMemoryUserRepository(),
   *   orderRepository: () => new InMemoryOrderRepository()
   * });
   * ```
   */
  static registerRepositories(
    container: Container,
    repositories: Record<string, any | (() => any)>,
    options: { singleton?: boolean } = {}
  ): void {
    for (const [token, repository] of Object.entries(repositories)) {
      ContainerHelpers.registerRepository(container, token, repository, options);
    }
  }
}
