import type {
  Guardrail,
  GuardrailContext,
  GuardrailResult,
  GuardrailViolation,
  GuardrailSeverity,
} from '@stratix/core';

/**
 * Configuration for PII detection
 * @category AI Agents
 */
export interface PIIGuardrailConfig {
  /**
   * Types of PII to detect
   */
  readonly detectTypes?: Array<
    | 'ssn'
    | 'email'
    | 'phone'
    | 'credit_card'
    | 'ip_address'
    | 'passport'
    | 'driver_license'
  >;

  /**
   * Severity level for PII violations
   */
  readonly severity?: GuardrailSeverity;

  /**
   * Whether to enable this guardrail
   */
  readonly enabled?: boolean;
}

/**
 * Guardrail that detects personally identifiable information (PII).
 *
 * Detects common PII patterns including:
 * - Social Security Numbers (SSN)
 * - Email addresses
 * - Phone numbers
 * - Credit card numbers
 * - IP addresses
 * - Passport numbers
 * - Driver's license numbers
 *
 * @example
 * ```typescript
 * const piiGuardrail = new PIIGuardrail({
 *   detectTypes: ['ssn', 'email', 'credit_card'],
 *   severity: GuardrailSeverity.ERROR,
 * });
 *
 * const result = await piiGuardrail.evaluate({
 *   content: 'My email is john@example.com and SSN is 123-45-6789',
 *   contentType: 'input',
 * });
 *
 * console.log(result.passed); // false
 * console.log(result.violations?.length); // 2
 * ```
 */
export class PIIGuardrail implements Guardrail {
  readonly name = 'pii-detection';
  readonly description = 'Detects personally identifiable information in content';
  readonly enabled: boolean;

  private readonly detectTypes: Set<string>;
  private readonly severity: GuardrailSeverity;

  // PII detection patterns
  private readonly patterns = {
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone: /\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
    credit_card: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    ip_address: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    passport: /\b[A-Z]{1,2}\d{6,9}\b/g,
    driver_license: /\b[A-Z]\d{7,8}\b/g,
  };

  constructor(config: PIIGuardrailConfig = {}) {
    this.detectTypes = new Set(
      config.detectTypes || ['ssn', 'email', 'phone', 'credit_card']
    );
    this.severity = config.severity || ('error' as GuardrailSeverity);
    this.enabled = config.enabled ?? true;
  }

  async evaluate(context: GuardrailContext): Promise<GuardrailResult> {
    const violations: GuardrailViolation[] = [];

    // Check each enabled PII type
    for (const type of this.detectTypes) {
      const pattern = this.patterns[type as keyof typeof this.patterns];

      if (!pattern) continue;

      const matches = [...context.content.matchAll(pattern)];

      for (const match of matches) {
        violations.push({
          type: `pii:${type}`,
          description: `Potential ${type.replace('_', ' ')} detected`,
          location: {
            start: match.index || 0,
            end: (match.index || 0) + match[0].length,
          },
          severity: this.severity,
          confidence: this.calculateConfidence(type, match[0]),
        });
      }
    }

    if (violations.length > 0) {
      return {
        passed: false,
        severity: this.severity,
        reason: `Detected ${violations.length} potential PII violation(s)`,
        violations,
        remediation: 'Remove or redact personally identifiable information before proceeding',
        metadata: {
          piiTypes: [...new Set(violations.map((v) => v.type))],
        },
      };
    }

    return { passed: true };
  }

  /**
   * Calculate confidence score for PII detection
   */
  private calculateConfidence(type: string, value: string): number {
    switch (type) {
      case 'ssn':
        // SSN has very specific format, high confidence
        return 0.95;

      case 'email':
        // Email is well-defined, high confidence
        return 0.9;

      case 'credit_card':
        // Could validate Luhn algorithm for higher confidence
        return this.validateLuhn(value.replace(/[\s-]/g, '')) ? 0.95 : 0.7;

      case 'phone':
        // Phone numbers vary widely, medium confidence
        return 0.75;

      case 'ip_address':
        // Common pattern but could be false positive
        return 0.6;

      case 'passport':
      case 'driver_license':
        // Varies by country, lower confidence
        return 0.6;

      default:
        return 0.5;
    }
  }

  /**
   * Validate credit card using Luhn algorithm
   */
  private validateLuhn(cardNumber: string): boolean {
    if (!/^\d+$/.test(cardNumber)) return false;

    let sum = 0;
    let isEven = false;

    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }
}
