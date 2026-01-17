import type { GuardrailResult } from './GuardrailResult.js';
import type { GuardrailSeverity } from './GuardrailSeverity.js';
import { GuardrailResultHelpers } from './GuardrailResult.js';

/**
 * Context for guardrail checks.
 *
 * Provides information about what is being checked.
 */
export interface GuardrailContext {
  /**
   * Type of content being checked.
   *
   * Examples: 'input', 'output', 'tool_call', 'memory'
   */
  readonly type: string;

  /**
   * Session or user identifier.
   */
  readonly sessionId?: string;

  /**
   * Additional context metadata.
   */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Base interface for all guardrails.
 *
 * Guardrails validate content for safety, compliance, and policy enforcement.
 *
 * Common guardrail types:
 * - Content moderation (detect harmful content)
 * - PII detection (prevent data leaks)
 * - Prompt injection detection
 * - Rate limiting
 * - Cost limits
 * - Topic restrictions
 *
 * @example
 * ```typescript
 * class ProfanityGuardrail extends Guardrail<string> {
 *   get name() { return 'profanity-filter'; }
 *   get severity() { return GuardrailSeverity.WARNING; }
 *
 *   async check(content: string): Promise<GuardrailResult> {
 *     if (this.containsProfanity(content)) {
 *       return this.fail('Profanity detected');
 *     }
 *     return this.pass();
 *   }
 * }
 * ```
 */
export abstract class Guardrail<T = unknown> {
  /**
   * Guardrail name (unique identifier).
   */
  abstract get name(): string;

  /**
   * Severity level for violations.
   */
  abstract get severity(): GuardrailSeverity;

  /**
   * Optional description of what this guardrail checks.
   */
  get description(): string | undefined {
    return undefined;
  }

  /**
   * Check content against this guardrail.
   *
   * @param content - Content to check
   * @param context - Optional check context
   * @returns Promise resolving to check result
   */
  abstract check(content: T, context?: GuardrailContext): Promise<GuardrailResult>;

  /**
   * Create a passing result.
   *
   * @param message - Optional message
   * @returns Passing result
   */
  protected pass(message?: string): GuardrailResult {
    return GuardrailResultHelpers.pass(this.name, message ?? `${this.name} passed`);
  }

  /**
   * Create a failing result.
   *
   * @param message - Description of the violation
   * @param details - Optional details
   * @returns Failing result
   */
  protected fail(message: string, details?: Record<string, unknown>): GuardrailResult {
    return GuardrailResultHelpers.fail(this.name, this.severity, message, details);
  }
}

/**
 * Simple text length guardrail.
 *
 * Ensures text doesn't exceed a maximum length.
 *
 * @example
 * ```typescript
 * const guardrail = new TextLengthGuardrail(1000, GuardrailSeverity.ERROR);
 * const result = await guardrail.check('Some text...');
 * ```
 */
export class TextLengthGuardrail extends Guardrail<string> {
  constructor(
    private readonly maxLength: number,
    private readonly _severity: GuardrailSeverity
  ) {
    super();
  }

  get name(): string {
    return 'text-length';
  }

  get severity(): GuardrailSeverity {
    return this._severity;
  }

  get description(): string {
    return `Ensures text does not exceed ${this.maxLength} characters`;
  }

  async check(content: string): Promise<GuardrailResult> {
    if (content.length > this.maxLength) {
      return Promise.resolve(
        this.fail(`Text exceeds maximum length of ${this.maxLength} characters`, {
          length: content.length,
          maxLength: this.maxLength,
          excess: content.length - this.maxLength
        })
      );
    }

    return Promise.resolve(this.pass());
  }
}

/**
 * Pattern matching guardrail.
 *
 * Detects patterns using regular expressions.
 *
 * @example
 * ```typescript
 * const emailGuardrail = new PatternGuardrail(
 *   'email-detector',
 *   /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
 *   GuardrailSeverity.WARNING,
 *   'Email address detected'
 * );
 * ```
 */
export class PatternGuardrail extends Guardrail<string> {
  constructor(
    private readonly _name: string,
    private readonly pattern: RegExp,
    private readonly _severity: GuardrailSeverity,
    private readonly violationMessage: string
  ) {
    super();
  }

  get name(): string {
    return this._name;
  }

  get severity(): GuardrailSeverity {
    return this._severity;
  }

  async check(content: string): Promise<GuardrailResult> {
    const matches = content.match(this.pattern);

    if (matches && matches.length > 0) {
      return Promise.resolve(
        this.fail(this.violationMessage, {
          matches: matches.length,
          examples: matches.slice(0, 3) // Show first 3 matches
        })
      );
    }

    return Promise.resolve(this.pass());
  }
}
