import { AggregateRoot } from '../../ddd/AggregateRoot.js';
import { EntityId } from '../../ddd/EntityId.js';
import type { AgentMetadata, AgentCapability } from '../core/agent/AgentMetadata.js';
import type { ModelConfig } from '../core/agent/ModelConfig.js';

/**
 * Type-safe identifier for agent specifications.
 */
export type AgentSpecificationId = EntityId<'AgentSpecification'>;

/**
 * Domain entity representing an AI agent specification.
 *
 * AgentSpecification is a pure domain entity that contains ONLY:
 * - Agent config and metadata
 * - Business rules and validation logic
 * - Prompt building and domain logic
 *
 * It does NOT:
 * - Make external I/O calls (LLM, database, APIs)
 * - Execute itself (delegated to docorators layer)
 * - Know about infrastructure concerns
 *
 * This separation allows agents to live in the domain layer while
 * respecting hexagonal architecture principles.
 *
 * @example
 * ```typescript
 * // domain/CustomerSupportSpec.ts
 * export class CustomerSupportSpec extends AgentSpecification {
 *   constructor(id: AgentId) {
 *     super(
 *       id,
 *       {
 *         name: 'Customer Support',
 *         description: 'Handles customer inquiries',
 *         version: '1.0.0',
 *         capabilities: ['customer-support', 'ticket-management'],
 *         tags: ['support']
 *       },
 *       {
 *         provider: 'openai',
 *         model: 'gpt-4',
 *         temperature: 0.7,
 *         maxTokens: 1000
 *       }
 *     );
 *   }
 *
 *   // Domain logic - no I/O
 *   canHandleQuery(query: string): boolean {
 *     return query.length > 0 && query.length < 1000;
 *   }
 *
 *   buildSystemPrompt(): string {
 *     return `You are a helpful customer support agent for ${this.metadata.name}`;
 *   }
 *
 *   buildUserPrompt(query: string): string {
 *     return `Customer query: ${query}`;
 *   }
 * }
 * ```
 */
export abstract class AgentSpecification extends AggregateRoot<'AgentSpecification'> {
  /**
   * Create an agent specification.
   *
   * @param id - Unique agent specification identifier
   * @param metadata - Agent metadata (name, description, version, capabilities)
   * @param modelConfig - Model config (provider, model, parameters)
   */
  protected constructor(
    id: AgentSpecificationId,
    private readonly _metadata: AgentMetadata,
    private readonly _modelConfig: ModelConfig
  ) {
    super(id, new Date(), new Date());
  }

  /**
   * Get agent metadata.
   */
  get metadata(): AgentMetadata {
    return this._metadata;
  }

  /**
   * Get model config.
   */
  get modelConfig(): ModelConfig {
    return this._modelConfig;
  }

  /**
   * Get agent name.
   */
  get name(): string {
    return this._metadata.name;
  }

  /**
   * Get agent description.
   */
  get description(): string {
    return this._metadata.description;
  }

  /**
   * Get agent version.
   */
  get version(): string {
    return typeof this._metadata.version === 'string'
      ? this._metadata.version
      : this._metadata.version.toString();
  }

  /**
   * Get agent capabilities.
   */
  get capabilities(): readonly AgentCapability[] {
    return this._metadata.capabilities;
  }

  /**
   * Get agent tags.
   */
  get tags(): readonly string[] {
    return this._metadata.tags;
  }

  /**
   * Check if agent has a specific capability.
   *
   * @param capability - Capability to check
   * @returns true if agent has the capability
   */
  hasCapability(capability: AgentCapability): boolean {
    return this.capabilities.includes(capability);
  }

  /**
   * Check if agent has any of the specified capabilities.
   *
   * @param capabilities - Capabilities to check
   * @returns true if agent has at least one capability
   */
  hasAnyCapability(...capabilities: AgentCapability[]): boolean {
    return capabilities.some((cap) => this.hasCapability(cap));
  }

  /**
   * Check if agent has all of the specified capabilities.
   *
   * @param capabilities - Capabilities to check
   * @returns true if agent has all capabilities
   */
  hasAllCapabilities(...capabilities: AgentCapability[]): boolean {
    return capabilities.every((cap) => this.hasCapability(cap));
  }

  /**
   * Update model config.
   * Returns a new instance with updated config (immutability).
   *
   * Note: This method uses type assertions to work around TypeScript's
   * readonly property restrictions. The returned instance is a new object
   * with the updated config.
   *
   * @param updates - Partial model config updates
   * @returns New AgentSpecification instance with updated config
   */
  withModelConfig(updates: Partial<ModelConfig>): this {
    // Create new instance with same prototype
    const proto = Object.getPrototypeOf(this) as object;
    const updated = Object.create(proto) as AgentSpecification;

    // Copy all properties
    Object.assign(updated, this);

    // Update the private field (requires type assertion due to readonly)
    Object.defineProperty(updated, '_modelConfig', {
      value: { ...this._modelConfig, ...updates },
      writable: false,
      enumerable: false,
      configurable: false
    });

    // Update timestamp
    updated.touch();

    return updated as this;
  }

  /**
   * Check if this specification is compatible with another version.
   * Default implementation checks if capabilities are a superset.
   *
   * @param other - Other specification to check compatibility with
   * @returns true if compatible
   */
  isCompatibleWith(other: AgentSpecification): boolean {
    return other.capabilities.every((cap) => this.hasCapability(cap));
  }
}
