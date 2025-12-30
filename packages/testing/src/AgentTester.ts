import type {
  AIAgent,
  ExecutionContext,
  ExecutionResult,
  ExecutionConfig,
  AgentLifecycle,
  ExecutionTrace,
} from '@stratix/core/ai-agents';
import { ExecutionEngine } from '@stratix/core/ai-agents';
import type { MockLLMProvider, MockResponse } from './MockLLMProvider.js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Configuration for AgentTester.
 */
export interface AgentTesterConfig {
  /**
   * Default execution timeout in milliseconds.
   * @default 30000
   */
  readonly timeout?: number;

  /**
   * Enable execution tracing for debugging.
   * @default true
   */
  readonly enableTracing?: boolean;

  /**
   * Mock LLM provider to use for testing.
   * If not provided, a new instance will be created.
   */
  readonly mockProvider?: MockLLMProvider;

  /**
   * Default execution context values.
   * These will be merged with context provided to test() method.
   */
  readonly defaultContext?: Partial<{
    userId: string;
    environment: 'development' | 'staging' | 'production';
    metadata: Record<string, unknown>;
    budget: number;
  }>;
}

/**
 * Test lifecycle hooks extending AgentLifecycle.
 *
 * Provides additional test-specific hooks.
 */
export interface TestLifecycleHooks extends AgentLifecycle {
  /**
   * Called when test starts (before beforeExecute).
   *
   * @param agent - The agent being tested
   * @param input - The test input
   */
  onTestStart?<TInput, TOutput>(
    agent: AIAgent<TInput, TOutput>,
    input: TInput
  ): void | Promise<void>;

  /**
   * Called when test completes (after afterExecute or onError).
   *
   * @param result - The test result
   */
  onTestComplete?<TOutput>(result: TestResult<TOutput>): void | Promise<void>;
}

/**
 * Test execution result with additional test metadata.
 *
 * @template TOutput - The output type from the agent
 */
export interface TestResult<TOutput> {
  /**
   * The execution result from the agent.
   */
  readonly result: ExecutionResult<TOutput>;

  /**
   * Test execution duration in milliseconds.
   */
  readonly duration: number;

  /**
   * Whether the test passed based on result success.
   */
  readonly passed: boolean;

  /**
   * Optional execution trace for debugging.
   * Only present if tracing is enabled.
   */
  readonly trace?: ExecutionTrace;

  /**
   * Lifecycle events captured during execution.
   */
  readonly lifecycleEvents?: {
    beforeExecute?: Date;
    afterExecute?: Date;
    onError?: { error: Error; timestamp: Date };
  };
}

/**
 * Configuration for a single test execution.
 */
export interface TestExecutionConfig extends ExecutionConfig {
  /**
   * Capture execution trace for this test.
   * Overrides global enableTracing setting.
   */
  readonly captureTrace?: boolean;
}

// ============================================================================
// AgentTester Class
// ============================================================================

/**
 * Test harness for AI agents.
 *
 * Wraps ExecutionEngine with test-friendly utilities:
 * - Mock provider integration
 * - Lifecycle event capture
 * - Execution tracing
 * - Performance measurement
 * - Type-safe test assertions
 *
 * @template TInput - Agent input type
 * @template TOutput - Agent output type
 *
 * @example
 * ```typescript
 * describe('MyAgent', () => {
 *   let tester: AgentTester<string, { result: string }>;
 *
 *   beforeEach(() => {
 *     tester = new AgentTester();
 *     tester.setMockResponse({
 *       content: JSON.stringify({ result: 'success' }),
 *       usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
 *     });
 *   });
 *
 *   it('should process input successfully', async () => {
 *     const agent = new MyAgent();
 *     const context = createExecutionContext();
 *
 *     const { result, duration, passed } = await tester.test(
 *       agent,
 *       'test input',
 *       context
 *     );
 *
 *     expect(passed).toBe(true);
 *     expect(result.isSuccess()).toBe(true);
 *     expect(duration).toBeLessThan(5000);
 *   });
 * });
 * ```
 */
