import type {
  Guardrail,
  GuardrailContext,
  GuardrailResult,
  GuardrailSeverity,
} from '@stratix/core';

/**
 * Configuration for content length validation
 */
export interface ContentLengthGuardrailConfig {
  /**
   * Minimum content length in characters
   */
  readonly minLength?: number;

  /**
   * Maximum content length in characters
   */
  readonly maxLength?: number;

  /**
   * Minimum word count
   */
  readonly minWords?: number;

  /**
   * Maximum word count
   */
  readonly maxWords?: number;

  /**
   * Severity level for length violations
   */
  readonly severity?: GuardrailSeverity;

  /**
   * Whether to enable this guardrail
   */
  readonly enabled?: boolean;
}

/**
 * Guardrail that validates content length constraints.
 *
 * Validates both character count and word count to ensure content
 * meets size requirements. Useful for preventing:
 * - Excessively long inputs that waste tokens
 * - Empty or trivial inputs
 * - DOS attacks via extremely long content
 *
 * @example
 * ```typescript
 * const lengthGuardrail = new ContentLengthGuardrail({
 *   minLength: 10,
 *   maxLength: 5000,
 *   minWords: 2,
 *   maxWords: 1000,
 *   severity: GuardrailSeverity.WARNING,
 * });
 *
 * const result = await lengthGuardrail.evaluate({
 *   content: 'A'.repeat(10000),
 *   contentType: 'input',
 * });
 *
 * console.log(result.passed); // false (exceeds maxLength)
 * ```
 */
export class ContentLengthGuardrail implements Guardrail {
  readonly name = 'content-length';
  readonly description = 'Validates content length constraints';
  readonly enabled: boolean;

  private readonly minLength: number | null;
  private readonly maxLength: number | null;
  private readonly minWords: number | null;
  private readonly maxWords: number | null;
  private readonly severity: GuardrailSeverity;

  constructor(config: ContentLengthGuardrailConfig = {}) {
    this.minLength = config.minLength ?? null;
    this.maxLength = config.maxLength ?? null;
    this.minWords = config.minWords ?? null;
    this.maxWords = config.maxWords ?? null;
    this.severity = config.severity || ('warning' as GuardrailSeverity);
    this.enabled = config.enabled ?? true;

    // Validation
    if (this.minLength !== null && this.maxLength !== null) {
      if (this.minLength > this.maxLength) {
        throw new Error('minLength cannot be greater than maxLength');
      }
    }

    if (this.minWords !== null && this.maxWords !== null) {
      if (this.minWords > this.maxWords) {
        throw new Error('minWords cannot be greater than maxWords');
      }
    }
  }

  evaluate(context: GuardrailContext): Promise<GuardrailResult> {
    const charCount = context.content.length;
    const wordCount = this.countWords(context.content);

    const violations: Array<{
      type: string;
      description: string;
      severity: GuardrailSeverity;
    }> = [];

    // Check minimum character length
    if (this.minLength !== null && charCount < this.minLength) {
      violations.push({
        type: 'length:min_chars',
        description: `Content is too short: ${charCount} characters (minimum: ${this.minLength})`,
        severity: this.severity,
      });
    }

    // Check maximum character length
    if (this.maxLength !== null && charCount > this.maxLength) {
      violations.push({
        type: 'length:max_chars',
        description: `Content is too long: ${charCount} characters (maximum: ${this.maxLength})`,
        severity: this.severity,
      });
    }

    // Check minimum word count
    if (this.minWords !== null && wordCount < this.minWords) {
      violations.push({
        type: 'length:min_words',
        description: `Content has too few words: ${wordCount} words (minimum: ${this.minWords})`,
        severity: this.severity,
      });
    }

    // Check maximum word count
    if (this.maxWords !== null && wordCount > this.maxWords) {
      violations.push({
        type: 'length:max_words',
        description: `Content has too many words: ${wordCount} words (maximum: ${this.maxWords})`,
        severity: this.severity,
      });
    }

    if (violations.length > 0) {
      const reasons = violations.map((v) => v.description);

      return Promise.resolve({
        passed: false,
        severity: this.severity,
        reason: reasons.join('; '),
        violations,
        remediation: this.getRemediation(violations),
        metadata: {
          charCount,
          wordCount,
          limits: {
            minLength: this.minLength,
            maxLength: this.maxLength,
            minWords: this.minWords,
            maxWords: this.maxWords,
          },
        },
      });
    }

    return Promise.resolve({
      passed: true,
      metadata: {
        charCount,
        wordCount,
        limits: {
          minLength: this.minLength,
          maxLength: this.maxLength,
          minWords: this.minWords,
          maxWords: this.maxWords,
        },
      },
    });
  }

  /**
   * Count words in content
   */
  private countWords(content: string): number {
    // Split on whitespace and filter empty strings
    const words = content.trim().split(/\s+/).filter((word) => word.length > 0);
    return words.length;
  }

  /**
   * Generate remediation message based on violations
   */
  private getRemediation(violations: Array<{ type: string }>): string {
    const hasMinViolation = violations.some((v) =>
      v.type.startsWith('length:min_')
    );
    const hasMaxViolation = violations.some((v) =>
      v.type.startsWith('length:max_')
    );

    if (hasMinViolation && hasMaxViolation) {
      return 'Adjust content length to be within allowed range';
    } else if (hasMinViolation) {
      return 'Expand content to meet minimum length requirements';
    } else {
      return 'Shorten content to meet maximum length requirements';
    }
  }
}
