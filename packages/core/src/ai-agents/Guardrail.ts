/**
 * Severity level for guardrail violations
 * @category AI Agents
 */
export enum GuardrailSeverity {
  /**
   * Informational - log but allow
   */
  INFO = 'info',

  /**
   * Warning - flag but allow
   */
  WARNING = 'warning',

  /**
   * Error - block the request
   */
  ERROR = 'error',

  /**
   * Critical - block and escalate
   */
  CRITICAL = 'critical',
}

/**
 * Result of guardrail evaluation
 */
export interface GuardrailResult {
  /**
   * Whether the content passed the guardrail
   */
  readonly passed: boolean;

  /**
   * Severity level if failed
   */
  readonly severity?: GuardrailSeverity;

  /**
   * Reason for failure
   */
  readonly reason?: string;

  /**
   * Detailed violations found
   */
  readonly violations?: GuardrailViolation[];

  /**
   * Suggested remediation
   */
  readonly remediation?: string;

  /**
   * Metadata about the evaluation
   */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Individual violation detected by a guardrail
 */
export interface GuardrailViolation {
  /**
   * Type of violation
   */
  readonly type: string;

  /**
   * Description of the violation
   */
  readonly description: string;

  /**
   * Location in the content (character offset or line number)
   */
  readonly location?: {
    readonly start: number;
    readonly end: number;
  };

  /**
   * Severity of this specific violation
   */
  readonly severity: GuardrailSeverity;

  /**
   * Confidence score (0-1)
   */
  readonly confidence?: number;
}

/**
 * Context for guardrail evaluation
 */
export interface GuardrailContext {
  /**
   * The content being evaluated
   */
  readonly content: string;

  /**
   * Type of content (input, output, system)
   */
  readonly contentType: 'input' | 'output' | 'system';

  /**
   * User ID if available
   */
  readonly userId?: string;

  /**
   * Session ID if available
   */
  readonly sessionId?: string;

  /**
   * Additional metadata
   */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Base interface for guardrails.
 *
 * Guardrails protect AI agents by validating inputs and outputs
 * against safety, privacy, and policy constraints.
 *
 * @example
 * ```typescript
 * class PIIGuardrail implements Guardrail {
 *   readonly name = 'pii-detection';
 *   readonly description = 'Detects personally identifiable information';
 *
 *   async evaluate(context: GuardrailContext): Promise<GuardrailResult> {
 *     const violations = this.detectPII(context.content);
 *
 *     if (violations.length > 0) {
 *       return {
 *         passed: false,
 *         severity: GuardrailSeverity.ERROR,
 *         reason: 'PII detected in content',
 *         violations,
 *       };
 *     }
 *
 *     return { passed: true };
 *   }
 * }
 * ```
 */
export interface Guardrail {
  /**
   * Unique name of the guardrail
   */
  readonly name: string;

  /**
   * Human-readable description
   */
  readonly description: string;

  /**
   * Whether this guardrail is enabled
   */
  readonly enabled: boolean;

  /**
   * Evaluate content against this guardrail
   *
   * @param context - Evaluation context
   * @returns Result of the evaluation
   */
  evaluate(context: GuardrailContext): Promise<GuardrailResult>;
}

/**
 * Configuration for guardrail chain
 */
export interface GuardrailChainConfig {
  /**
   * List of guardrails to execute
   */
  readonly guardrails: Guardrail[];

  /**
   * Whether to stop on first failure
   */
  readonly stopOnFirstFailure?: boolean;

  /**
   * Whether to run guardrails in parallel
   */
  readonly parallel?: boolean;

  /**
   * Callback when a guardrail fails
   */
  readonly onViolation?: (result: GuardrailResult, guardrail: Guardrail) => void | Promise<void>;
}

/**
 * Result of executing a guardrail chain
 */
export interface GuardrailChainResult {
  /**
   * Whether all guardrails passed
   */
  readonly passed: boolean;

  /**
   * Results from each guardrail
   */
  readonly results: Array<{
    readonly guardrail: string;
    readonly result: GuardrailResult;
  }>;

  /**
   * Highest severity level found
   */
  readonly highestSeverity?: GuardrailSeverity;

  /**
   * Total violations across all guardrails
   */
  readonly totalViolations: number;

  /**
   * Execution time in milliseconds
   */
  readonly executionTime: number;
}

/**
 * Interface for executing multiple guardrails in sequence or parallel.
 *
 * @example
 * ```typescript
 * const chain = new GuardrailChain({
 *   guardrails: [piiGuardrail, injectionGuardrail, topicGuardrail],
 *   stopOnFirstFailure: true,
 *   parallel: false,
 * });
 *
 * const result = await chain.execute({
 *   content: userInput,
 *   contentType: 'input',
 *   userId: '123',
 * });
 *
 * if (!result.passed) {
 *   throw new Error(`Guardrail violations: ${result.totalViolations}`);
 * }
 * ```
 */
export interface GuardrailChain {
  /**
   * Configuration for this chain
   */
  readonly config: GuardrailChainConfig;

  /**
   * Execute all guardrails against content
   *
   * @param context - Evaluation context
   * @returns Aggregated result
   */
  execute(context: GuardrailContext): Promise<GuardrailChainResult>;

  /**
   * Add a guardrail to the chain
   *
   * @param guardrail - Guardrail to add
   */
  add(guardrail: Guardrail): void;

  /**
   * Remove a guardrail from the chain
   *
   * @param name - Name of guardrail to remove
   * @returns true if removed
   */
  remove(name: string): boolean;

  /**
   * Get all guardrails in the chain
   *
   * @returns Array of guardrails
   */
  list(): Guardrail[];
}