export class AgentTester<TInput = unknown, TOutput = unknown> {
  private readonly engine: ExecutionEngine;
  private readonly config: AgentTesterConfig & { timeout: number; enableTracing: boolean };
  private lifecycle?: TestLifecycleHooks;
  private readonly lifecycleEvents: Map<string, {
    beforeExecute?: Date;
    afterExecute?: Date;
    onError?: { error: Error; timestamp: Date };
  }>;

  /**
   * Create a new AgentTester.
   *
   * @param config - Optional configuration
   */
  constructor(config?: AgentTesterConfig) {
    this.config = {
      timeout: config?.timeout ?? 30000,
      enableTracing: config?.enableTracing ?? true,
      mockProvider: config?.mockProvider,
      defaultContext: config?.defaultContext ?? {},
    };

    this.lifecycleEvents = new Map();

    // Create internal lifecycle that captures events
    const internalLifecycle: AgentLifecycle = {
      beforeExecute: async (agent, input, context) => {
        const key = this.getEventKey(agent.id.value);
        const events = this.lifecycleEvents.get(key) ?? {};
        events.beforeExecute = new Date();
        this.lifecycleEvents.set(key, events);

        // Call user lifecycle
        if (this.lifecycle?.beforeExecute) {
          await this.lifecycle.beforeExecute(agent, input, context);
        }
      },

      afterExecute: async (agent, result, context) => {
        const key = this.getEventKey(agent.id.value);
        const events = this.lifecycleEvents.get(key) ?? {};
        events.afterExecute = new Date();
        this.lifecycleEvents.set(key, events);

        // Call user lifecycle
        if (this.lifecycle?.afterExecute) {
          await this.lifecycle.afterExecute(agent, result, context);
        }
      },

      onError: async (agent, error, context) => {
        const key = this.getEventKey(agent.id.value);
        const events = this.lifecycleEvents.get(key) ?? {};
        events.onError = { error, timestamp: new Date() };
        this.lifecycleEvents.set(key, events);

        // Call user lifecycle
        if (this.lifecycle?.onError) {
          await this.lifecycle.onError(agent, error, context);
        }
      },
    };

    this.engine = new ExecutionEngine(internalLifecycle);
  }

  /**
   * Execute a test for an agent.
   *
   * @param agent - The agent to test
   * @param input - Test input data
   * @param context - Execution context
   * @param config - Optional test execution config
   * @returns Test result with execution data
   */
  async test(
    agent: AIAgent<TInput, TOutput>,
    input: TInput,
    context: ExecutionContext,
    config?: TestExecutionConfig
  ): Promise<TestResult<TOutput>> {
    const startTime = Date.now();

    // Call onTestStart hook
    if (this.lifecycle?.onTestStart) {
      await this.lifecycle.onTestStart(agent, input);
    }

    // Prepare execution config
    const executionConfig: ExecutionConfig = {
      timeout: config?.timeout ?? this.config.timeout,
      retry: config?.retry,
      metadata: config?.metadata,
    };

    // Clear previous lifecycle events for this agent
    const key = this.getEventKey(agent.id.value);
    this.lifecycleEvents.delete(key);

    // Execute agent
    const result = await this.engine.execute(agent, input, context, executionConfig);

    const duration = Date.now() - startTime;
    const passed = result.isSuccess();

    // Get lifecycle events
    const lifecycleEvents = this.lifecycleEvents.get(key);

    // TODO: Implement trace capture
    const trace: ExecutionTrace | undefined = undefined;

    const testResult: TestResult<TOutput> = {
      result,
      duration,
      passed,
      trace,
      lifecycleEvents,
    };

    // Call onTestComplete hook
    if (this.lifecycle?.onTestComplete) {
      await this.lifecycle.onTestComplete(testResult);
    }

    return testResult;
  }

  // === Lifecycle Management ===

  /**
   * Set test lifecycle hooks.
   *
   * @param lifecycle - Lifecycle hooks to use
   * @returns This tester for chaining
   */
  setLifecycle(lifecycle: TestLifecycleHooks): this {
    this.lifecycle = lifecycle;
    return this;
  }

