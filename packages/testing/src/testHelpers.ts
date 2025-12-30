import { ExecutionContext } from '@stratix/core/ai-agents';
import type {
  AIAgent,
  ExecutionResult,
  ExecutionConfig,
  ExecutionTrace,
  TraceStep,
  Message,
} from '@stratix/core/ai-agents';
import { AgentVersion } from '@stratix/core/ai-agents';
import { EntityId } from '@stratix/core';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Options for creating test execution context.
 */
export interface ExecutionContextOptions {
  readonly sessionId?: string;
  readonly userId?: string;
  readonly environment?: 'development' | 'staging' | 'production';
  readonly metadata?: Record<string, unknown>;
  readonly budget?: number;
  readonly initialMessages?: Message[];
}

/**
 * Test session metadata.
 */
export interface TestSession {
  readonly sessionId: string;
  readonly userId?: string;
}

/**
 * Result of measureTime utility.
 */
export interface MeasuredResult<T> {
  readonly result: T;
  readonly duration: number;
}

// ============================================================================
// Context Factories
// ============================================================================

/**
 * Create an execution context for testing.
 *
 * Provides sensible defaults:
 * - sessionId: random UUID
 * - environment: 'development'
 * - No budget limit
 * - No initial messages
 *
 * @param overrides - Optional overrides for default values
 * @returns New ExecutionContext instance
 *
 * @example
 * ```typescript
 * const context = createExecutionContext({
 *   userId: 'test-user-123',
 *   budget: 1.0, // $1 budget
 *   metadata: { testRun: true }
 * });
 * ```
 */
export function createExecutionContext(
  overrides?: Partial<ExecutionContextOptions>
): ExecutionContext {
  const sessionId = overrides?.sessionId || `test-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const environment = overrides?.environment || 'development';

  let context = ExecutionContext.create({
    sessionId,
    userId: overrides?.userId,
    environment,
    metadata: overrides?.metadata,
    budget: overrides?.budget,
  });

  // Add initial messages if provided
  if (overrides?.initialMessages && overrides.initialMessages.length > 0) {
    context = context.addMessages(overrides.initialMessages);
  }

  return context;
}

/**
 * Create test session metadata.
 *
 * @param userId - Optional user ID
 * @returns Test session object
 *
 * @example
 * ```typescript
 * const session = createTestSession('user-123');
 * const context = createExecutionContext({
 *   sessionId: session.sessionId,
 *   userId: session.userId
 * });
 * ```
 */
export function createTestSession(userId?: string): TestSession {
  return {
    sessionId: `test-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId,
  };
}

// ============================================================================
// Agent Factories
// ============================================================================

/**
 * Create a test agent with custom execution logic.
 *
 * @param execute - Execution function
 * @param metadata - Optional agent metadata
 * @returns Test agent instance
 *
 * @example
 * ```typescript
 * const agent = createTestAgent<string, { result: string }>(
 *   async (input, context) => {
 *     return ExecutionResult.success(
 *       { result: input.toUpperCase() },
 *       { model: 'test' }
 *     );
 *   },
 *   { name: 'uppercase-agent', version: { major: 1, minor: 0, patch: 0 } }
 * );
 * ```
 */
export function createTestAgent<TInput, TOutput>(
  execute: (input: TInput, context: ExecutionContext) => Promise<ExecutionResult<TOutput>>,
  metadata?: {
    name?: string;
    description?: string;
    version?: AgentVersion | string;
  }
): TestAgent<TInput, TOutput> {
  const version = metadata?.version
    ? typeof metadata.version === 'string'
      ? AgentVersion.parse(metadata.version)
      : metadata.version
    : AgentVersion.create(1, 0, 0);

  const agentMetadata = {
    name: metadata?.name || 'test-agent',
    description: metadata?.description || 'Test agent',
    version,
  };

  return new TestAgent(execute, agentMetadata);
}

/**
 * Internal test agent implementation.
 */
