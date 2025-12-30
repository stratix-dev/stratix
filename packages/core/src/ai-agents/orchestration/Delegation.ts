import { AIAgent } from '../core/agent/AIAgent.js';
import { ExecutionContext } from '../core/execution/ExecutionContext.js';
import { ExecutionResult } from '../core/execution/ExecutionResult.js';
import { ExecutionEngine } from '../core/execution/ExecutionEngine.js';
import { ExecutionConfig } from '../core/execution/ExecutionConfig.js';
import { NoOpLifecycle } from '../core/lifecycle/AgentLifecycle.js';
import { AgentCapability } from '../core/agent/AgentMetadata.js';

/**
 * Agent selection strategy.
 */
export interface AgentSelector<TInput, TOutput> {
  /**
   * Select an agent from a pool of candidates.
   *
   * @param agents - Available agents
   * @param input - Input data (can inform selection)
   * @param context - Execution context
   * @returns Selected agent, or undefined if no suitable agent found
   */
  select(
    agents: readonly AIAgent<TInput, TOutput>[],
    input: TInput,
    context: ExecutionContext
  ): AIAgent<TInput, TOutput> | undefined;
}

/**
 * Select the first agent with a specific capability.
 */
export class CapabilitySelector<TInput, TOutput> implements AgentSelector<TInput, TOutput> {
  constructor(private readonly capability: AgentCapability) {}

  select(
    agents: readonly AIAgent<TInput, TOutput>[]
  ): AIAgent<TInput, TOutput> | undefined {
    return agents.find(agent => agent.hasCapability(this.capability));
  }
}

/**
 * Select the first agent with all specified capabilities.
 */
export class MultiCapabilitySelector<TInput, TOutput> implements AgentSelector<TInput, TOutput> {
  constructor(private readonly capabilities: readonly AgentCapability[]) {}

  select(
    agents: readonly AIAgent<TInput, TOutput>[]
  ): AIAgent<TInput, TOutput> | undefined {
    return agents.find(agent => agent.hasCapabilities(this.capabilities));
  }
}

/**
 * Select the first agent with any of the specified capabilities.
 */
export class AnyCapabilitySelector<TInput, TOutput> implements AgentSelector<TInput, TOutput> {
  constructor(private readonly capabilities: readonly AgentCapability[]) {}

  select(
    agents: readonly AIAgent<TInput, TOutput>[]
  ): AIAgent<TInput, TOutput> | undefined {
    return agents.find(agent => agent.hasAnyCapability(this.capabilities));
  }
}

/**
 * Select the first agent.
 */
export class FirstAgentSelector<TInput, TOutput> implements AgentSelector<TInput, TOutput> {
  select(
    agents: readonly AIAgent<TInput, TOutput>[]
  ): AIAgent<TInput, TOutput> | undefined {
    return agents[0];
  }
}

/**
 * Select a random agent.
 */
export class RandomAgentSelector<TInput, TOutput> implements AgentSelector<TInput, TOutput> {
  select(
    agents: readonly AIAgent<TInput, TOutput>[]
  ): AIAgent<TInput, TOutput> | undefined {
    if (agents.length === 0) {
      return undefined;
    }
    const index = Math.floor(Math.random() * agents.length);
    return agents[index];
  }
}

/**
 * Round-robin agent selection.
 */
export class RoundRobinSelector<TInput, TOutput> implements AgentSelector<TInput, TOutput> {
  private currentIndex = 0;

  select(
    agents: readonly AIAgent<TInput, TOutput>[]
  ): AIAgent<TInput, TOutput> | undefined {
    if (agents.length === 0) {
      return undefined;
    }
    const agent = agents[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % agents.length;
    return agent;
  }

  /**
   * Reset the selector to start from the beginning.
   */
  reset(): void {
    this.currentIndex = 0;
  }
}

/**
 * Custom agent selector using a predicate function.
 */
export class PredicateSelector<TInput, TOutput> implements AgentSelector<TInput, TOutput> {
  constructor(
    private readonly predicate: (
      agent: AIAgent<TInput, TOutput>,
      input: TInput,
      context: ExecutionContext
    ) => boolean
  ) {}

