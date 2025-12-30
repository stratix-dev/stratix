import type { Tool, AgentToolResult as ToolResult, ToolContext } from '@stratix/core/ai-agents';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Result of a tool test execution.
 *
 * @template TResult - The tool result type
 */
export interface ToolTestResult<TResult> {
  /**
   * The tool execution result.
   */
  readonly result: ToolResult<TResult>;

  /**
   * Execution duration in milliseconds.
   */
  readonly duration: number;

  /**
   * Any error that occurred during execution.
   */
  readonly error?: Error;
}

// ============================================================================
// ToolTester Class
// ============================================================================

/**
 * Test harness for AI agent tools.
 *
 * Provides utilities for testing tools in isolation:
 * - Execute with test context
 * - Validate parameters
 * - Assert results
 * - Inspect schema
 *
 * @template TParams - Tool parameter type
 * @template TResult - Tool result type
 *
 * @example
 * ```typescript
 * describe('WeatherTool', () => {
 *   let tester: ToolTester<{ location: string }, { temperature: number }>;
 *
 *   beforeEach(() => {
 *     const tool = new WeatherTool();
 *     tester = new ToolTester(tool);
 *   });
 *
 *   it('should return weather data', async () => {
 *     const { result, duration } = await tester.execute({
 *       location: 'San Francisco'
 *     });
 *
 *     expectToolSuccess(result);
 *     expect(result.data.temperature).toBeGreaterThan(0);
 *     expect(duration).toBeLessThan(1000);
 *   });
 *
 *   it('should validate required parameters', () => {
 *     tester.expectInvalidParams({});
 *     tester.expectValidParams({ location: 'NYC' });
 *   });
 * });
 * ```
 */
export class ToolTester<TParams = unknown, TResult = unknown> {
  private defaultContext: ToolContext;

  /**
   * Create a new ToolTester.
   *
   * @param tool - The tool to test
   * @param defaultContext - Optional default context for executions
   */
  constructor(
    private readonly tool: Tool<TParams, TResult>,
    defaultContext?: Partial<ToolContext>
  ) {
    this.defaultContext = {
      sessionId: defaultContext?.sessionId || `test-session-${Date.now()}`,
      userId: defaultContext?.userId,
      metadata: defaultContext?.metadata,
    };
  }

  // === Execution Methods ===

