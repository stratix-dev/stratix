import { describe, it, expect, beforeEach } from 'vitest';
import { PIIGuardrail } from '../guardrails/PIIGuardrail.js';
import { GuardrailSeverity } from '@stratix/core/ai-agents';

describe('PIIGuardrail', () => {
  let guardrail: PIIGuardrail;

  beforeEach(() => {
    guardrail = new PIIGuardrail({
      detectTypes: ['ssn', 'email', 'phone', 'credit_card'],
      severity: GuardrailSeverity.ERROR,
    });
  });

  describe('constructor', () => {
    it('should create guardrail with default config', () => {
      const defaultGuardrail = new PIIGuardrail();
      expect(defaultGuardrail.name).toBe('pii-detection');
      expect(defaultGuardrail.severity).toBe(GuardrailSeverity.ERROR);
    });

    it('should respect custom config', () => {
      const customGuardrail = new PIIGuardrail({
        detectTypes: ['ssn'],
        severity: GuardrailSeverity.CRITICAL,
      });
      expect(customGuardrail.severity).toBe(GuardrailSeverity.CRITICAL);
    });
  });

  describe('SSN detection', () => {
    it('should detect valid SSN', async () => {
      const result = await guardrail.check('My SSN is 123-45-6789', {
        type: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.severity).toBe(GuardrailSeverity.ERROR);
      expect(result.message).toContain('PII');
      expect(result.details?.violations).toBeDefined();
    });

    it('should detect multiple SSNs', async () => {
      const result = await guardrail.check('SSNs: 123-45-6789 and 987-65-4321', {
        type: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.details?.totalMatches).toBeGreaterThanOrEqual(2);
    });

    it('should not detect invalid SSN format', async () => {
      const result = await guardrail.check('Invalid: 12-345-6789', {
        type: 'input',
      });

      expect(result.passed).toBe(true);
    });
  });

  describe('email detection', () => {
    it('should detect email addresses', async () => {
      const result = await guardrail.check('Contact me at john.doe@example.com', {
        type: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.message).toContain('email');
    });

    it('should detect multiple email formats', async () => {
      const result = await guardrail.check(
        'Emails: user@domain.com, test.user+tag@sub.domain.co.uk',
        { type: 'input' }
      );

      expect(result.passed).toBe(false);
      expect(result.details?.totalMatches).toBeGreaterThanOrEqual(1);
    });
  });

  describe('phone number detection', () => {
    it('should detect phone numbers', async () => {
      const result = await guardrail.check('Call me at (555) 123-4567', {
        type: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.message).toContain('phone');
    });

    it('should detect various phone formats', async () => {
      const result = await guardrail.check(
        'Phones: 555-123-4567, (555) 123-4567, 5551234567',
        { type: 'input' }
      );

      expect(result.passed).toBe(false);
      expect(result.details?.totalMatches).toBeGreaterThanOrEqual(1);
    });
  });

  describe('credit card detection', () => {
    it('should detect credit card numbers', async () => {
      const result = await guardrail.check('Card: 4532-1488-0343-6467', {
        type: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.message).toContain('credit');
    });

    it('should detect cards without separators', async () => {
      const result = await guardrail.check('Card: 4532148803436467', {
        type: 'input',
      });

      expect(result.passed).toBe(false);
    });

    it('should validate with Luhn algorithm', async () => {
      // Valid Visa test card number (passes Luhn)
      const validResult = await guardrail.check('4111111111111111', {
        type: 'input',
      });

      expect(validResult.passed).toBe(false);
      expect(validResult.details?.violations).toBeDefined();

      // Invalid checksum (does not pass Luhn)
      const invalidResult = await guardrail.check('4111111111111112', {
        type: 'input',
      });

      // Both should be detected as potential credit cards
      expect(invalidResult.passed).toBe(false);
    });
  });

  describe('multiple PII types', () => {
    it('should detect multiple PII types in same content', async () => {
      const result = await guardrail.check(
        'Contact: john@example.com, SSN: 123-45-6789, Phone: 555-1234',
        { type: 'input' }
      );

      expect(result.passed).toBe(false);
      expect(result.details?.piiTypes?.length).toBeGreaterThanOrEqual(2);
    });

    it('should include all PII types in details', async () => {
      const result = await guardrail.check(
        'Email: test@test.com, SSN: 123-45-6789',
        { type: 'input' }
      );

      expect(result.details?.piiTypes).toBeDefined();
      const types = result.details?.piiTypes as string[];
      expect(types.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('custom detect types', () => {
    it('should only detect specified PII types', async () => {
      const ssnOnlyGuardrail = new PIIGuardrail({
        detectTypes: ['ssn'],
      });

      const result = await ssnOnlyGuardrail.check(
        'SSN: 123-45-6789, Email: test@test.com',
        { type: 'input' }
      );

      expect(result.passed).toBe(false);
      expect(result.message).toContain('ssn');
    });
  });

  describe('clean content', () => {
    it('should pass for content without PII', async () => {
      const result = await guardrail.check(
        'This is a clean message without any personal information',
        { type: 'input' }
      );

      expect(result.passed).toBe(true);
    });
  });

  describe('remediation', () => {
    it('should provide remediation advice', async () => {
      const result = await guardrail.check('SSN: 123-45-6789', {
        type: 'input',
      });

      expect(result.details?.remediation).toBeDefined();
      expect(result.details?.remediation).toContain('redact');
    });
  });

  describe('severity levels', () => {
    it('should respect custom severity', async () => {
      const criticalGuardrail = new PIIGuardrail({
        severity: GuardrailSeverity.CRITICAL,
      });

      const result = await criticalGuardrail.check('SSN: 123-45-6789', {
        type: 'input',
      });

      expect(result.severity).toBe(GuardrailSeverity.CRITICAL);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', async () => {
      const result = await guardrail.check('', { type: 'input' });

      expect(result.passed).toBe(true);
    });

    it('should handle content with only whitespace', async () => {
      const result = await guardrail.check('   \n\n   ', { type: 'input' });

      expect(result.passed).toBe(true);
    });

    it('should handle very long content', async () => {
      const longContent = 'No PII here. '.repeat(1000) + 'SSN: 123-45-6789';
      const result = await guardrail.check(longContent, { type: 'input' });

      expect(result.passed).toBe(false);
    });
  });

  describe('description', () => {
    it('should describe what PII types are detected', () => {
      const customGuardrail = new PIIGuardrail({
        detectTypes: ['ssn', 'email'],
      });

      expect(customGuardrail.description).toContain('ssn');
      expect(customGuardrail.description).toContain('email');
    });
  });
});
