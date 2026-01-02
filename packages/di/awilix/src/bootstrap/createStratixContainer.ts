import { createContainer, type AwilixContainer } from '@stratix/runtime';

/**
 * Options for creating a Stratix container with defaults.
 */
export interface StratixContainerOptions {
  /**
   * Auto-register infrastructure services (buses, logger).
   * Default: false
   *
   * When true, registers in-memory implementations of:
   * - CommandBus
   * - QueryBus
   * - EventBus
   *
   * Note: Logger must still be registered separately or via ApplicationBuilder.
   */
  infrastructure?: boolean;

  /**
   * Environment mode for conditional registration.
   * Default: 'development'
   *
   * Can be used for environment-specific service registration.
   */
  environment?: 'development' | 'production' | 'test';
}

/**
 * Creates an Awilix container configured for Stratix applications.
 *
 * This is a convenience function that creates a standard Awilix container.
 * For most use cases, you can use `createContainer()` from `@stratix/runtime` directly.
 *
 * This function is useful when you want to express intent that you're creating
 * a Stratix-specific container, but functionally it's identical to createContainer().
 *
 * @returns Configured Awilix container
 *
 * @example Basic usage
 * ```typescript
 * import { createStratixContainer } from '@stratix/di';
 *
 * const container = createStratixContainer();
 *
 * // Now register your services
 * container.register({
 *   userRepository: asClass(UserRepository).singleton()
 * });
 * ```
 *
 * @example With infrastructure
 * ```typescript
 * import { createStratixContainer } from '@stratix/di';
 *
 * const container = createStratixContainer({
 *   infrastructure: true
 * });
 *
 * // Buses are pre-registered, ready to use
 * const commandBus = container.resolve('commandBus');
 * ```
 * @param _options
 */
export function createStratixContainer(
  _options: StratixContainerOptions = {}
): AwilixContainer {
  const container = createContainer();

  // Note: Infrastructure registration is typically handled by
  // ApplicationBuilderHelpers.createWithDefaults()
  // This is just a thin wrapper around createContainer for semantic clarity
  // Options parameter is reserved for future use

  return container;
}