class TestAgent<TInput, TOutput> implements Pick<AIAgent<TInput, TOutput>, 'execute' | 'name' | 'description' | 'version'> {
  public readonly id: EntityId<'AIAgent'>;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(
    private readonly executeImpl: (input: TInput, context: ExecutionContext) => Promise<ExecutionResult<TOutput>>,
    private readonly metadata: {
      name: string;
      description: string;
      version: AgentVersion;
    }
  ) {
    this.id = EntityId.create<'AIAgent'>();
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  get name(): string {
    return this.metadata.name;
  }

  get description(): string {
    return this.metadata.description;
  }

  get version(): AgentVersion {
    return this.metadata.version;
  }

  async execute(input: TInput, context: ExecutionContext): Promise<ExecutionResult<TOutput>> {
    return this.executeImpl(input, context);
  }
}

/**
 * Create an echo agent that returns its input as output.
 *
 * @returns Echo agent instance
 *
 * @example
 * ```typescript
 * const agent = createEchoAgent();
 * const result = await agent.execute('hello', context);
 * // result.value === 'hello'
 * ```
 */
export function createEchoAgent(): TestAgent<string, string> {
  return createTestAgent<string, string>(
    async (input) => {
      const { ExecutionResult } = await import('@stratix/core/ai-agents');
      return ExecutionResult.success(input, {
        model: 'echo',
        durationMs: 0,
      });
    },
    { name: 'echo-agent', description: 'Returns input as output' }
  );
}

/**
 * Create an agent that delays execution by specified milliseconds.
 *
 * @param delayMs - Delay in milliseconds
 * @returns Delay agent instance
 *
 * @example
 * ```typescript
 * const agent = createDelayAgent(1000); // 1 second delay
 * const start = Date.now();
 * await agent.execute('test', context);
 * const duration = Date.now() - start; // ~1000ms
 * ```
 */
export function createDelayAgent(delayMs: number): TestAgent<string, string> {
  return createTestAgent<string, string>(
    async (input) => {
      await wait(delayMs);
      const { ExecutionResult } = await import('@stratix/core/ai-agents');
      return ExecutionResult.success(`Delayed: ${input}`, {
        model: 'delay',
        durationMs: delayMs,
      });
    },
    { name: 'delay-agent', description: `Delays ${delayMs}ms before responding` }
  );
}

/**
 * Create an agent that always fails with the specified error.
 *
 * @param error - Error to throw
 * @returns Failing agent instance
 *
 * @example
 * ```typescript
 * const agent = createFailingAgent(new Error('Test failure'));
 * const result = await agent.execute('test', context);
 * // result.isFailure() === true
 * ```
 */
export function createFailingAgent(error: Error): TestAgent<string, never> {
  return createTestAgent<string, never>(
    async () => {
      const { ExecutionResult } = await import('@stratix/core/ai-agents');
      return ExecutionResult.failure(error, {
        model: 'failing',
        stage: 'execution',
      });
    },
    { name: 'failing-agent', description: 'Always fails' }
  );
}

// ============================================================================
// Execution Config Factories
// ============================================================================

/**
 * Create test execution config with defaults.
 *
 * @param overrides - Optional config overrides
 * @returns ExecutionConfig
 *
 * @example
 * ```typescript
 * const config = createTestConfig({
 *   timeout: 5000,
 *   metadata: { testId: 'test-123' }
 * });
 * ```
 */
export function createTestConfig(overrides?: Partial<ExecutionConfig>): ExecutionConfig {
  return {
    timeout: overrides?.timeout,
    retry: overrides?.retry,
    metadata: overrides?.metadata,
  };
}

/**
 * Create execution config with retry policy.
 *
 * @param maxRetries - Maximum number of retries
 * @param initialDelayMs - Optional initial delay between retries
 * @returns ExecutionConfig with retry policy
 *
 * @example
 * ```typescript
 * const config = createRetryConfig(3, 1000); // Retry 3 times with 1s initial delay
 * ```
 */
export function createRetryConfig(maxRetries: number, initialDelayMs?: number): ExecutionConfig {
  const delay = initialDelayMs || 1000;
  return {
    retry: {
      maxRetries,
      initialDelayMs: delay,
      maxDelayMs: delay * 10,
      backoffMultiplier: 2,
    },
  };
}

/**
 * Create execution config with timeout.
 *
 * @param timeoutMs - Timeout in milliseconds
 * @returns ExecutionConfig with timeout
 *
 * @example
 * ```typescript
 * const config = createTimeoutConfig(30000); // 30 second timeout
 * ```
 */
export function createTimeoutConfig(timeoutMs: number): ExecutionConfig {
  return {
    timeout: timeoutMs,
  };
}

// ============================================================================
// Timing Utilities
// ============================================================================

/**
 * Wait for specified milliseconds.
 *
 * @param ms - Milliseconds to wait
 * @returns Promise that resolves after delay
 *
 * @example
 * ```typescript
 * await wait(1000); // Wait 1 second
 * ```
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Measure execution time of an async function.
 *
 * @param fn - Function to measure
 * @returns Result and duration in milliseconds
 *
 * @example
 * ```typescript
 * const { result, duration } = await measureTime(async () => {
 *   return await agent.execute(input, context);
 * });
 * console.log(`Execution took ${duration}ms`);
 * ```
 */
export async function measureTime<T>(fn: () => Promise<T>): Promise<MeasuredResult<T>> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
}

