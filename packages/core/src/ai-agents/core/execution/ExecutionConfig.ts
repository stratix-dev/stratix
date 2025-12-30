import type { RetryPolicy } from '../../shared/RetryPolicy.js';

/**
 * Configuration for agent execution.
 *
 * Controls how the ExecutionEngine handles agent execution:
 * - Timeout enforcement
 * - Retry behavior
 * - Additional metadata
 *
 * @example
 * ```typescript
 * const config: ExecutionConfig = {
 *   timeout: 30000,        // 30 seconds
 *   retry: RetryPolicies.CONSERVATIVE,
 *   metadata: {
 *     requestId: 'req-123',
 *     priority: 'high'
 *   }
 * };
 *
 * const result = await engine.execute(agent, input, context, config);
 * ```
 */
export interface ExecutionConfig {
  /**
   * Execution timeout in milliseconds.
   *
   * If the agent execution exceeds this duration, it will be
   * aborted with an AgentTimeoutError.
   *
   * @default undefined (no timeout)
   */
  readonly timeout?: number;

  /**
   * Retry policy for failed executions.
   *
   * Defines how many times to retry and with what delay.
   * Use predefined policies from RetryPolicies or create custom.
   *
   * @default undefined (no retries)
   */
  readonly retry?: RetryPolicy;

  /**
   * Additional execution metadata.
   *
   * Arbitrary key-value pairs that can be used for:
   * - Request tracking
   * - Feature flags
   * - Custom context
   *
   * This metadata is separate from ExecutionContext.metadata.
   */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Helper functions for working with execution configurations
 */
export const ExecutionConfigHelpers = {
  /**
   * Create an execution config with defaults.
   *
   * @param overrides - Optional config overrides
   * @returns ExecutionConfig
   */
  create(overrides?: Partial<ExecutionConfig>): ExecutionConfig {
    return {
      ...overrides,
    };
  },

  /**
   * Merge two execution configs.
   * Later config overrides earlier config.
   *
   * @param base - Base configuration
   * @param override - Override configuration
   * @returns Merged configuration
   */
  merge(
    base: ExecutionConfig,
    override: Partial<ExecutionConfig>
  ): ExecutionConfig {
    return {
      ...base,
      ...override,
      metadata:
        base.metadata || override.metadata
          ? {
              ...base.metadata,
              ...override.metadata,
            }
          : undefined,
    };
  },

  /**
   * Validate execution config.
   *
   * @param config - Config to validate
   * @returns Array of validation errors (empty if valid)
   */
  validate(config: ExecutionConfig): string[] {
    const errors: string[] = [];

    if (config.timeout !== undefined && config.timeout <= 0) {
      errors.push('Timeout must be positive');
    }

    if (config.timeout !== undefined && config.timeout > 600000) {
      // 10 minutes max
      errors.push('Timeout cannot exceed 10 minutes (600000ms)');
    }

    return errors;
  },

  /**
   * Check if execution config is valid.
   *
   * @param config - Config to check
   * @returns true if valid
   */
  isValid(config: ExecutionConfig): boolean {
    return this.validate(config).length === 0;
  },
};
