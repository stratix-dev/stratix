import { asClass, asFunction, type Resolver } from '@stratix/runtime';

/**
 * DDD/CQRS pattern-based resolvers for Awilix.
 *
 * Provides opinionated registration patterns for common DDD building blocks.
 * These patterns encode best practices for service lifetimes based on their roles.
 *
 * @example
 * ```typescript
 * import { createContainer } from '@stratix/runtime';
 * import { DIPatterns } from '@stratix/di';
 *
 * const container = createContainer();
 *
 * container.register({
 *   // Command handlers are scoped per request
 *   createUserHandler: DIPatterns.command(CreateUserHandler),
 *
 *   // Repositories are singletons
 *   userRepository: DIPatterns.repository(UserRepository),
 *
 *   // Aggregates are transient (new instance each time)
 *   userAggregate: DIPatterns.aggregate(User)
 * });
 * ```
 */
export const DIPatterns = {
  /**
   * Command handler pattern - scoped per request.
   *
   * Command handlers should be scoped to ensure they have access to
   * request-specific context while allowing dependency injection.
   *
   * @param handler - The command handler class
   * @returns Awilix resolver configured for scoped lifetime
   *
   * @example
   * ```typescript
   * container.register({
   *   createUserHandler: DIPatterns.command(CreateUserHandler),
   *   updateUserHandler: DIPatterns.command(UpdateUserHandler)
   * });
   * ```
   */
  command: <T>(handler: new (...args: any[]) => T): Resolver<T> => {
    return asClass(handler).scoped();
  },

  /**
   * Query handler pattern - scoped per request.
   *
   * Query handlers should be scoped for the same reasons as command handlers.
   *
   * @param handler - The query handler class
   * @returns Awilix resolver configured for scoped lifetime
   *
   * @example
   * ```typescript
   * container.register({
   *   getUserHandler: DIPatterns.query(GetUserHandler),
   *   listUsersHandler: DIPatterns.query(ListUsersHandler)
   * });
   * ```
   */
  query: <T>(handler: new (...args: any[]) => T): Resolver<T> => {
    return asClass(handler).scoped();
  },

  /**
   * Repository pattern - singleton.
   *
   * Repositories manage data access and should typically be singletons
   * as they often maintain connection pools or caches.
   *
   * @param repo - The repository class
   * @returns Awilix resolver configured for singleton lifetime
   *
   * @example
   * ```typescript
   * container.register({
   *   userRepository: DIPatterns.repository(UserRepository),
   *   productRepository: DIPatterns.repository(ProductRepository)
   * });
   * ```
   */
  repository: <T>(repo: new (...args: any[]) => T): Resolver<T> => {
    return asClass(repo).singleton();
  },

  /**
   * Aggregate root pattern - transient (new instance each time).
   *
   * Aggregate roots represent domain entities and should be created fresh
   * for each use to avoid state pollution.
   *
   * @param aggregate - The aggregate root class
   * @returns Awilix resolver configured for transient lifetime
   *
   * @example
   * ```typescript
   * container.register({
   *   user: DIPatterns.aggregate(User),
   *   order: DIPatterns.aggregate(Order)
   * });
   * ```
   */
  aggregate: <T>(aggregate: new (...args: any[]) => T): Resolver<T> => {
    return asClass(aggregate).transient();
  },

  /**
   * Domain service pattern - singleton.
   *
   * Domain services encapsulate business logic that doesn't belong to
   * a specific entity. They are typically stateless and can be singletons.
   *
   * @param service - The domain service class
   * @returns Awilix resolver configured for singleton lifetime
   *
   * @example
   * ```typescript
   * container.register({
   *   pricingService: DIPatterns.domainService(PricingService),
   *   shippingService: DIPatterns.domainService(ShippingService)
   * });
   * ```
   */
  domainService: <T>(service: new (...args: any[]) => T): Resolver<T> => {
    return asClass(service).singleton();
  },

  /**
   * Application service pattern - singleton.
   *
   * Application services orchestrate use cases and coordinate between
   * domain objects. They are typically stateless and can be singletons.
   *
   * @param service - The application service class
   * @returns Awilix resolver configured for singleton lifetime
   *
   * @example
   * ```typescript
   * container.register({
   *   userService: DIPatterns.applicationService(UserService),
   *   orderService: DIPatterns.applicationService(OrderService)
   * });
   * ```
   */
  applicationService: <T>(service: new (...args: any[]) => T): Resolver<T> => {
    return asClass(service).singleton();
  },

  /**
   * Factory pattern - transient function.
   *
   * Factories create instances and should return new instances each time.
   *
   * @param factory - The factory function
   * @returns Awilix resolver configured for transient lifetime
   *
   * @example
   * ```typescript
   * container.register({
   *   userFactory: DIPatterns.factory((deps) => {
   *     return (data) => new User(data, deps.validator);
   *   })
   * });
   * ```
   */
  factory: <T>(factory: (...args: any[]) => T): Resolver<T> => {
    return asFunction(factory).transient();
  }
} as const;
