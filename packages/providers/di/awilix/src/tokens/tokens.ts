import { createToken } from './createToken.js';
import type { CommandBus, QueryBus, EventBus, Logger } from '@stratix/core';

/**
 * Pre-defined type-safe tokens for common Stratix services.
 *
 * These tokens correspond to the standard infrastructure services
 * registered by Stratix runtime.
 *
 * @example
 * ```typescript
 * import { TOKENS } from '@stratix/di';
 * import { createContainer } from '@stratix/runtime';
 *
 * const container = createContainer();
 *
 * // Type-safe resolution
 * const commandBus = TOKENS.COMMAND_BUS.resolve(container);
 * const logger = TOKENS.LOGGER.resolve(container);
 * ```
 */
export const TOKENS = {
  /**
   * Command bus token for CQRS command handling.
   */
  COMMAND_BUS: createToken<CommandBus>('commandBus'),

  /**
   * Query bus token for CQRS query handling.
   */
  QUERY_BUS: createToken<QueryBus>('queryBus'),

  /**
   * Event bus token for domain event handling.
   */
  EVENT_BUS: createToken<EventBus>('eventBus'),

  /**
   * Logger token for application logging.
   */
  LOGGER: createToken<Logger>('logger'),

  /**
   * Configuration provider token.
   */
  CONFIG: createToken<any>('config')
} as const;
