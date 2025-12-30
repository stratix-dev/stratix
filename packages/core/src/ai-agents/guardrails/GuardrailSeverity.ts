/**
 * Severity level for guardrail violations.
 */
export enum GuardrailSeverity {
  /**
   * Informational - no action needed.
   * Log the violation but allow execution to continue.
   */
  INFO = 'info',

  /**
   * Warning - potential issue.
   * Log the violation and optionally alert, but allow execution.
   */
  WARNING = 'warning',

  /**
   * Error - policy violation.
   * Log the violation and potentially block execution.
   */
  ERROR = 'error',

  /**
   * Critical - serious violation.
   * Log the violation and block execution.
   */
  CRITICAL = 'critical',
}

/**
 * Helper functions for working with guardrail severity.
 */
export const GuardrailSeverityHelpers = {
  /**
   * Get numeric severity level for comparison.
   *
   * @param severity - The severity level
   * @returns Numeric level (higher = more severe)
   */
  getLevel(severity: GuardrailSeverity): number {
    switch (severity) {
      case GuardrailSeverity.INFO:
        return 0;
      case GuardrailSeverity.WARNING:
        return 1;
      case GuardrailSeverity.ERROR:
        return 2;
      case GuardrailSeverity.CRITICAL:
        return 3;
    }
  },

  /**
   * Check if severity should block execution.
   *
   * @param severity - The severity level
   * @returns True if execution should be blocked
   */
  shouldBlock(severity: GuardrailSeverity): boolean {
    return (
      severity === GuardrailSeverity.ERROR ||
      severity === GuardrailSeverity.CRITICAL
    );
  },

  /**
   * Compare two severity levels.
   *
   * @param a - First severity
   * @param b - Second severity
   * @returns -1 if a < b, 0 if equal, 1 if a > b
   */
  compare(a: GuardrailSeverity, b: GuardrailSeverity): number {
    const levelA = this.getLevel(a);
    const levelB = this.getLevel(b);

    if (levelA < levelB) return -1;
    if (levelA > levelB) return 1;
    return 0;
  },

  /**
   * Get the most severe of multiple severities.
   *
   * @param severities - Array of severities
   * @returns Most severe level
   */
  max(severities: readonly GuardrailSeverity[]): GuardrailSeverity {
    if (severities.length === 0) {
      return GuardrailSeverity.INFO;
    }

    return severities.reduce((max, current) =>
      this.compare(current, max) > 0 ? current : max
    );
  },
};
