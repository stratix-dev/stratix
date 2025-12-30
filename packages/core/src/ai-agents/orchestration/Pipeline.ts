import { AIAgent } from '../core/agent/AIAgent.js';
import { ExecutionContext } from '../core/execution/ExecutionContext.js';
import { ExecutionResult } from '../core/execution/ExecutionResult.js';
import { ExecutionEngine } from '../core/execution/ExecutionEngine.js';
import { ExecutionConfig } from '../core/execution/ExecutionConfig.js';
import { AgentLifecycle, NoOpLifecycle } from '../core/lifecycle/AgentLifecycle.js';

/**
 * Type-safe sequential pipeline for agent execution.
 *
 * Provides compile-time guarantees that agent inputs and outputs are compatible.
 * Each pipeN method enforces that the output type of agent N matches the input type of agent N+1.
 *
 * @example
 * ```typescript
 * const result = await Pipeline.pipe3(
 *   textAgent,    // AIAgent<string, ParsedText>
 *   analyzeAgent, // AIAgent<ParsedText, Analysis>
 *   formatAgent,  // AIAgent<Analysis, string>
 *   'input text',
 *   context
 * );
 * ```
 */
export class Pipeline {
  /**
   * Create a pipeline with a custom execution engine.
   */
  static withEngine(engine: ExecutionEngine): PipelineBuilder {
    return new PipelineBuilder(engine);
  }

  /**
   * Create a pipeline with a custom lifecycle.
   */
  static withLifecycle(lifecycle: AgentLifecycle): PipelineBuilder {
    return new PipelineBuilder(new ExecutionEngine(lifecycle));
  }

