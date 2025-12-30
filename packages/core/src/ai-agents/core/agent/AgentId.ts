import { EntityId } from '../../../core/EntityId.js';

/**
 * Type-safe identifier for AI agents.
 *
 * Uses phantom typing to prevent mixing agent IDs with other entity IDs.
 *
 * @example
 * ```typescript
 * const id = AgentId.create();
 * console.log(id.value); // "550e8400-e29b-41d4-a716-446655440000"
 *
 * // Type error - can't use UserID where AgentID expected
 * function processAgent(id: AgentId) { ... }
 * const userId: EntityId<'User'> = EntityId.create();
 * processAgent(userId); // TypeScript error!
 * ```
 */
export type AgentId = EntityId<'AIAgent'>;

/**
 * Helper functions for working with agent IDs
 */
export const AgentId = {
  /**
   * Create a new agent ID with a generated UUID.
   *
   * @returns New AgentId
   */
  create(): AgentId {
    return EntityId.create<'AIAgent'>();
  },

  /**
   * Create an agent ID from an existing string.
   * Useful when loading from database or API.
   *
   * @param value - UUID string
   * @returns AgentId
   * @throws {Error} If value is not a valid UUID
   */
  from(value: string): AgentId {
    return EntityId.from<'AIAgent'>(value);
  },

  /**
   * Check if a value is a valid AgentId.
   *
   * @param value - Value to check
   * @returns true if value is AgentId
   */
  isAgentId(value: unknown): value is AgentId {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const candidate = value as Record<string, unknown>;
    return (
      'value' in candidate &&
      typeof candidate.value === 'string' &&
      'equals' in candidate &&
      typeof candidate.equals === 'function'
    );
  },
};