/**
 * Add a timeout to a promise.
 *
 * @param promise - Promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param message - Optional error message
 * @returns Promise that rejects if timeout exceeded
 *
 * @example
 * ```typescript
 * const result = await withTimeout(
 *   agent.execute(input, context),
 *   5000,
 *   'Agent execution timeout'
 * );
 * ```
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message?: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(message || `Operation timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

// ============================================================================
// Batch Testing
// ============================================================================

/**
 * Run a test function multiple times in sequence.
 *
 * @param times - Number of times to repeat
 * @param testFn - Test function (receives iteration number)
 * @returns Array of results
 *
 * @example
 * ```typescript
 * const results = await repeatTest(5, async (i) => {
 *   return await agent.execute(`Input ${i}`, context);
 * });
 * ```
 */
export async function repeatTest<T>(
  times: number,
  testFn: (iteration: number) => Promise<T>
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < times; i++) {
    results.push(await testFn(i));
  }
  return results;
}

/**
 * Run multiple test functions in parallel.
 *
 * @param testFns - Array of test functions
 * @returns Array of results (in same order as input)
 *
 * @example
 * ```typescript
 * const results = await runInParallel([
 *   async () => agent1.execute(input1, context),
 *   async () => agent2.execute(input2, context),
 *   async () => agent3.execute(input3, context)
 * ]);
 * ```
 */
export async function runInParallel<T>(testFns: Array<() => Promise<T>>): Promise<T[]> {
  return Promise.all(testFns.map((fn) => fn()));
}

// ============================================================================
// Promise Utilities
// ============================================================================

/**
 * Assert that a promise rejects.
 *
 * @param promise - Promise that should reject
 * @param errorMatcher - Optional error type, message, or regex to match
 * @returns Promise that resolves if promise rejects
 *
 * @example
 * ```typescript
 * await expectToReject(
 *   agent.execute('bad input', context),
 *   /validation error/i
 * );
 * ```
 */
export async function expectToReject(
  promise: Promise<unknown>,
  errorMatcher?: string | RegExp | ErrorConstructor
): Promise<void> {
  try {
    await promise;
    throw new Error('Expected promise to reject, but it resolved');
  } catch (error) {
    // Check error type if ErrorConstructor provided
    if (errorMatcher && typeof errorMatcher === 'function') {
      if (!(error instanceof errorMatcher)) {
        throw new Error(
          `Expected error to be instance of ${errorMatcher.name}, but got ${(error as Error).constructor.name}`
        );
      }
    }

    // Check error message if string or RegExp provided
    if (errorMatcher && typeof errorMatcher === 'string') {
      if (!(error as Error).message.includes(errorMatcher)) {
        throw new Error(
          `Expected error message to include "${errorMatcher}", but got: ${(error as Error).message}`
        );
      }
    }

    if (errorMatcher && errorMatcher instanceof RegExp) {
      if (!errorMatcher.test((error as Error).message)) {
        throw new Error(
          `Expected error message to match ${errorMatcher}, but got: ${(error as Error).message}`
        );
      }
    }
  }
}