  /**
   * Execute two agents in sequence.
   *
   * @param agent1 - First agent
   * @param agent2 - Second agent (input type must match agent1 output type)
   * @param input - Initial input
   * @param context - Execution context
   * @param config - Optional execution configuration
   * @returns Final result from agent2
   */
  static async pipe2<T1, T2, T3>(
    agent1: AIAgent<T1, T2>,
    agent2: AIAgent<T2, T3>,
    input: T1,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<ExecutionResult<T3>> {
    const engine = new ExecutionEngine(NoOpLifecycle);

    const result1 = await engine.execute(agent1, input, context, config);
    if (result1.isFailure()) {
      // Type cast is safe because we're propagating the error
      return ExecutionResult.failure<T3>(result1.error, result1.metadata);
    }

    return engine.execute(agent2, result1.value as T2, context, config);
  }

  /**
   * Execute three agents in sequence.
   */
  static async pipe3<T1, T2, T3, T4>(
    agent1: AIAgent<T1, T2>,
    agent2: AIAgent<T2, T3>,
    agent3: AIAgent<T3, T4>,
    input: T1,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<ExecutionResult<T4>> {
    const result1 = await Pipeline.pipe2(agent1, agent2, input, context, config);
    if (result1.isFailure()) {
      return ExecutionResult.failure<T4>(result1.error, result1.metadata);
    }

    const engine = new ExecutionEngine(NoOpLifecycle);
    return engine.execute(agent3, result1.value as T3, context, config);
  }

  /**
   * Execute four agents in sequence.
   */
  static async pipe4<T1, T2, T3, T4, T5>(
    agent1: AIAgent<T1, T2>,
    agent2: AIAgent<T2, T3>,
    agent3: AIAgent<T3, T4>,
    agent4: AIAgent<T4, T5>,
    input: T1,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<ExecutionResult<T5>> {
    const result1 = await Pipeline.pipe3(agent1, agent2, agent3, input, context, config);
    if (result1.isFailure()) {
      return ExecutionResult.failure<T5>(result1.error, result1.metadata);
    }

    const engine = new ExecutionEngine(NoOpLifecycle);
    return engine.execute(agent4, result1.value as T4, context, config);
  }

  /**
   * Execute five agents in sequence.
   */
  static async pipe5<T1, T2, T3, T4, T5, T6>(
    agent1: AIAgent<T1, T2>,
    agent2: AIAgent<T2, T3>,
    agent3: AIAgent<T3, T4>,
    agent4: AIAgent<T4, T5>,
    agent5: AIAgent<T5, T6>,
    input: T1,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<ExecutionResult<T6>> {
    const result1 = await Pipeline.pipe4(agent1, agent2, agent3, agent4, input, context, config);
    if (result1.isFailure()) {
      return ExecutionResult.failure<T6>(result1.error, result1.metadata);
    }

    const engine = new ExecutionEngine(NoOpLifecycle);
    return engine.execute(agent5, result1.value as T5, context, config);
  }

  /**
   * Execute six agents in sequence.
   */
  static async pipe6<T1, T2, T3, T4, T5, T6, T7>(
    agent1: AIAgent<T1, T2>,
    agent2: AIAgent<T2, T3>,
    agent3: AIAgent<T3, T4>,
    agent4: AIAgent<T4, T5>,
    agent5: AIAgent<T5, T6>,
    agent6: AIAgent<T6, T7>,
    input: T1,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<ExecutionResult<T7>> {
    const result1 = await Pipeline.pipe5(agent1, agent2, agent3, agent4, agent5, input, context, config);
    if (result1.isFailure()) {
      return ExecutionResult.failure<T7>(result1.error, result1.metadata);
    }

    const engine = new ExecutionEngine(NoOpLifecycle);
    return engine.execute(agent6, result1.value as T6, context, config);
  }

  /**
   * Execute seven agents in sequence.
   */
  static async pipe7<T1, T2, T3, T4, T5, T6, T7, T8>(
    agent1: AIAgent<T1, T2>,
    agent2: AIAgent<T2, T3>,
    agent3: AIAgent<T3, T4>,
    agent4: AIAgent<T4, T5>,
    agent5: AIAgent<T5, T6>,
    agent6: AIAgent<T6, T7>,
    agent7: AIAgent<T7, T8>,
    input: T1,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<ExecutionResult<T8>> {
    const result1 = await Pipeline.pipe6(agent1, agent2, agent3, agent4, agent5, agent6, input, context, config);
    if (result1.isFailure()) {
      return ExecutionResult.failure<T8>(result1.error, result1.metadata);
    }

    const engine = new ExecutionEngine(NoOpLifecycle);
    return engine.execute(agent7, result1.value as T7, context, config);
  }

  /**
   * Execute eight agents in sequence.
   */
  static async pipe8<T1, T2, T3, T4, T5, T6, T7, T8, T9>(
    agent1: AIAgent<T1, T2>,
    agent2: AIAgent<T2, T3>,
    agent3: AIAgent<T3, T4>,
    agent4: AIAgent<T4, T5>,
    agent5: AIAgent<T5, T6>,
    agent6: AIAgent<T6, T7>,
    agent7: AIAgent<T7, T8>,
    agent8: AIAgent<T8, T9>,
    input: T1,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<ExecutionResult<T9>> {
    const result1 = await Pipeline.pipe7(agent1, agent2, agent3, agent4, agent5, agent6, agent7, input, context, config);
    if (result1.isFailure()) {
      return ExecutionResult.failure<T9>(result1.error, result1.metadata);
    }

    const engine = new ExecutionEngine(NoOpLifecycle);
    return engine.execute(agent8, result1.value as T8, context, config);
  }

  /**
   * Execute nine agents in sequence.
   */
  static async pipe9<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10>(
    agent1: AIAgent<T1, T2>,
    agent2: AIAgent<T2, T3>,
    agent3: AIAgent<T3, T4>,
    agent4: AIAgent<T4, T5>,
    agent5: AIAgent<T5, T6>,
    agent6: AIAgent<T6, T7>,
    agent7: AIAgent<T7, T8>,
    agent8: AIAgent<T8, T9>,
    agent9: AIAgent<T9, T10>,
    input: T1,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<ExecutionResult<T10>> {
    const result1 = await Pipeline.pipe8(agent1, agent2, agent3, agent4, agent5, agent6, agent7, agent8, input, context, config);
    if (result1.isFailure()) {
      return ExecutionResult.failure<T10>(result1.error, result1.metadata);
    }

    const engine = new ExecutionEngine(NoOpLifecycle);
    return engine.execute(agent9, result1.value as T9, context, config);
  }

  /**
   * Execute ten agents in sequence.
   */
  static async pipe10<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11>(
    agent1: AIAgent<T1, T2>,
    agent2: AIAgent<T2, T3>,
    agent3: AIAgent<T3, T4>,
    agent4: AIAgent<T4, T5>,
    agent5: AIAgent<T5, T6>,
    agent6: AIAgent<T6, T7>,
    agent7: AIAgent<T7, T8>,
    agent8: AIAgent<T8, T9>,
    agent9: AIAgent<T9, T10>,
    agent10: AIAgent<T10, T11>,
    input: T1,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<ExecutionResult<T11>> {
    const result1 = await Pipeline.pipe9(agent1, agent2, agent3, agent4, agent5, agent6, agent7, agent8, agent9, input, context, config);
    if (result1.isFailure()) {
      return ExecutionResult.failure<T11>(result1.error, result1.metadata);
    }

    const engine = new ExecutionEngine(NoOpLifecycle);
    return engine.execute(agent10, result1.value as T10, context, config);
  }
}

/**
 * Builder for creating pipelines with custom configuration.
 */
export class PipelineBuilder {
  constructor(private readonly engine: ExecutionEngine) {}

  /**
   * Execute two agents in sequence.
   */
  async pipe2<T1, T2, T3>(
    agent1: AIAgent<T1, T2>,
    agent2: AIAgent<T2, T3>,
    input: T1,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<ExecutionResult<T3>> {
    const result1 = await this.engine.execute(agent1, input, context, config);
    if (result1.isFailure()) {
      return ExecutionResult.failure<T3>(result1.error, result1.metadata);
    }

    return this.engine.execute(agent2, result1.value as T2, context, config);
  }

  /**
   * Execute three agents in sequence.
   */
  async pipe3<T1, T2, T3, T4>(
    agent1: AIAgent<T1, T2>,
    agent2: AIAgent<T2, T3>,
    agent3: AIAgent<T3, T4>,
    input: T1,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<ExecutionResult<T4>> {
    const result1 = await this.pipe2(agent1, agent2, input, context, config);
    if (result1.isFailure()) {
      return ExecutionResult.failure<T4>(result1.error, result1.metadata);
    }

    return this.engine.execute(agent3, result1.value as T3, context, config);
  }

  // Additional pipe methods would follow the same pattern...
}
