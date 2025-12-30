import { AIAgent } from '../core/agent/AIAgent.js';
import { ExecutionContext } from '../core/execution/ExecutionContext.js';
import { ExecutionResult } from '../core/execution/ExecutionResult.js';
import { ExecutionEngine } from '../core/execution/ExecutionEngine.js';
import { ExecutionConfig } from '../core/execution/ExecutionConfig.js';
import { NoOpLifecycle } from '../core/lifecycle/AgentLifecycle.js';

/**
 * Type-safe parallel execution of multiple agents.
 *
 * Provides compile-time type safety for executing 2-10 agents in parallel.
 * Each agent can have different input/output types.
 *
 * @example
 * ```typescript
 * const [result1, result2, result3] = await ParallelExecutor.parallel3(
 *   { agent: agent1, input: 'input1' },
 *   { agent: agent2, input: 42 },
 *   { agent: agent3, input: { data: 'value' } },
 *   context
 * );
 * ```
 */
export class ParallelExecutor {
  /**
   * Execute two agents in parallel.
   *
   * @param task1 - First agent and input
   * @param task2 - Second agent and input
   * @param context - Execution context
   * @param config - Optional execution configuration
   * @returns Tuple of results in the same order as inputs
   */
  static async parallel2<T1, R1, T2, R2>(
    task1: ParallelTask<T1, R1>,
    task2: ParallelTask<T2, R2>,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<[ExecutionResult<R1>, ExecutionResult<R2>]> {
    const engine = new ExecutionEngine(NoOpLifecycle);

    const [result1, result2] = await Promise.all([
      engine.execute(task1.agent, task1.input, context, config),
      engine.execute(task2.agent, task2.input, context, config),
    ]);

    return [result1, result2];
  }

  /**
   * Execute three agents in parallel.
   */
  static async parallel3<T1, R1, T2, R2, T3, R3>(
    task1: ParallelTask<T1, R1>,
    task2: ParallelTask<T2, R2>,
    task3: ParallelTask<T3, R3>,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<[ExecutionResult<R1>, ExecutionResult<R2>, ExecutionResult<R3>]> {
    const engine = new ExecutionEngine(NoOpLifecycle);

    const [result1, result2, result3] = await Promise.all([
      engine.execute(task1.agent, task1.input, context, config),
      engine.execute(task2.agent, task2.input, context, config),
      engine.execute(task3.agent, task3.input, context, config),
    ]);

    return [result1, result2, result3];
  }

  /**
   * Execute four agents in parallel.
   */
  static async parallel4<T1, R1, T2, R2, T3, R3, T4, R4>(
    task1: ParallelTask<T1, R1>,
    task2: ParallelTask<T2, R2>,
    task3: ParallelTask<T3, R3>,
    task4: ParallelTask<T4, R4>,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<[ExecutionResult<R1>, ExecutionResult<R2>, ExecutionResult<R3>, ExecutionResult<R4>]> {
    const engine = new ExecutionEngine(NoOpLifecycle);

    const [result1, result2, result3, result4] = await Promise.all([
      engine.execute(task1.agent, task1.input, context, config),
      engine.execute(task2.agent, task2.input, context, config),
      engine.execute(task3.agent, task3.input, context, config),
      engine.execute(task4.agent, task4.input, context, config),
    ]);

    return [result1, result2, result3, result4];
  }

  /**
   * Execute five agents in parallel.
   */
  static async parallel5<T1, R1, T2, R2, T3, R3, T4, R4, T5, R5>(
    task1: ParallelTask<T1, R1>,
    task2: ParallelTask<T2, R2>,
    task3: ParallelTask<T3, R3>,
    task4: ParallelTask<T4, R4>,
    task5: ParallelTask<T5, R5>,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<[ExecutionResult<R1>, ExecutionResult<R2>, ExecutionResult<R3>, ExecutionResult<R4>, ExecutionResult<R5>]> {
    const engine = new ExecutionEngine(NoOpLifecycle);

    const [result1, result2, result3, result4, result5] = await Promise.all([
      engine.execute(task1.agent, task1.input, context, config),
      engine.execute(task2.agent, task2.input, context, config),
      engine.execute(task3.agent, task3.input, context, config),
      engine.execute(task4.agent, task4.input, context, config),
      engine.execute(task5.agent, task5.input, context, config),
    ]);

    return [result1, result2, result3, result4, result5];
  }

  /**
   * Execute six agents in parallel.
   */
  static async parallel6<T1, R1, T2, R2, T3, R3, T4, R4, T5, R5, T6, R6>(
    task1: ParallelTask<T1, R1>,
    task2: ParallelTask<T2, R2>,
    task3: ParallelTask<T3, R3>,
    task4: ParallelTask<T4, R4>,
    task5: ParallelTask<T5, R5>,
    task6: ParallelTask<T6, R6>,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<[ExecutionResult<R1>, ExecutionResult<R2>, ExecutionResult<R3>, ExecutionResult<R4>, ExecutionResult<R5>, ExecutionResult<R6>]> {
    const engine = new ExecutionEngine(NoOpLifecycle);

    const [result1, result2, result3, result4, result5, result6] = await Promise.all([
      engine.execute(task1.agent, task1.input, context, config),
      engine.execute(task2.agent, task2.input, context, config),
      engine.execute(task3.agent, task3.input, context, config),
      engine.execute(task4.agent, task4.input, context, config),
      engine.execute(task5.agent, task5.input, context, config),
      engine.execute(task6.agent, task6.input, context, config),
    ]);

    return [result1, result2, result3, result4, result5, result6];
  }

  /**
   * Execute seven agents in parallel.
   */
  static async parallel7<T1, R1, T2, R2, T3, R3, T4, R4, T5, R5, T6, R6, T7, R7>(
    task1: ParallelTask<T1, R1>,
    task2: ParallelTask<T2, R2>,
    task3: ParallelTask<T3, R3>,
    task4: ParallelTask<T4, R4>,
    task5: ParallelTask<T5, R5>,
    task6: ParallelTask<T6, R6>,
    task7: ParallelTask<T7, R7>,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<[ExecutionResult<R1>, ExecutionResult<R2>, ExecutionResult<R3>, ExecutionResult<R4>, ExecutionResult<R5>, ExecutionResult<R6>, ExecutionResult<R7>]> {
    const engine = new ExecutionEngine(NoOpLifecycle);

    const [result1, result2, result3, result4, result5, result6, result7] = await Promise.all([
      engine.execute(task1.agent, task1.input, context, config),
      engine.execute(task2.agent, task2.input, context, config),
      engine.execute(task3.agent, task3.input, context, config),
      engine.execute(task4.agent, task4.input, context, config),
      engine.execute(task5.agent, task5.input, context, config),
      engine.execute(task6.agent, task6.input, context, config),
      engine.execute(task7.agent, task7.input, context, config),
    ]);

    return [result1, result2, result3, result4, result5, result6, result7];
  }

  /**
   * Execute eight agents in parallel.
   */
  static async parallel8<T1, R1, T2, R2, T3, R3, T4, R4, T5, R5, T6, R6, T7, R7, T8, R8>(
    task1: ParallelTask<T1, R1>,
    task2: ParallelTask<T2, R2>,
    task3: ParallelTask<T3, R3>,
    task4: ParallelTask<T4, R4>,
    task5: ParallelTask<T5, R5>,
    task6: ParallelTask<T6, R6>,
    task7: ParallelTask<T7, R7>,
    task8: ParallelTask<T8, R8>,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<[ExecutionResult<R1>, ExecutionResult<R2>, ExecutionResult<R3>, ExecutionResult<R4>, ExecutionResult<R5>, ExecutionResult<R6>, ExecutionResult<R7>, ExecutionResult<R8>]> {
    const engine = new ExecutionEngine(NoOpLifecycle);

    const [result1, result2, result3, result4, result5, result6, result7, result8] = await Promise.all([
      engine.execute(task1.agent, task1.input, context, config),
      engine.execute(task2.agent, task2.input, context, config),
      engine.execute(task3.agent, task3.input, context, config),
      engine.execute(task4.agent, task4.input, context, config),
      engine.execute(task5.agent, task5.input, context, config),
      engine.execute(task6.agent, task6.input, context, config),
      engine.execute(task7.agent, task7.input, context, config),
      engine.execute(task8.agent, task8.input, context, config),
    ]);

    return [result1, result2, result3, result4, result5, result6, result7, result8];
  }

  /**
   * Execute nine agents in parallel.
   */
  static async parallel9<T1, R1, T2, R2, T3, R3, T4, R4, T5, R5, T6, R6, T7, R7, T8, R8, T9, R9>(
    task1: ParallelTask<T1, R1>,
    task2: ParallelTask<T2, R2>,
    task3: ParallelTask<T3, R3>,
    task4: ParallelTask<T4, R4>,
    task5: ParallelTask<T5, R5>,
    task6: ParallelTask<T6, R6>,
    task7: ParallelTask<T7, R7>,
    task8: ParallelTask<T8, R8>,
    task9: ParallelTask<T9, R9>,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<[ExecutionResult<R1>, ExecutionResult<R2>, ExecutionResult<R3>, ExecutionResult<R4>, ExecutionResult<R5>, ExecutionResult<R6>, ExecutionResult<R7>, ExecutionResult<R8>, ExecutionResult<R9>]> {
    const engine = new ExecutionEngine(NoOpLifecycle);

    const [result1, result2, result3, result4, result5, result6, result7, result8, result9] = await Promise.all([
      engine.execute(task1.agent, task1.input, context, config),
      engine.execute(task2.agent, task2.input, context, config),
      engine.execute(task3.agent, task3.input, context, config),
      engine.execute(task4.agent, task4.input, context, config),
      engine.execute(task5.agent, task5.input, context, config),
      engine.execute(task6.agent, task6.input, context, config),
      engine.execute(task7.agent, task7.input, context, config),
      engine.execute(task8.agent, task8.input, context, config),
      engine.execute(task9.agent, task9.input, context, config),
    ]);

    return [result1, result2, result3, result4, result5, result6, result7, result8, result9];
  }

  /**
   * Execute ten agents in parallel.
   */
  static async parallel10<T1, R1, T2, R2, T3, R3, T4, R4, T5, R5, T6, R6, T7, R7, T8, R8, T9, R9, T10, R10>(
    task1: ParallelTask<T1, R1>,
    task2: ParallelTask<T2, R2>,
    task3: ParallelTask<T3, R3>,
    task4: ParallelTask<T4, R4>,
    task5: ParallelTask<T5, R5>,
    task6: ParallelTask<T6, R6>,
    task7: ParallelTask<T7, R7>,
    task8: ParallelTask<T8, R8>,
    task9: ParallelTask<T9, R9>,
    task10: ParallelTask<T10, R10>,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<[ExecutionResult<R1>, ExecutionResult<R2>, ExecutionResult<R3>, ExecutionResult<R4>, ExecutionResult<R5>, ExecutionResult<R6>, ExecutionResult<R7>, ExecutionResult<R8>, ExecutionResult<R9>, ExecutionResult<R10>]> {
    const engine = new ExecutionEngine(NoOpLifecycle);

    const [result1, result2, result3, result4, result5, result6, result7, result8, result9, result10] = await Promise.all([
      engine.execute(task1.agent, task1.input, context, config),
      engine.execute(task2.agent, task2.input, context, config),
      engine.execute(task3.agent, task3.input, context, config),
      engine.execute(task4.agent, task4.input, context, config),
      engine.execute(task5.agent, task5.input, context, config),
      engine.execute(task6.agent, task6.input, context, config),
      engine.execute(task7.agent, task7.input, context, config),
      engine.execute(task8.agent, task8.input, context, config),
      engine.execute(task9.agent, task9.input, context, config),
      engine.execute(task10.agent, task10.input, context, config),
    ]);

    return [result1, result2, result3, result4, result5, result6, result7, result8, result9, result10];
  }
}

/**
 * Represents a task for parallel execution.
 */
export interface ParallelTask<TInput, TOutput> {
  readonly agent: AIAgent<TInput, TOutput>;
  readonly input: TInput;
}

/**
 * Dynamic parallel executor for runtime scenarios.
 *
 * Use when the number or types of agents to execute in parallel is not known at compile time.
 *
 * @example
 * ```typescript
 * const executor = new DynamicParallelExecutor<string, string>()
 *   .add(agent1, 'input1')
 *   .add(agent2, 'input2')
 *   .add(agent3, 'input3');
 *
 * const results = await executor.execute(context);
 * ```
 */
export class DynamicParallelExecutor<TInput, TOutput> {
  private readonly tasks: Array<{ agent: AIAgent<TInput, TOutput>; input: TInput }> = [];
  private readonly engine: ExecutionEngine;

  constructor(engine?: ExecutionEngine) {
    this.engine = engine ?? new ExecutionEngine(NoOpLifecycle);
  }

  /**
   * Add a task to execute in parallel.
   */
  add(agent: AIAgent<TInput, TOutput>, input: TInput): this {
    this.tasks.push({ agent, input });
    return this;
  }

  /**
   * Execute all tasks in parallel.
   *
   * @param context - Execution context
   * @param config - Optional execution configuration
   * @returns Array of results in the same order as tasks were added
   */
  async execute(
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<ExecutionResult<TOutput>[]> {
    if (this.tasks.length === 0) {
      return [];
    }

    const promises = this.tasks.map(task =>
      this.engine.execute(task.agent, task.input, context, config)
    );

    return Promise.all(promises);
  }

  /**
   * Get the number of tasks.
   */
  get length(): number {
    return this.tasks.length;
  }

  /**
   * Clear all tasks.
   */
  clear(): this {
    this.tasks.length = 0;
    return this;
  }
}
