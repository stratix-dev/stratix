import type { ToolResult, ToolContext } from './Tool.js';
import type { ToolRegistry } from './ToolRegistry.js';
import type { ToolCall } from '../llm/LLMMessage.js';

/**
 * Tool execution configuration.
 */
export interface ToolExecutionConfig {
  /**
   * Maximum execution time per tool (ms).
   */
  readonly timeout?: number;

  /**
   * Whether to execute tools in parallel.
   * Default: true
   */
  readonly parallel?: boolean;

  /**
   * Maximum number of tools to execute in parallel.
   * Default: unlimited
   */
  readonly maxParallel?: number;

  /**
   * Whether to continue on tool errors.
   * Default: true
   */
  readonly continueOnError?: boolean;
}

/**
 * Result of executing a tool call.
 */
export interface ToolCallResult {
  /**
   * Original tool call.
   */
  readonly call: ToolCall;

  /**
   * Execution result.
   */
  readonly result: ToolResult;

  /**
   * Execution time (ms).
   */
  readonly durationMs: number;

  /**
   * Whether execution timed out.
   */
  readonly timedOut: boolean;
}

/**
 * Batch execution result.
 */
export interface BatchExecutionResult {
  /**
   * Individual tool call results.
   */
  readonly results: readonly ToolCallResult[];

  /**
   * Total execution time (ms).
   */
  readonly totalDurationMs: number;

  /**
   * Number of successful executions.
   */
  readonly successCount: number;

  /**
   * Number of failed executions.
   */
  readonly failureCount: number;

  /**
   * Number of timeouts.
   */
  readonly timeoutCount: number;
}

/**
 * Executor for running tools with advanced features.
 *
 * Provides:
 * - Timeout enforcement
 * - Parallel execution
 * - Error handling
 * - Performance tracking
 *
 * @example
 * ```typescript
 * const executor = new ToolExecutor(registry);
 *
 * // Execute a single tool call
 * const result = await executor.executeCall(toolCall, context);
 *
 * // Execute multiple tool calls in parallel
 * const batchResult = await executor.executeBatch(toolCalls, context, {
 *   parallel: true,
 *   timeout: 5000
 * });
 * ```
 */
export class ToolExecutor {
  constructor(private readonly registry: ToolRegistry) {}

  /**
   * Execute a single tool call.
   *
   * @param call - Tool call from LLM
   * @param context - Execution context
   * @param config - Execution configuration
   * @returns Tool call result
   */
  async executeCall(
    call: ToolCall,
    context: ToolContext,
    config?: ToolExecutionConfig
  ): Promise<ToolCallResult> {
    const startTime = Date.now();
    let timedOut = false;

    try {
      // Parse arguments
      const params = JSON.parse(call.function.arguments) as Record<string, unknown>;

      // Execute with optional timeout
      const result = config?.timeout
        ? await this.executeWithTimeout(
            call.function.name,
            params,
            context,
            config.timeout
          )
        : await this.registry.execute(call.function.name, params, context);

      const durationMs = Date.now() - startTime;

      return {
        call,
        result,
        durationMs,
        timedOut,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;

      // Check if it was a timeout
      if (error instanceof TimeoutError) {
        timedOut = true;
      }

      return {
        call,
        result: {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        durationMs,
        timedOut,
      };
    }
  }

  /**
   * Execute multiple tool calls.
   *
   * @param calls - Tool calls from LLM
   * @param context - Execution context
   * @param config - Execution configuration
   * @returns Batch execution result
   */
  async executeBatch(
    calls: readonly ToolCall[],
    context: ToolContext,
    config?: ToolExecutionConfig
  ): Promise<BatchExecutionResult> {
    const startTime = Date.now();
    const parallel = config?.parallel ?? true;

    let results: ToolCallResult[];

    if (parallel) {
      // Execute in parallel
      const maxParallel = config?.maxParallel ?? calls.length;
      results = await this.executeParallel(calls, context, config, maxParallel);
    } else {
      // Execute sequentially
      results = await this.executeSequential(calls, context, config);
    }

    const totalDurationMs = Date.now() - startTime;
    const successCount = results.filter((r) => r.result.success).length;
    const failureCount = results.filter((r) => !r.result.success).length;
    const timeoutCount = results.filter((r) => r.timedOut).length;

    return {
      results,
      totalDurationMs,
      successCount,
      failureCount,
      timeoutCount,
    };
  }

  /**
   * Execute tool calls in parallel.
   */
  private async executeParallel(
    calls: readonly ToolCall[],
    context: ToolContext,
    config: ToolExecutionConfig | undefined,
    maxParallel: number
  ): Promise<ToolCallResult[]> {
    const results: ToolCallResult[] = [];

    // Execute in chunks to limit parallelism
    for (let i = 0; i < calls.length; i += maxParallel) {
      const chunk = calls.slice(i, i + maxParallel);
      const chunkResults = await Promise.all(
        chunk.map((call) => this.executeCall(call, context, config))
      );
      results.push(...chunkResults);

      // Stop on error if configured
      if (!config?.continueOnError) {
        const hasError = chunkResults.some((r) => !r.result.success);
        if (hasError) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Execute tool calls sequentially.
   */
  private async executeSequential(
    calls: readonly ToolCall[],
    context: ToolContext,
    config: ToolExecutionConfig | undefined
  ): Promise<ToolCallResult[]> {
    const results: ToolCallResult[] = [];

    for (const call of calls) {
      const result = await this.executeCall(call, context, config);
      results.push(result);

      // Stop on error if configured
      if (!config?.continueOnError && !result.result.success) {
        break;
      }
    }

    return results;
  }

  /**
   * Execute with timeout.
   */
  private async executeWithTimeout(
    name: string,
    params: unknown,
    context: ToolContext,
    timeoutMs: number
  ): Promise<ToolResult> {
    return Promise.race([
      this.registry.execute(name, params, context),
      this.createTimeout(timeoutMs),
    ]);
  }

  /**
   * Create a timeout promise.
   */
  private async createTimeout(ms: number): Promise<never> {
    await new Promise((resolve) => setTimeout(resolve, ms));
    throw new TimeoutError(`Tool execution timed out after ${ms}ms`);
  }

  /**
   * Format tool call results as LLM messages.
   */
  formatResults(results: readonly ToolCallResult[]): string {
    return results
      .map((r) => {
        const status = r.result.success ? '✓' : '✗';
        const content = r.result.success
          ? JSON.stringify(r.result.data)
          : r.result.error;
        return `${status} ${r.call.function.name}: ${content}`;
      })
      .join('\n');
  }

  /**
   * Get execution statistics.
   */
  getStats(result: BatchExecutionResult): {
    successRate: number;
    averageDuration: number;
    maxDuration: number;
    minDuration: number;
  } {
    const durations = result.results.map((r) => r.durationMs);
    const total = result.results.length;

    return {
      successRate: total > 0 ? result.successCount / total : 0,
      averageDuration:
        durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0,
      maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
      minDuration: durations.length > 0 ? Math.min(...durations) : 0,
    };
  }
}

/**
 * Timeout error.
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}