  /**
   * Execute the tool with given parameters.
   *
   * @param params - Tool parameters
   * @param context - Optional context overrides
   * @returns Test result with execution data
   *
   * @example
   * ```typescript
   * const { result, duration } = await tester.execute({ location: 'NYC' });
   * ```
   */
  async execute(
    params: TParams,
    context?: Partial<ToolContext>
  ): Promise<ToolTestResult<TResult>> {
    const startTime = Date.now();
    const execContext: ToolContext = {
      ...this.defaultContext,
      ...context,
      sessionId: context?.sessionId || this.defaultContext.sessionId,
    };

    try {
      const result = await this.tool.execute(params, execContext);
      const duration = Date.now() - startTime;

      return {
        result,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        result: {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        duration,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Execute the tool with automatic validation.
   *
   * @param params - Tool parameters (may be invalid)
   * @param context - Optional context overrides
   * @returns Test result
   *
   * @example
   * ```typescript
   * const { result } = await tester.executeValidated({ invalid: 'params' });
   * expectToolFailure(result);
   * ```
   */
  async executeValidated(
    params: unknown,
    context?: Partial<ToolContext>
  ): Promise<ToolTestResult<TResult>> {
    const startTime = Date.now();
    const execContext: ToolContext = {
      ...this.defaultContext,
      ...context,
      sessionId: context?.sessionId || this.defaultContext.sessionId,
    };

    try {
      const result = await this.tool.executeValidated(params, execContext);
      const duration = Date.now() - startTime;

      return {
        result,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        result: {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        duration,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  // === Validation Methods ===

  /**
   * Validate parameters against tool schema.
   *
   * @param params - Parameters to validate
   * @returns Validation errors (empty if valid)
   *
   * @example
   * ```typescript
   * const errors = tester.validateParams({ location: 'NYC' });
   * expect(errors).toHaveLength(0);
   * ```
   */
  validateParams(params: unknown): string[] {
    return this.tool.validate(params);
  }

  /**
   * Check if parameters are valid.
   *
   * @param params - Parameters to check
   * @returns true if valid
   *
   * @example
   * ```typescript
   * expect(tester.isValidParams({ location: 'NYC' })).toBe(true);
   * ```
   */
  isValidParams(params: unknown): boolean {
    return this.tool.isValid(params);
  }

  /**
   * Assert that parameters are valid.
   * Throws if validation fails.
   *
   * @param params - Parameters to validate
   * @throws {Error} If parameters are invalid
   *
   * @example
   * ```typescript
   * tester.expectValidParams({ location: 'NYC' });
   * ```
   */
  expectValidParams(params: TParams): void {
    const errors = this.validateParams(params);
    if (errors.length > 0) {
      throw new Error(`Expected valid parameters but got validation errors: ${errors.join(', ')}`);
    }
  }

  /**
   * Assert that parameters are invalid.
   * Throws if validation passes.
   *
   * @param params - Parameters to validate
   * @throws {Error} If parameters are valid
   *
   * @example
   * ```typescript
   * tester.expectInvalidParams({});
   * ```
   */
  expectInvalidParams(params: unknown): void {
    const errors = this.validateParams(params);
    if (errors.length === 0) {
      throw new Error('Expected invalid parameters but validation passed');
    }
  }

  // === Schema Inspection ===

  /**
   * Get the tool's parameter schema.
   *
   * @returns Parameter schema object
   *
   * @example
   * ```typescript
   * const schema = tester.getParameterSchema();
   * expect(schema.required).toContain('location');
   * ```
   */
  getParameterSchema(): {
    readonly type: 'object';
    readonly properties: Record<string, unknown>;
    readonly required?: readonly string[];
    readonly additionalProperties?: boolean;
  } {
    return this.tool.parameters;
  }

  /**
   * Assert that a parameter property exists in schema.
   *
   * @param property - Property name
   * @param type - Expected JSON schema type
   * @throws {Error} If property doesn't exist or type doesn't match
   *
   * @example
   * ```typescript
   * tester.expectParameterProperty('location', 'string');
   * ```
   */
  expectParameterProperty(property: string, type: string): void {
    const schema = this.getParameterSchema();

    if (!(property in schema.properties)) {
      throw new Error(`Expected parameter property '${property}' in schema but it doesn't exist`);
    }

    const propertyDef = schema.properties[property] as { type?: string };
    if (propertyDef.type !== type) {
      throw new Error(
        `Expected parameter '${property}' to have type '${type}' but got '${propertyDef.type}'`
      );
    }
  }

  /**
   * Assert that a parameter is required.
   *
   * @param property - Property name
   * @throws {Error} If parameter is not required
   *
   * @example
   * ```typescript
   * tester.expectRequiredParameter('location');
   * ```
   */
  expectRequiredParameter(property: string): void {
    const schema = this.getParameterSchema();

    if (!schema.required || !schema.required.includes(property)) {
      throw new Error(
        `Expected parameter '${property}' to be required but it's not in the required array`
      );
    }
  }

  /**
   * Get the tool's definition for LLM function calling.
   *
   * @returns Tool definition
   */
  getDefinition() {
    return this.tool.getDefinition();
  }

  /**
   * Get the tool name.
   */
  get name(): string {
    return this.tool.name;
  }

  /**
   * Get the tool description.
   */
  get description(): string {
    return this.tool.description;
  }
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that a tool result is successful.
 *
 * @param result - Tool result to check
 * @throws {Error} If result is not successful
 *
 * @example
 * ```typescript
 * const { result } = await tester.execute(params);
 * expectToolSuccess(result);
 * expect(result.data.temperature).toBeGreaterThan(0);
 * ```
 */
export function expectToolSuccess<T>(
  result: ToolResult<T>
): asserts result is { success: true; data: T } {
  if (!result.success) {
    throw new Error(`Expected tool success but got failure: ${result.error}`);
  }
}

/**
 * Assert that a tool result is a failure.
 *
 * @param result - Tool result to check
 * @throws {Error} If result is successful
 *
 * @example
 * ```typescript
 * const { result } = await tester.execute(invalidParams);
 * expectToolFailure(result);
 * expect(result.error).toContain('validation');
 * ```
 */
export function expectToolFailure(
  result: ToolResult<unknown>
): asserts result is { success: false; error: string } {
  if (result.success) {
    throw new Error('Expected tool failure but got success');
  }
}

/**
 * Assert that a tool result data matches expected value.
 *
 * @param result - Tool result to check
 * @param expected - Expected data value
 * @throws {Error} If result is failure or data doesn't match
 *
 * @example
 * ```typescript
 * const { result } = await tester.execute(params);
 * expectToolData(result, { temperature: 72 });
 * ```
 */
export function expectToolData<T>(result: ToolResult<T>, expected: T): void {
  expectToolSuccess(result);

  const actual = JSON.stringify(result.data);
  const expectedStr = JSON.stringify(expected);

  if (actual !== expectedStr) {
    throw new Error(`Expected tool data ${expectedStr} but got ${actual}`);
  }
}

/**
 * Assert that a tool result error message matches.
 *
 * @param result - Tool result to check
 * @param errorMatch - Error string or regex to match
 * @throws {Error} If result is success or error doesn't match
 *
 * @example
 * ```typescript
 * const { result } = await tester.execute(invalidParams);
 * expectToolError(result, /required parameter/i);
 * ```
 */
export function expectToolError(
  result: ToolResult<unknown>,
  errorMatch: string | RegExp
): void {
  expectToolFailure(result);

  const matches =
    typeof errorMatch === 'string'
      ? result.error.includes(errorMatch)
      : errorMatch.test(result.error);

  if (!matches) {
    throw new Error(
      `Expected tool error to match ${errorMatch.toString()} but got: ${result.error}`
    );
  }
}

/**
 * Assert that tool execution completed within time limit.
 *
 * @param testResult - Tool test result
 * @param maxMs - Maximum allowed duration in milliseconds
 * @throws {Error} If duration exceeds limit
 *
 * @example
 * ```typescript
 * const testResult = await tester.execute(params);
 * expectToolDuration(testResult, 1000); // Max 1 second
 * ```
 */
export function expectToolDuration<T>(testResult: ToolTestResult<T>, maxMs: number): void {
  if (testResult.duration > maxMs) {
    throw new Error(
      `Expected tool execution <= ${maxMs}ms but took ${testResult.duration}ms`
    );
  }
}

// ============================================================================
// Factory Helpers
// ============================================================================

/**
 * Create a test context for tool execution.
 *
 * @param overrides - Optional context overrides
 * @returns Tool context
 *
 * @example
 * ```typescript
 * const context = createToolContext({
 *   userId: 'test-user-123',
 *   metadata: { env: 'test' }
 * });
 * ```
 */
export function createToolContext(overrides?: Partial<ToolContext>): ToolContext {
  return {
    sessionId: overrides?.sessionId || `test-session-${Date.now()}`,
    userId: overrides?.userId,
    metadata: overrides?.metadata,
  };
}
