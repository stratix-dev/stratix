import { AggregateRoot } from '../../../core/AggregateRoot.js';
import type { AgentId } from './AgentId.js';
import type { AgentMetadata, AgentCapability, AgentVersion } from './AgentMetadata.js';
import type { ModelConfig } from './ModelConfig.js';
import type { ExecutionContext } from '../execution/ExecutionContext.js';
import type { ExecutionResult } from '../execution/ExecutionResult.js';

/**
 * Base class for all AI agents.
 *
 * AIAgent is an aggregate root that encapsulates:
 * - Agent metadata (name, description, version, capabilities)
 * - Model configuration (provider, model, parameters)
 * - Core execution logic (abstract method to be implemented)
 *
 * ⚠️ IMPORTANT - ARCHITECTURAL GUIDELINES:
 *
 * AIAgent should NEVER contain LLMProvider or make I/O calls directly.
 * This violates hexagonal architecture if agents live in domain/ layer.
 *
 * For strict DDD/hexagonal architecture, use AgentSpecification + AgentService instead:
 * - AgentSpecification: Pure domain entity (no I/O)
 * - AgentService: Application service (orchestrates I/O)
 * - LLMPort: Domain-defined interface (implemented in infrastructure)
 *
 * See: packages/core/src/ai-agents/domain/AgentSpecification.ts
 *      packages/core/src/ai-agents/application/AgentService.ts
 *
 * Agents are executed by ExecutionEngine, which handles:
 * - Timeout enforcement
 * - Retry logic
 * - Lifecycle hooks
 * - Telemetry and events
 *
 * @template TInput - The input type for the agent
 * @template TOutput - The output type from the agent
 *
 * @deprecated For new code, prefer AgentSpecification + AgentService pattern
 *             for proper separation of domain and infrastructure.
 *
 * @example CORRECT Usage (No I/O in agent)
 * ```typescript
 * class CustomerSupportAgent extends AIAgent<SupportQuery, SupportResponse> {
 *   async execute(
 *     input: SupportQuery,
 *     context: ExecutionContext
 *   ): Promise<ExecutionResult<SupportResponse>> {
 *     // Pure domain logic only - no LLM calls!
 *     const validationError = this.validateInput(input);
 *     if (validationError) {
 *       return ExecutionResult.failure(validationError);
 *     }
 *
 *     // Business logic - decisions, transformations
 *     const processedData = this.processBusinessRules(input);
 *
 *     return ExecutionResult.success({
 *       data: processedData,
 *       priority: this.calculatePriority(input)
 *     });
 *   }
 *
 *   private validateInput(input: SupportQuery): Error | null {
 *     return input.query.length > 0 ? null : new Error('Empty query');
 *   }
 * }
 * ```
 *
 * @example PREFERRED Pattern (AgentSpecification + AgentService)
 * See: examples/enterprise-support-agent/example-ddd-pattern.ts
 */
export abstract class AIAgent<TInput, TOutput> extends AggregateRoot<'AIAgent'> {
  /**
   * Private constructor - use builder pattern or factory methods.
   *
   * @param id - Unique agent identifier
   * @param metadata - Agent metadata (name, description, version, capabilities)
   * @param modelConfig - Model configuration (provider, model, parameters)
   */
  protected constructor(
    id: AgentId,
    private readonly _metadata: AgentMetadata,
    private readonly _modelConfig: ModelConfig
  ) {
    super(id, new Date(), new Date());
  }

  /**
   * Execute the agent's core logic.
   *
   * ⚠️ IMPORTANT: This method should contain ONLY domain logic.
   *    Do NOT make LLM calls or any I/O operations here.
   *    Use AgentService pattern for orchestrating I/O.
   *
   * This method implements pure domain logic:
   * - Input validation (business rules)
   * - Data transformations
   * - Business decisions
   * - Output formatting
   *
   * This method is called by ExecutionEngine, not directly by users.
   * The engine handles timeout, retry, hooks, and telemetry.
   *
   * @param input - The input data for this execution
   * @param context - The execution context (session, user, costs, messages, etc.)
   * @returns A promise resolving to an ExecutionResult
   *
   * @example Pure domain logic (CORRECT)
   * ```typescript
   * async execute(
   *   input: MyInput,
   *   context: ExecutionContext
   * ): Promise<ExecutionResult<MyOutput>> {
   *   // Validate input (business rule)
   *   if (!this.canProcess(input)) {
   *     return ExecutionResult.failure(new Error('Invalid input'));
   *   }
   *
   *   // Apply business logic
   *   const result = this.applyBusinessRules(input);
   *
   *   return ExecutionResult.success(result);
   * }
   * ```
   */
  abstract execute(
    input: TInput,
    context: ExecutionContext
  ): Promise<ExecutionResult<TOutput>>;

  // === Accessors ===

  /**
   * Agent name.
   */
  get name(): string {
    return this._metadata.name;
  }

  /**
   * Agent description.
   */
  get description(): string {
    return this._metadata.description;
  }

  /**
   * Agent version.
   */
  get version(): AgentVersion {
    return this._metadata.version;
  }

  /**
   * Agent capabilities.
   */
  get capabilities(): readonly AgentCapability[] {
    return this._metadata.capabilities;
  }

  /**
   * Agent tags.
   */
  get tags(): readonly string[] {
    return this._metadata.tags;
  }

  /**
   * Model configuration.
   */
  get model(): ModelConfig {
    return this._modelConfig;
  }

  /**
   * Full agent metadata.
   */
  get metadata(): AgentMetadata {
    return this._metadata;
  }

  // === Capability Checks ===

  /**
   * Check if agent has a specific capability.
   *
   * @param capability - Capability to check
   * @returns true if agent has capability
   */
  hasCapability(capability: AgentCapability): boolean {
    return this._metadata.hasCapability(capability);
  }

  /**
   * Check if agent has all of the specified capabilities.
   *
   * @param capabilities - Capabilities to check
   * @returns true if agent has all capabilities
   */
  hasCapabilities(capabilities: readonly AgentCapability[]): boolean {
    return this._metadata.hasCapabilities(capabilities);
  }

  /**
   * Check if agent has any of the specified capabilities.
   *
   * @param capabilities - Capabilities to check
   * @returns true if agent has at least one capability
   */
  hasAnyCapability(capabilities: readonly AgentCapability[]): boolean {
    return this._metadata.hasAnyCapability(capabilities);
  }

  /**
   * Check if agent has a specific tag.
   *
   * @param tag - Tag to check
   * @returns true if agent has tag
   */
  hasTag(tag: string): boolean {
    return this._metadata.hasTag(tag);
  }

  // === Utility Methods ===

  /**
   * Get a string representation of the agent.
   *
   * @returns String in format "AgentName v1.0.0"
   */
  toString(): string {
    return `${this.name} v${this.version.toString()}`;
  }

  /**
   * Convert to plain object for serialization.
   *
   * @returns Plain object representation
   */
  toJSON(): object {
    return {
      id: this.id.value,
      name: this.name,
      description: this.description,
      version: this.version.toString(),
      capabilities: this.capabilities,
      tags: this.tags,
      model: this.model,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
