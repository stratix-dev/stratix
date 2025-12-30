import type { ExecutionContext } from '../execution/ExecutionContext.js';
import type { ExecutionResult } from '../execution/ExecutionResult.js';
import type { AIAgent } from '../agent/AIAgent.js';

/**
 * Lifecycle hooks for agent execution.
 *
 * Allows injecting custom behavior at key points in the agent
 * execution lifecycle. All hooks are optional and asynchronous.
 *
 * Lifecycle order:
 * 1. beforeExecute - called before agent.execute()
 * 2. agent.execute() - agent core logic runs
 * 3. afterExecute - called after successful execution
 * 4. onError - called if execution threw an error
 *
 * @example
 * ```typescript
 * const lifecycle: AgentLifecycle = {
 *   async beforeExecute(agent, input, context) {
 *     console.log(`Executing ${agent.name}...`);
 *     // Log input, validate preconditions, etc.
 *   },
 *
 *   async afterExecute(agent, result, context) {
 *     console.log(`${agent.name} completed`);
 *     // Log output, update metrics, etc.
 *   },
 *
 *   async onError(agent, error, context) {
 *     console.error(`${agent.name} failed:`, error);
 *     // Log error, alert, etc.
 *   }
 * };
 * ```
 */
export interface AgentLifecycle {
  /**
   * Called before agent execution begins.
   *
   * Use for:
   * - Logging execution start
   * - Validating input
   * - Checking preconditions
   * - Updating metrics
   *
   * If this hook throws, execution is aborted and onError is called.
   *
   * @param agent - The agent about to execute
   * @param input - The input being passed to the agent
   * @param context - The execution context
   */
  beforeExecute?<TInput, TOutput>(
    agent: AIAgent<TInput, TOutput>,
    input: TInput,
    context: ExecutionContext
  ): Promise<void>;

  /**
   * Called after successful agent execution.
   *
   * Use for:
   * - Logging execution completion
   * - Recording results
   * - Updating metrics
   * - Post-processing results
   *
   * If this hook throws, the error is propagated but the result is preserved.
   *
   * @param agent - The agent that executed
   * @param result - The execution result
   * @param context - The execution context
   */
  afterExecute?<TInput, TOutput>(
    agent: AIAgent<TInput, TOutput>,
    result: ExecutionResult<TOutput>,
    context: ExecutionContext
  ): Promise<void>;

  /**
   * Called when agent execution throws an error.
   *
   * Use for:
   * - Logging errors
   * - Sending alerts
   * - Recording failure metrics
   * - Error recovery attempts
   *
   * This hook should not throw. If it does, the error is logged but ignored.
   *
   * @param agent - The agent that failed
   * @param error - The error that occurred
   * @param context - The execution context
   */
  onError?<TInput, TOutput>(
    agent: AIAgent<TInput, TOutput>,
    error: Error,
    context: ExecutionContext
  ): Promise<void>;
}

/**
 * No-op lifecycle implementation.
 *
 * Does nothing at any lifecycle point.
 * Useful as a default or for testing.
 */
export const NoOpLifecycle: AgentLifecycle = {
  async beforeExecute() {
    // No-op
  },
  async afterExecute() {
    // No-op
  },
  async onError() {
    // No-op
  },
};

/**
 * Logging lifecycle implementation.
 *
 * Logs all lifecycle events to console.
 * Useful for debugging and development.
 */
export class LoggingLifecycle implements AgentLifecycle {
  constructor(private readonly logger: Console = console) {}

  async beforeExecute<TInput, TOutput>(
    agent: AIAgent<TInput, TOutput>,
    input: TInput,
    context: ExecutionContext
  ): Promise<void> {
    this.logger.log(`[Lifecycle] Before execute: ${agent.name}`, {
      agentId: agent.id.value,
      sessionId: context.sessionId,
      input,
    });
    return Promise.resolve();
  }

  async afterExecute<TInput, TOutput>(
    agent: AIAgent<TInput, TOutput>,
    result: ExecutionResult<TOutput>,
    context: ExecutionContext
  ): Promise<void> {
    this.logger.log(`[Lifecycle] After execute: ${agent.name}`, {
      agentId: agent.id.value,
      sessionId: context.sessionId,
      success: result.isSuccess(),
      warnings: result.warnings,
    });
    return Promise.resolve();
  }

  async onError<TInput, TOutput>(
    agent: AIAgent<TInput, TOutput>,
    error: Error,
    context: ExecutionContext
  ): Promise<void> {
    this.logger.error(`[Lifecycle] Error in: ${agent.name}`, {
      agentId: agent.id.value,
      sessionId: context.sessionId,
      error: error.message,
      stack: error.stack,
    });
    return Promise.resolve();
  }
}

/**
 * Composite lifecycle implementation.
 *
 * Combines multiple lifecycle implementations.
 * Executes all hooks in order, continuing even if one fails.
 *
 * @example
 * ```typescript
 * const lifecycle = new CompositeLifecycle([
 *   loggingLifecycle,
 *   metricsLifecycle,
 *   auditLifecycle
 * ]);
 * ```
 */
export class CompositeLifecycle implements AgentLifecycle {
  constructor(private readonly lifecycles: AgentLifecycle[]) {}

  async beforeExecute<TInput, TOutput>(
    agent: AIAgent<TInput, TOutput>,
    input: TInput,
    context: ExecutionContext
  ): Promise<void> {
    for (const lifecycle of this.lifecycles) {
      if (lifecycle.beforeExecute) {
        await lifecycle.beforeExecute(agent, input, context);
      }
    }
  }

  async afterExecute<TInput, TOutput>(
    agent: AIAgent<TInput, TOutput>,
    result: ExecutionResult<TOutput>,
    context: ExecutionContext
  ): Promise<void> {
    for (const lifecycle of this.lifecycles) {
      if (lifecycle.afterExecute) {
        try {
          await lifecycle.afterExecute(agent, result, context);
        } catch (error) {
          // Log but continue with other lifecycles
          console.error(
            `Lifecycle afterExecute failed for ${agent.name}:`,
            error
          );
        }
      }
    }
  }

  async onError<TInput, TOutput>(
    agent: AIAgent<TInput, TOutput>,
    error: Error,
    context: ExecutionContext
  ): Promise<void> {
    for (const lifecycle of this.lifecycles) {
      if (lifecycle.onError) {
        try {
          await lifecycle.onError(agent, error, context);
        } catch (lifecycleError) {
          // Log but continue with other lifecycles
          console.error(
            `Lifecycle onError failed for ${agent.name}:`,
            lifecycleError
          );
        }
      }
    }
  }
}