  select(
    agents: readonly AIAgent<TInput, TOutput>[],
    input: TInput,
    context: ExecutionContext
  ): AIAgent<TInput, TOutput> | undefined {
    return agents.find(agent => this.predicate(agent, input, context));
  }
}

/**
 * Delegation error when no suitable agent is found.
 */
export class NoDelegateFoundError extends Error {
  constructor(message = 'No suitable agent found for delegation') {
    super(message);
    this.name = 'NoDelegateFoundError';
  }
}

/**
 * Agent delegation utilities.
 *
 * Allows one agent to delegate work to another agent based on selection criteria.
 *
 * @example
 * ```typescript
 * // Delegate to an agent with a specific capability
 * const result = await Delegation.delegateByCapability(
 *   agents,
 *   'sentiment_analysis',
 *   input,
 *   context
 * );
 *
 * // Delegate using a custom selector
 * const result = await Delegation.delegate(
 *   agents,
 *   new CapabilitySelector('translation'),
 *   input,
 *   context
 * );
 * ```
 */
export class Delegation {
  /**
   * Delegate to an agent selected by a custom selector.
   *
   * @param agents - Available agents
   * @param selector - Agent selection strategy
   * @param input - Input to delegate
   * @param context - Execution context
   * @param config - Optional execution configuration
   * @returns Result from the selected agent
   * @throws NoDelegateFoundError if no suitable agent is found
   */
  static async delegate<TInput, TOutput>(
    agents: readonly AIAgent<TInput, TOutput>[],
    selector: AgentSelector<TInput, TOutput>,
    input: TInput,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<ExecutionResult<TOutput>> {
    const selectedAgent = selector.select(agents, input, context);

    if (!selectedAgent) {
      throw new NoDelegateFoundError();
    }

    const engine = new ExecutionEngine(NoOpLifecycle);
    return engine.execute(selectedAgent, input, context, config);
  }

  /**
   * Delegate to an agent with a specific capability.
   *
   * @param agents - Available agents
   * @param capability - Required capability
   * @param input - Input to delegate
   * @param context - Execution context
   * @param config - Optional execution configuration
   * @returns Result from the selected agent
   * @throws NoDelegateFoundError if no suitable agent is found
   */
  static async delegateByCapability<TInput, TOutput>(
    agents: readonly AIAgent<TInput, TOutput>[],
    capability: AgentCapability,
    input: TInput,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<ExecutionResult<TOutput>> {
    return Delegation.delegate(
      agents,
      new CapabilitySelector<TInput, TOutput>(capability),
      input,
      context,
      config
    );
  }

  /**
   * Delegate to an agent with all specified capabilities.
   *
   * @param agents - Available agents
   * @param capabilities - Required capabilities
   * @param input - Input to delegate
   * @param context - Execution context
   * @param config - Optional execution configuration
   * @returns Result from the selected agent
   * @throws NoDelegateFoundError if no suitable agent is found
   */
  static async delegateByCapabilities<TInput, TOutput>(
    agents: readonly AIAgent<TInput, TOutput>[],
    capabilities: readonly AgentCapability[],
    input: TInput,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<ExecutionResult<TOutput>> {
    return Delegation.delegate(
      agents,
      new MultiCapabilitySelector<TInput, TOutput>(capabilities),
      input,
      context,
      config
    );
  }

  /**
   * Delegate to an agent with any of the specified capabilities.
   *
   * @param agents - Available agents
   * @param capabilities - Capabilities to match (any)
   * @param input - Input to delegate
   * @param context - Execution context
   * @param config - Optional execution configuration
   * @returns Result from the selected agent
   * @throws NoDelegateFoundError if no suitable agent is found
   */
  static async delegateByAnyCapability<TInput, TOutput>(
    agents: readonly AIAgent<TInput, TOutput>[],
    capabilities: readonly AgentCapability[],
    input: TInput,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<ExecutionResult<TOutput>> {
    return Delegation.delegate(
      agents,
      new AnyCapabilitySelector<TInput, TOutput>(capabilities),
      input,
      context,
      config
    );
  }

  /**
   * Delegate to an agent selected by a predicate function.
   *
   * @param agents - Available agents
   * @param predicate - Selection predicate
   * @param input - Input to delegate
   * @param context - Execution context
   * @param config - Optional execution configuration
   * @returns Result from the selected agent
   * @throws NoDelegateFoundError if no suitable agent is found
   */
  static async delegateByPredicate<TInput, TOutput>(
    agents: readonly AIAgent<TInput, TOutput>[],
    predicate: (agent: AIAgent<TInput, TOutput>, input: TInput, context: ExecutionContext) => boolean,
    input: TInput,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<ExecutionResult<TOutput>> {
    return Delegation.delegate(
      agents,
      new PredicateSelector<TInput, TOutput>(predicate),
      input,
      context,
      config
    );
  }

  /**
   * Try to delegate, returning undefined if no suitable agent is found.
   *
   * Unlike delegate(), this method does not throw if no agent is found.
   *
   * @param agents - Available agents
   * @param selector - Agent selection strategy
   * @param input - Input to delegate
   * @param context - Execution context
   * @param config - Optional execution configuration
   * @returns Result from the selected agent, or undefined if no agent found
   */
  static async tryDelegate<TInput, TOutput>(
    agents: readonly AIAgent<TInput, TOutput>[],
    selector: AgentSelector<TInput, TOutput>,
    input: TInput,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<ExecutionResult<TOutput> | undefined> {
    const selectedAgent = selector.select(agents, input, context);

    if (!selectedAgent) {
      return undefined;
    }

    const engine = new ExecutionEngine(NoOpLifecycle);
    return engine.execute(selectedAgent, input, context, config);
  }
}

/**
 * Agent pool for delegation with common selection strategies.
 *
 * @example
 * ```typescript
 * const pool = new AgentPool<string, string>()
 *   .add(agent1)
 *   .add(agent2)
 *   .add(agent3);
 *
 * // Delegate by capability
 * const result = await pool.delegateByCapability('translation', input, context);
 *
 * // Delegate using round-robin
 * const result = await pool.delegateRoundRobin(input, context);
 * ```
 */
export class AgentPool<TInput, TOutput> {
  private readonly agents: AIAgent<TInput, TOutput>[] = [];
  private readonly roundRobinSelector = new RoundRobinSelector<TInput, TOutput>();
  private readonly engine: ExecutionEngine;

  constructor(engine?: ExecutionEngine) {
    this.engine = engine ?? new ExecutionEngine(NoOpLifecycle);
  }

  /**
   * Add an agent to the pool.
   */
  add(agent: AIAgent<TInput, TOutput>): this {
    this.agents.push(agent);
    return this;
  }

  /**
   * Add multiple agents to the pool.
   */
  addAll(agents: readonly AIAgent<TInput, TOutput>[]): this {
    this.agents.push(...agents);
    return this;
  }

  /**
   * Get all agents in the pool.
   */
  getAgents(): readonly AIAgent<TInput, TOutput>[] {
    return Object.freeze([...this.agents]);
  }

  /**
   * Get the number of agents in the pool.
   */
  get size(): number {
    return this.agents.length;
  }

  /**
   * Clear all agents from the pool.
   */
  clear(): this {
    this.agents.length = 0;
    this.roundRobinSelector.reset();
    return this;
  }

  /**
   * Delegate to an agent with a specific capability.
   */
  async delegateByCapability(
    capability: AgentCapability,
    input: TInput,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<ExecutionResult<TOutput>> {
    const selector = new CapabilitySelector<TInput, TOutput>(capability);
    const agent = selector.select(this.agents);

    if (!agent) {
      throw new NoDelegateFoundError(`No agent with capability: ${capability}`);
    }

    return this.engine.execute(agent, input, context, config);
  }

  /**
   * Delegate using round-robin selection.
   */
  async delegateRoundRobin(
    input: TInput,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<ExecutionResult<TOutput>> {
    const agent = this.roundRobinSelector.select(this.agents);

    if (!agent) {
      throw new NoDelegateFoundError('Agent pool is empty');
    }

    return this.engine.execute(agent, input, context, config);
  }

  /**
   * Delegate using random selection.
   */
  async delegateRandom(
    input: TInput,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<ExecutionResult<TOutput>> {
    const selector = new RandomAgentSelector<TInput, TOutput>();
    const agent = selector.select(this.agents);

    if (!agent) {
      throw new NoDelegateFoundError('Agent pool is empty');
    }

    return this.engine.execute(agent, input, context, config);
  }

  /**
   * Delegate using a custom selector.
   */
  async delegate(
    selector: AgentSelector<TInput, TOutput>,
    input: TInput,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<ExecutionResult<TOutput>> {
    const agent = selector.select(this.agents, input, context);

    if (!agent) {
      throw new NoDelegateFoundError();
    }

    return this.engine.execute(agent, input, context, config);
  }
}
