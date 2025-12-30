import {
  Guardrail,
  type GuardrailContext,
  type GuardrailResult,
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
export class ContentLengthGuardrail extends Guardrail<string> {
  readonly enabled: boolean;

  private readonly minLength: number | null;
  private readonly maxLength: number | null;
  private readonly minWords: number | null;
  private readonly maxWords: number | null;
  private readonly guardrailSeverity: GuardrailSeverity;

  get name(): string {
    return 'content-length';
  }

  get severity(): GuardrailSeverity {
    return this.guardrailSeverity;
  }

  get description(): string {
    const parts: string[] = ['Validates content length constraints'];

    if (this.minLength !== null) {
      parts.push(`min ${this.minLength} chars`);
    }
    if (this.maxLength !== null) {
      parts.push(`max ${this.maxLength} chars`);
    }
    if (this.minWords !== null) {
      parts.push(`min ${this.minWords} words`);
    }
    if (this.maxWords !== null) {
      parts.push(`max ${this.maxWords} words`);
    }

    return parts.length > 1 ? `${parts[0]} (${parts.slice(1).join(', ')})` : parts[0];
  }

  constructor(config: ContentLengthGuardrailConfig = {}) {
    super();
    this.minLength = config.minLength ?? null;
    this.maxLength = config.maxLength ?? null;
    this.minWords = config.minWords ?? null;
    this.maxWords = config.maxWords ?? null;
    this.guardrailSeverity = config.severity || GuardrailSeverity.WARNING;
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

  check(content: string, _context?: GuardrailContext): Promise<GuardrailResult> {
    const charCount = content.length;
    const wordCount = this.countWords(content);

    const reasons: string[] = [];

    // Check minimum character length
    if (this.minLength !== null && charCount < this.minLength) {
      reasons.push(`Content is too short: ${charCount} characters (minimum: ${this.minLength})`);
    }

    // Check maximum character length
    if (this.maxLength !== null && charCount > this.maxLength) {
      reasons.push(`Content is too long: ${charCount} characters (maximum: ${this.maxLength})`);
    }

    // Check minimum word count
    if (this.minWords !== null && wordCount < this.minWords) {
      reasons.push(`Content has too few words: ${wordCount} words (minimum: ${this.minWords})`);
    }

    // Check maximum word count
    if (this.maxWords !== null && wordCount > this.maxWords) {
      reasons.push(`Content has too many words: ${wordCount} words (maximum: ${this.maxWords})`);
    }

    const details = {
      charCount,
      wordCount,
      limits: {
        minLength: this.minLength,
        maxLength: this.maxLength,
        minWords: this.minWords,
        maxWords: this.maxWords,
      },
    };

    if (reasons.length > 0) {
      return Promise.resolve(
        this.fail(reasons.join('; '), {
          ...details,
          violations: reasons.map((reason) => ({
            type: 'length_violation',
            message: reason,
          })),
        })
      );
    }

    const passResult = this.pass('Content length is within acceptable limits');
    return Promise.resolve({
      ...passResult,
      details,
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
}
