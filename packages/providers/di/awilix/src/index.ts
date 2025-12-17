/**
 * @stratix/di - DI Utilities for Stratix Framework
 *
 * Provides patterns, utilities, and helpers for dependency injection
 * in Stratix applications using Awilix.
 *
 * @example
 * ```typescript
 * import { createContainer } from '@stratix/runtime';
 * import { DIPatterns, TOKENS, createToken } from '@stratix/di';
 *
 * const container = createContainer();
 *
 * // Use patterns for DDD/CQRS
 * container.register({
 *   userRepository: DIPatterns.repository(UserRepository),
 *   createUserHandler: DIPatterns.command(CreateUserHandler)
 * });
 *
 * // Type-safe resolution
 * const logger = TOKENS.LOGGER.resolve(container);
 * ```
 */

// Patterns for DDD/CQRS
export * from './patterns/index.js';

// Type-safe tokens
export * from './tokens/index.js';

// Bootstrap utilities
export * from './bootstrap/index.js';
