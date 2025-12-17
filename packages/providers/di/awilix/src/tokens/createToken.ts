import type { AwilixContainer } from '@stratix/runtime';

/**
 * Type-safe token for service resolution.
 *
 * Provides compile-time type safety when resolving services from the container.
 */
export interface Token<T> {
  /**
   * Unique symbol for this token.
   */
  readonly symbol: symbol;

  /**
   * Human-readable name for this token.
   */
  readonly name: string;

  /**
   * Resolve the service from the container with type safety.
   *
   * @param container - The Awilix container
   * @returns The resolved service instance
   *
   * @example
   * ```typescript
   * const LOGGER = createToken<Logger>('logger');
   * const logger = LOGGER.resolve(container); // Type: Logger
   * ```
   */
  resolve(container: AwilixContainer): T;
}

/**
 * Creates a type-safe token for service resolution.
 *
 * Tokens provide compile-time type safety and prevent typos in service names.
 *
 * @param name - The service name (must match the registration name)
 * @returns A type-safe token
 *
 * @example
 * ```typescript
 * import { createToken } from '@stratix/di';
 * import { createContainer } from '@stratix/runtime';
 *
 * // Define tokens
 * const LOGGER = createToken<Logger>('logger');
 * const USER_REPO = createToken<UserRepository>('userRepository');
 *
 * // Register services
 * container.register({
 *   logger: asClass(ConsoleLogger).singleton(),
 *   userRepository: asClass(UserRepository).singleton()
 * });
 *
 * // Type-safe resolution
 * const logger = LOGGER.resolve(container); // Type: Logger
 * const repo = USER_REPO.resolve(container); // Type: UserRepository
 * ```
 */
export function createToken<T>(name: string): Token<T> {
  const symbol = Symbol(name);

  return {
    symbol,
    name,
    resolve(container: AwilixContainer): T {
      return container.resolve<T>(name);
    }
  };
}
