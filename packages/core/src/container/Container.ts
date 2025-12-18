/**
 * Minimal dependency injection container interface.
 *
 * Defines the core contract that any DI container must implement.
 * Implementation-agnostic - works with any DI library.
 *
 * @example
 * ```typescript
 * // Resolve services
 * const logger = container.resolve<Logger>('logger');
 * const userService = container.resolve<UserService>('userService');
 *
 * // Create scopes for request-scoped services
 * const scope = container.createScope();
 * const requestContext = scope.resolve<RequestContext>('requestContext');
 * await scope.dispose();
 * ```
 *
 * @category Dependency Injection
 */
export interface Container {
  /**
   * Resolves a service from the container.
   *
   * @template T - The type of service to resolve
   * @param token - The service identifier (string or symbol)
   * @returns The resolved service instance
   * @throws Error if the service is not registered
   *
   * @example
   * ```typescript
   * const logger = container.resolve<Logger>('logger');
   * const cache = container.resolve<Cache>(Symbol.for('cache'));
   * ```
   */
  resolve<T>(token: string | symbol): T;

  /**
   * Creates a new scope for scoped services.
   *
   * Scoped services will have the same instance within a scope,
   * but different instances across different scopes.
   * Useful for request-scoped dependencies in web applications.
   *
   * @returns A new container scope
   *
   * @example
   * ```typescript
   * const scope = container.createScope();
   * const service1 = scope.resolve<ScopedService>('scopedService');
   * const service2 = scope.resolve<ScopedService>('scopedService');
   * // service1 === service2 (same scope)
   *
   * const scope2 = container.createScope();
   * const service3 = scope2.resolve<ScopedService>('scopedService');
   * // service3 !== service1 (different scope)
   * ```
   */
  createScope(): Container;

  /**
   * Disposes the container and all disposable services.
   *
   * Services implementing dispose() or Symbol.asyncDispose will have
   * their disposal methods called.
   *
   * @returns Promise that resolves when all services are disposed
   *
   * @example
   * ```typescript
   * const scope = container.createScope();
   * // Use scope...
   * await scope.dispose(); // Clean up resources
   * ```
   */
  dispose(): Promise<void>;
}
