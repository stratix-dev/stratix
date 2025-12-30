import { AIAgent } from '../core/agent/AIAgent.js';
import { ExecutionContext } from '../core/execution/ExecutionContext.js';
import { ExecutionResult } from '../core/execution/ExecutionResult.js';
import { ExecutionEngine } from '../core/execution/ExecutionEngine.js';
import { ExecutionConfig } from '../core/execution/ExecutionConfig.js';
import { NoOpLifecycle } from '../core/lifecycle/AgentLifecycle.js';
import { ExecutionMetadataHelpers } from '../shared/ExecutionMetadata.js';

/**
 * Dynamic pipeline for runtime agent composition.
 *
 * Unlike the type-safe Pipeline class, DynamicPipeline allows agents to be added at runtime.
 * All agents in the pipeline must have the same input and output types (AIAgent<T, T>).
 *
 * Use this when:
 * - Agent sequence is determined at runtime
 * - Building plugin systems or extensible pipelines
 * - Testing or prototyping
 *
 * For compile-time type safety, use Pipeline.pipe2-10 instead.
 *
 * @example
 * ```typescript
 * const pipeline = new DynamicPipeline<string>()
 *   .add(normalizeAgent)
 *   .add(validateAgent)
 *   .add(enrichAgent);
 *
 * const result = await pipeline.execute('input', context);
 * ```
 */
export class DynamicPipeline<T> {
  private readonly agents: AIAgent<T, T>[] = [];
  private readonly engine: ExecutionEngine;

  constructor(engine?: ExecutionEngine) {
    this.engine = engine ?? new ExecutionEngine(NoOpLifecycle);
  }

  /**
   * Add an agent to the end of the pipeline.
   *
   * @param agent - Agent to add (must have matching input/output types)
   * @returns This pipeline for method chaining
   */
  add(agent: AIAgent<T, T>): this {
    this.agents.push(agent);
    return this;
  }

  /**
   * Add multiple agents to the pipeline.
   *
   * @param agents - Agents to add
   * @returns This pipeline for method chaining
   */
  addAll(agents: AIAgent<T, T>[]): this {
    this.agents.push(...agents);
    return this;
  }

  /**
   * Insert an agent at a specific position.
   *
   * @param index - Position to insert at (0-based)
   * @param agent - Agent to insert
   * @returns This pipeline for method chaining
   */
  insertAt(index: number, agent: AIAgent<T, T>): this {
    if (index < 0 || index > this.agents.length) {
      throw new Error(`Invalid index ${index}, must be between 0 and ${this.agents.length}`);
    }
    this.agents.splice(index, 0, agent);
    return this;
  }

  /**
   * Remove an agent at a specific position.
   *
   * @param index - Position to remove (0-based)
   * @returns This pipeline for method chaining
   */
  removeAt(index: number): this {
    if (index < 0 || index >= this.agents.length) {
      throw new Error(`Invalid index ${index}, must be between 0 and ${this.agents.length - 1}`);
    }
    this.agents.splice(index, 1);
    return this;
  }

  /**
   * Clear all agents from the pipeline.
   *
   * @returns This pipeline for method chaining
   */
  clear(): this {
    this.agents.length = 0;
    return this;
  }

  /**
   * Get the number of agents in the pipeline.
   */
  get length(): number {
    return this.agents.length;
  }

  /**
   * Check if the pipeline is empty.
   */
  get isEmpty(): boolean {
    return this.agents.length === 0;
  }

  /**
   * Get all agents in the pipeline.
   *
   * @returns Readonly array of agents
   */
  getAgents(): readonly AIAgent<T, T>[] {
    return Object.freeze([...this.agents]);
  }

  /**
   * Execute the pipeline with the given input.
   *
   * Agents are executed sequentially. If any agent fails, the pipeline stops
   * and returns the failure result immediately.
   *
   * @param input - Initial input
   * @param context - Execution context
   * @param config - Optional execution configuration
   * @returns Final result after all agents have executed
   */
  async execute(
    input: T,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<ExecutionResult<T>> {
    if (this.agents.length === 0) {
      // Empty pipeline returns input unchanged
      return ExecutionResult.success(
        input,
        ExecutionMetadataHelpers.create('none'),
        ['Pipeline is empty, returning input unchanged']
      );
    }

    let current: T = input;
    const warnings: string[] = [];

    for (let i = 0; i < this.agents.length; i++) {
      const agent = this.agents[i];
      const result = await this.engine.execute(agent, current, context, config);

      if (result.isFailure()) {
        // Propagate failure with context about which agent failed
        const error = result.error;
        error.message = `Pipeline failed at agent ${i + 1}/${this.agents.length} (${agent.name}): ${error.message}`;
        return ExecutionResult.failure<T>(error, result.metadata);
      }

      current = result.value as T;
      warnings.push(...result.warnings);
    }

    // Return success with accumulated warnings
    return ExecutionResult.success(
      current,
      ExecutionMetadataHelpers.create('pipeline'),
      warnings
    );
  }

  /**
   * Execute the pipeline with transformation of the final result.
   *
   * @param input - Initial input
   * @param context - Execution context
   * @param transform - Function to transform the final output
   * @param config - Optional execution configuration
   * @returns Transformed result
   */
  async executeAndTransform<R>(
    input: T,
    context: ExecutionContext,
    transform: (output: T) => R | Promise<R>,
    config?: ExecutionConfig
  ): Promise<ExecutionResult<R>> {
    const result = await this.execute(input, context, config);

    if (result.isFailure()) {
      return ExecutionResult.failure<R>(result.error, result.metadata);
    }

    try {
      const transformed = await transform(result.value as T);
      return ExecutionResult.success(transformed, result.metadata, result.warnings);
    } catch (error) {
      return ExecutionResult.failure<R>(
        error as Error,
        result.metadata
      );
    }
  }

  /**
   * Clone this pipeline with all its agents.
   *
   * @returns New pipeline with the same agents
   */
  clone(): DynamicPipeline<T> {
    const cloned = new DynamicPipeline<T>(this.engine);
    cloned.addAll(this.agents);
    return cloned;
  }

  /**
   * Create a new pipeline by concatenating this pipeline with another.
   *
   * @param other - Pipeline to append
   * @returns New pipeline with combined agents
   */
  concat(other: DynamicPipeline<T>): DynamicPipeline<T> {
    const combined = this.clone();
    combined.addAll(other.getAgents() as AIAgent<T, T>[]);
    return combined;
  }
}
