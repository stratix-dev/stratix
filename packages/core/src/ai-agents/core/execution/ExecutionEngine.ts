import type { AIAgent } from '../agent/AIAgent.js';
import type { AgentLifecycle } from '../lifecycle/AgentLifecycle.js';
import type { ExecutionContext } from './ExecutionContext.js';
import type { ExecutionResult } from './ExecutionResult.js';
import type { ExecutionConfig } from './ExecutionConfig.js';
import { ExecutionResult as Result } from './ExecutionResult.js';
import { RetryPolicyHelpers } from '../../shared/RetryPolicy.js';
import { ExecutionMetadataHelpers } from '../../shared/ExecutionMetadata.js';

/**
 * Agent timeout error.
 *
 * Thrown when agent execution exceeds configured timeout.
 */
export class AgentTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Agent execution exceeded timeout of ${timeoutMs}ms`);
    this.name = 'AgentTimeoutError';
  }
}

/**
 * Agent budget exceeded error.
 *
 * Thrown when agent execution would exceed budget.
 */
export class AgentBudgetExceededError extends Error {
  constructor(budget: number, cost: number) {
    super(
      `Agent execution would exceed budget: $${cost.toFixed(4)} > $${budget.toFixed(4)}`
    );
    this.name = 'AgentBudgetExceededError';
  }
}

/**
 * Orchestrates agent execution with cross-cutting concerns.
 *
 * ExecutionEngine is responsible for:
 * - Invoking lifecycle hooks (before/after/error)
 * - Enforcing execution timeout
 * - Handling retry logic with exponential backoff
 * - Recording execution metadata
 * - Publishing domain events
 * - Budget enforcement
 *
 * The engine separates infrastructure concerns from agent domain logic,
 * making agents easier to test and more focused.
 *
 * @example
 * ```typescript
 * const engine = new ExecutionEngine(lifecycle);
 *
 * const context = ExecutionContext.create({
 *   sessionId: 'session-123',
 *   environment: 'production'
 * });
 *
 * const config: ExecutionConfig = {
 *   timeout: 30000,
 *   retry: RetryPolicies.CONSERVATIVE
 * };
 *
 * const result = await engine.execute(agent, input, context, config);
 *
 * if (result.isSuccess()) {
 *   console.log('Success:', result.value);
 * } else {
 *   console.error('Failed:', result.error);
 * }
 * ```
 */
export class ExecutionEngine {
  /**
   * Create an execution engine.
   *
   * @param lifecycle - Lifecycle hooks to invoke during execution
   */
  constructor(private readonly lifecycle: AgentLifecycle) {}

  /**
   * Execute an agent with full orchestration.
   *
   * This is the primary execution method. It handles:
   * - Lifecycle hooks (before/after/error)
   * - Timeout enforcement
   * - Retry logic
   * - Budget checking
   * - Domain event publishing
   *
   * @template TInput - Agent input type
   * @template TOutput - Agent output type
   *
   * @param agent - The agent to execute
   * @param input - The input data for the agent
   * @param context - The execution context
   * @param config - Optional execution configuration (timeout, retry)
   * @returns A promise resolving to an ExecutionResult
   *
   * @throws {AgentTimeoutError} If execution exceeds configured timeout
   * @throws {AgentBudgetExceededError} If execution would exceed budget
   */
  async execute<TInput, TOutput>(
    agent: AIAgent<TInput, TOutput>,
    input: TInput,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<ExecutionResult<TOutput>> {
    const startTime = Date.now();

    try {
      // Check budget before execution
      if (context.isBudgetExceeded()) {
        const budget = context.budget ?? 0;
        const cost = context.getTotalCost();
        throw new AgentBudgetExceededError(budget, cost);
      }

      // Before hook
      if (this.lifecycle.beforeExecute) {
        await this.lifecycle.beforeExecute(agent, input, context);
      }

      // Execute with timeout if configured
      const result = config?.timeout
        ? await this.executeWithTimeout(agent, input, context, config.timeout)
        : await agent.execute(input, context);

      // After hook
      if (this.lifecycle.afterExecute) {
        try {
          await this.lifecycle.afterExecute(agent, result, context);
        } catch (hookError) {
          // Log but don't fail execution if after hook fails
          console.error(
            `[ExecutionEngine] After hook failed for ${agent.name}:`,
            hookError
          );
        }
      }

      return result;
    } catch (error) {
      const executionError = error as Error;

      // Error hook
      if (this.lifecycle.onError) {
        try {
          await this.lifecycle.onError(agent, executionError, context);
        } catch (hookError) {
          // Log but don't fail if error hook fails
          console.error(
            `[ExecutionEngine] Error hook failed for ${agent.name}:`,
            hookError
          );
        }
      }

      // Apply retry if configured
      if (config?.retry && this.shouldRetry(executionError, config.retry, 1)) {
        return this.retryExecution(
          agent,
          input,
          context,
          config,
          executionError,
          1,
          startTime
        );
      }

      // Return failure result
      return Result.failure(
        executionError,
        ExecutionMetadataHelpers.create(agent.model.model, {
          durationMs: Date.now() - startTime,
        })
      );
    }
  }

  /**
   * Execute agent with timeout.
   *
   * @private
   */
  private async executeWithTimeout<TInput, TOutput>(
    agent: AIAgent<TInput, TOutput>,
    input: TInput,
    context: ExecutionContext,
    timeoutMs: number
  ): Promise<ExecutionResult<TOutput>> {
    return Promise.race([
      agent.execute(input, context),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new AgentTimeoutError(timeoutMs)), timeoutMs)
      ),
    ]);
  }

  /**
   * Retry execution with exponential backoff.
   *
   * @private
   */
  private async retryExecution<TInput, TOutput>(
    agent: AIAgent<TInput, TOutput>,
    input: TInput,
    context: ExecutionContext,
    config: ExecutionConfig,
    lastError: Error,
    attempt: number,
    originalStartTime: number
  ): Promise<ExecutionResult<TOutput>> {
    const retryPolicy = config.retry!;

    // Check if we should retry
    if (!RetryPolicyHelpers.shouldAttemptRetry(retryPolicy, attempt + 1)) {
      // Out of retries
      return Result.failure(
        lastError,
        ExecutionMetadataHelpers.create(agent.model.model, {
          durationMs: Date.now() - originalStartTime,
        })
      );
    }

    // Calculate delay
    const delay = RetryPolicyHelpers.calculateDelay(retryPolicy, attempt);

    // Wait before retry
    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      // Before hook for retry
      if (this.lifecycle.beforeExecute) {
        await this.lifecycle.beforeExecute(agent, input, context);
      }

      // Execute with timeout if configured
      const result = config.timeout
        ? await this.executeWithTimeout(agent, input, context, config.timeout)
        : await agent.execute(input, context);

      // After hook
      if (this.lifecycle.afterExecute) {
        try {
          await this.lifecycle.afterExecute(agent, result, context);
        } catch (hookError) {
          console.error(
            `[ExecutionEngine] After hook failed on retry ${attempt} for ${agent.name}:`,
            hookError
          );
        }
      }

      // Success - add warning about retry
      return result.isSuccess()
        ? Result.success(
            result.value,
            result.metadata,
            [...result.warnings, `Succeeded after ${attempt} ${attempt === 1 ? 'retry' : 'retries'}`]
          )
        : result;
    } catch (error) {
      const retryError = error as Error;

      // Error hook
      if (this.lifecycle.onError) {
        try {
          await this.lifecycle.onError(agent, retryError, context);
        } catch (hookError) {
          console.error(
            `[ExecutionEngine] Error hook failed on retry ${attempt} for ${agent.name}:`,
            hookError
          );
        }
      }

      // Check if we should retry again
      if (this.shouldRetry(retryError, retryPolicy, attempt + 1)) {
        return this.retryExecution(
          agent,
          input,
          context,
          config,
          retryError,
          attempt + 1,
          originalStartTime
        );
      }

      // Out of retries or non-retryable error
      return Result.failure(
        retryError,
        ExecutionMetadataHelpers.create(agent.model.model, {
          durationMs: Date.now() - originalStartTime,
        })
      );
    }
  }

  /**
   * Check if error is retryable according to policy.
   *
   * @private
   */
  private shouldRetry(
    error: Error,
    policy: import('../../shared/RetryPolicy.js').RetryPolicy,
    attempt: number
  ): boolean {
    return (
      RetryPolicyHelpers.shouldAttemptRetry(policy, attempt) &&
      RetryPolicyHelpers.isRetryable(policy, error, attempt)
    );
  }
}