  /**
   * Get current lifecycle hooks.
   *
   * @returns Current lifecycle or undefined
   */
  getLifecycle(): TestLifecycleHooks | undefined {
    return this.lifecycle;
  }

  // === Mock Provider Management ===

  /**
   * Get the mock LLM provider.
   *
   * @returns Mock provider instance
   * @throws {Error} If no mock provider configured
   */
  getMockProvider(): MockLLMProvider {
    if (!this.config.mockProvider) {
      throw new Error('No mock provider configured. Provide one in constructor.');
    }
    return this.config.mockProvider;
  }

  /**
   * Set a single mock response.
   * Convenience method for getMockProvider().setResponse().
   *
   * @param response - Mock response to use
   * @returns This tester for chaining
   */
  setMockResponse(response: MockResponse): this {
    this.getMockProvider().setResponse(response);
    return this;
  }

  /**
   * Set multiple mock responses in sequence.
   * Convenience method for getMockProvider().setResponses().
   *
   * @param responses - Array of mock responses
   * @returns This tester for chaining
   */
  setMockResponses(responses: MockResponse[]): this {
    this.getMockProvider().setResponses(responses);
    return this;
  }

  // === State Management ===

  /**
   * Reset tester state.
   * Clears lifecycle events and mock provider history.
   *
   * @returns This tester for chaining
   */
  reset(): this {
    this.lifecycleEvents.clear();

    if (this.config.mockProvider) {
      this.config.mockProvider.reset();
    }

    return this;
  }

  // === Utility Methods ===

  /**
   * Get unique key for lifecycle events.
   *
   * @private
   */
  private getEventKey(agentId: string): string {
    return `agent-${agentId}`;
  }
}

/**
 * Create a test lifecycle that logs events.
 *
 * @param logger - Optional logger (defaults to console)
 * @returns Test lifecycle implementation
 */
export function createLoggingLifecycle(logger: Console = console): TestLifecycleHooks {
  return {
    async onTestStart(agent, _input) {
      logger.log(`[Test] Starting test for ${agent.name}`);
    },

    async beforeExecute(agent, _input, context) {
      logger.log(`[Test] Before execute: ${agent.name}`, {
        agentId: agent.id.value,
        sessionId: context.sessionId,
      });
    },

    async afterExecute(agent, result, _context) {
      logger.log(`[Test] After execute: ${agent.name}`, {
        success: result.isSuccess(),
        warnings: result.warnings.length,
      });
    },

    async onError(agent, error, _context) {
      logger.error(`[Test] Error in ${agent.name}:`, error.message);
    },

    async onTestComplete(result) {
      logger.log(`[Test] Test completed`, {
        passed: result.passed,
        duration: `${result.duration}ms`,
      });
    },
  };
}

/**
 * Create a test lifecycle that captures all events.
 *
 * Useful for assertions on lifecycle behavior.
 *
 * @returns Test lifecycle and captured events
 */
export function createCapturingLifecycle(): {
  lifecycle: TestLifecycleHooks;
  events: {
    testStarts: unknown[];
    beforeExecutes: unknown[];
    afterExecutes: unknown[];
    errors: Error[];
    testCompletes: unknown[];
  };
} {
  const events = {
    testStarts: [] as unknown[],
    beforeExecutes: [] as unknown[],
    afterExecutes: [] as unknown[],
    errors: [] as Error[],
    testCompletes: [] as unknown[],
  };

  const lifecycle: TestLifecycleHooks = {
    async onTestStart(_agent, input) {
      events.testStarts.push(input);
    },

    async beforeExecute(agent, input, context) {
      events.beforeExecutes.push({ agent, input, context });
    },

    async afterExecute(agent, result, context) {
      events.afterExecutes.push({ agent, result, context });
    },

    async onError(_agent, error, _context) {
      events.errors.push(error);
    },

    async onTestComplete(result) {
      events.testCompletes.push(result);
    },
  };

  return { lifecycle, events };
}
