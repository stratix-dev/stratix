import type { GuardrailSeverity } from './GuardrailSeverity.js';
import { GuardrailSeverityHelpers } from './GuardrailSeverity.js';

/**
 * Result of a guardrail check.
 */
export interface GuardrailResult {
  /**
   * Whether the check passed.
   */
  readonly passed: boolean;

  /**
   * Severity level of the violation (if failed).
   */
  readonly severity?: GuardrailSeverity;

  /**
   * Human-readable message describing the result.
   */
  readonly message: string;

  /**
   * Optional details about the violation.
   */
  readonly details?: Readonly<Record<string, unknown>>;

  /**
   * Guardrail name that produced this result.
   */
  readonly guardrailName: string;

  /**
   * Timestamp when check was performed.
   */
  readonly timestamp: Date;
}

/**
 * Helper functions for working with guardrail results.
 */
export const GuardrailResultHelpers = {
  /**
   * Create a passing result.
   *
   * @param guardrailName - Name of the guardrail
   * @param message - Optional message
   * @returns Passing result
   *
   * @example
   * ```TypeScript
   * const result = GuardrailResultHelpers.pass('content-policy', 'Content is safe');
   * ```
   */
  pass(guardrailName: string, message = 'Check passed'): GuardrailResult {
    return {
      passed: true,
      message,
      guardrailName,
      timestamp: new Date()
    };
  },

  /**
   * Create a failing result.
   *
   * @param guardrailName - Name of the guardrail
   * @param severity - Severity level
   * @param message - Description of the violation
   * @param details - Optional details
   * @returns Failing result
   *
   * @example
   * ```TypeScript
   * const result = GuardrailResultHelpers.fail(
   *   'content-policy',
   *   GuardrailSeverity.ERROR,
   *   'Detected inappropriate content',
   *   { category: 'violence' }
   * );
   * ```
   */
  fail(
    guardrailName: string,
    severity: GuardrailSeverity,
    message: string,
    details?: Record<string, unknown>
  ): GuardrailResult {
    return {
      passed: false,
      severity,
      message,
      details,
      guardrailName,
      timestamp: new Date()
    };
  },

  /**
   * Check if result indicates a blocking violation.
   *
   * @param result - The guardrail result
   * @returns True if execution should be blocked
   */
  shouldBlock(result: GuardrailResult): boolean {
    if (result.passed) return false;
    if (!result.severity) return false;

    return GuardrailSeverityHelpers.shouldBlock(result.severity);
  },

  /**
   * Combine multiple results into a summary.
   *
   * @param results - Array of results
   * @returns Combined result
   */
  combine(results: readonly GuardrailResult[]): {
    allPassed: boolean;
    shouldBlock: boolean;
    violations: readonly GuardrailResult[];
    summary: string;
  } {
    const violations = results.filter((r) => !r.passed);
    const allPassed = violations.length === 0;
    const shouldBlock = violations.some((r) => this.shouldBlock(r));

    const summary = allPassed
      ? `All ${results.length} guardrails passed`
      : `${violations.length} of ${results.length} guardrails failed`;

    return {
      allPassed,
      shouldBlock,
      violations,
      summary
    };
  }
};