/**
 * Assert that a promise resolves successfully.
 *
 * @param promise - Promise that should resolve
 * @returns Resolved value
 *
 * @example
 * ```typescript
 * const result = await expectToResolve(
 *   agent.execute(input, context)
 * );
 * ```
 */
export async function expectToResolve<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    throw new Error(`Expected promise to resolve, but it rejected: ${(error as Error).message}`);
  }
}

// ============================================================================
// Result Utilities
// ============================================================================

/**
 * Unwrap a successful ExecutionResult or throw.
 *
 * @param result - Execution result to unwrap
 * @returns The success value
 * @throws {Error} If result is failure
 *
 * @example
 * ```typescript
 * const value = unwrapSuccess(result);
 * // Type is narrowed to TOutput
 * ```
 */
export function unwrapSuccess<T>(result: ExecutionResult<T>): T {
  if (!result.isSuccess()) {
    throw new Error(`Expected success but got failure: ${result.error?.message}`);
  }
  return result.value;
}

/**
 * Unwrap ExecutionResult with fallback value.
 *
 * @param result - Execution result to unwrap
 * @param defaultValue - Default value if result is failure
 * @returns The success value or default
 *
 * @example
 * ```typescript
 * const value = unwrapOr(result, { fallback: true });
 * ```
 */
export function unwrapOr<T>(result: ExecutionResult<T>, defaultValue: T): T {
  return result.unwrapOr(defaultValue);
}

// ============================================================================
// Trace Utilities
// ============================================================================

/**
 * Assert that trace has specific steps in order.
 *
 * @param trace - Execution trace
 * @param expectedSteps - Array of expected step names
 * @throws {Error} If steps don't match
 *
 * @example
 * ```typescript
 * expectTraceSteps(trace, ['llm.request', 'tool.call', 'llm.request']);
 * ```
 */
export function expectTraceSteps(trace: ExecutionTrace, expectedSteps: string[]): void {
  const actualSteps = trace.steps.map((s) => s.name);

  if (actualSteps.length !== expectedSteps.length) {
    throw new Error(
      `Expected ${expectedSteps.length} steps but got ${actualSteps.length}: ${JSON.stringify(actualSteps)}`
    );
  }

  for (let i = 0; i < expectedSteps.length; i++) {
    if (actualSteps[i] !== expectedSteps[i]) {
      throw new Error(
        `Expected step ${i} to be "${expectedSteps[i]}" but got "${actualSteps[i]}"`
      );
    }
  }
}

/**
 * Find first trace step matching the given type.
 *
 * @param trace - Execution trace
 * @param type - Step type to find
 * @returns Matching step or undefined
 *
 * @example
 * ```typescript
 * const llmStep = findTraceStepByType(trace, 'llm');
 * if (llmStep) {
 *   console.log('LLM step:', llmStep);
 * }
 * ```
 */
export function findTraceStepByType(trace: ExecutionTrace, type: string): TraceStep | undefined {
  return trace.steps.find((step) => step.type === type);
}

/**
 * Count trace steps of a specific type.
 *
 * @param trace - Execution trace
 * @param type - Step type to count
 * @returns Number of matching steps
 *
 * @example
 * ```typescript
 * const llmCallCount = countTraceStepsByType(trace, 'llm');
 * console.log(`Made ${llmCallCount} LLM calls`);
 * ```
 */
export function countTraceStepsByType(trace: ExecutionTrace, type: string): number {
  return trace.steps.filter((step) => step.type === type).length;
}
