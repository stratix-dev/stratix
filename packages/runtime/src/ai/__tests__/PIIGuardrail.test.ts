import { describe, it, expect, beforeEach } from 'vitest';
import { PIIGuardrail } from '../guardrails/PIIGuardrail.js';
import { GuardrailSeverity } from '@stratix/core';

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
      expect(defaultGuardrail.enabled).toBe(true);
    });

    it('should respect custom config', () => {
      const customGuardrail = new PIIGuardrail({
        detectTypes: ['ssn'],
        severity: GuardrailSeverity.CRITICAL,
        enabled: false,
      });
      expect(customGuardrail.enabled).toBe(false);
    });
  });

  describe('SSN detection', () => {
    it('should detect valid SSN', async () => {
      const result = await guardrail.evaluate({
        content: 'My SSN is 123-45-6789',
        contentType: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.severity).toBe(GuardrailSeverity.ERROR);
      expect(result.violations).toHaveLength(1);
      expect(result.violations![0].type).toBe('pii:ssn');
      expect(result.violations![0].confidence).toBeGreaterThan(0.9);
    });

    it('should detect multiple SSNs', async () => {
      const result = await guardrail.evaluate({
        content: 'SSNs: 123-45-6789 and 987-65-4321',
        contentType: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(2);
    });

    it('should not detect invalid SSN format', async () => {
      const result = await guardrail.evaluate({
        content: 'Invalid: 12-345-6789',
        contentType: 'input',
      });

      expect(result.passed).toBe(true);
    });
  });

  describe('email detection', () => {
    it('should detect email addresses', async () => {
      const result = await guardrail.evaluate({
        content: 'Contact me at john.doe@example.com',
        contentType: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations![0].type).toBe('pii:email');
    });

    it('should detect multiple email formats', async () => {
      const result = await guardrail.evaluate({
        content: 'Emails: user@domain.com, test.user+tag@sub.domain.co.uk',
        contentType: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.violations?.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('phone number detection', () => {
    it('should detect phone numbers', async () => {
      const result = await guardrail.evaluate({
        content: 'Call me at (555) 123-4567',
        contentType: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations![0].type).toBe('pii:phone');
    });

    it('should detect various phone formats', async () => {
      const result = await guardrail.evaluate({
        content: 'Phones: 555-123-4567, (555) 123-4567, 5551234567',
        contentType: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.violations!.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('credit card detection', () => {
    it('should detect credit card numbers', async () => {
      const result = await guardrail.evaluate({
        content: 'Card: 4532-1488-0343-6467',
        contentType: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations![0].type).toBe('pii:credit_card');
    });

    it('should detect cards without separators', async () => {
      const result = await guardrail.evaluate({
        content: 'Card: 4532148803436467',
        contentType: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
    });

    it('should validate with Luhn algorithm', async () => {
      // Valid Visa test card number (passes Luhn)
      const validResult = await guardrail.evaluate({
        content: '4111111111111111', // Valid Luhn
        contentType: 'input',
      });

      expect(validResult.violations![0].confidence).toBeGreaterThan(0.9);

      // Invalid checksum (does not pass Luhn)
      const invalidResult = await guardrail.evaluate({
        content: '4111111111111112', // Wrong checksum
        contentType: 'input',
      });

      expect(invalidResult.violations![0].confidence).toBeLessThan(0.8);
    });
  });

  describe('multiple PII types', () => {
    it('should detect multiple PII types in same content', async () => {
      const result = await guardrail.evaluate({
        content: 'Contact: john@example.com, SSN: 123-45-6789, Phone: 555-1234',
        contentType: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.violations!.length).toBeGreaterThanOrEqual(2);

      const types = new Set(result.violations!.map((v) => v.type));
      expect(types.size).toBeGreaterThan(1);
    });

    it('should include all PII types in metadata', async () => {
      const result = await guardrail.evaluate({
        content: 'Email: test@test.com, SSN: 123-45-6789',
        contentType: 'input',
      });

      expect(result.metadata?.piiTypes).toBeDefined();
      expect(result.metadata?.piiTypes).toContain('pii:email');
      expect(result.metadata?.piiTypes).toContain('pii:ssn');
    });
  });

  describe('location tracking', () => {
    it('should track violation locations', async () => {
      const content = 'My SSN is 123-45-6789 and email is test@example.com';
      const result = await guardrail.evaluate({
        content,
        contentType: 'input',
      });

      expect(result.violations![0].location).toBeDefined();
      expect(result.violations![0].location!.start).toBeGreaterThanOrEqual(0);
      expect(result.violations![0].location!.end).toBeLessThanOrEqual(content.length);
      expect(result.violations![0].location!.end).toBeGreaterThan(
        result.violations![0].location!.start
      );
    });
  });

  describe('custom detect types', () => {
    it('should only detect specified PII types', async () => {
      const ssnOnlyGuardrail = new PIIGuardrail({
        detectTypes: ['ssn'],
      });

      const result = await ssnOnlyGuardrail.evaluate({
        content: 'SSN: 123-45-6789, Email: test@test.com',
        contentType: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations![0].type).toBe('pii:ssn');
    });
  });

  describe('clean content', () => {
    it('should pass for content without PII', async () => {
      const result = await guardrail.evaluate({
        content: 'This is a clean message without any personal information',
        contentType: 'input',
      });

      expect(result.passed).toBe(true);
      expect(result.violations).toBeUndefined();
    });
  });

  describe('remediation', () => {
    it('should provide remediation advice', async () => {
      const result = await guardrail.evaluate({
        content: 'SSN: 123-45-6789',
        contentType: 'input',
      });

      expect(result.remediation).toBeDefined();
      expect(result.remediation).toContain('redact');
    });
  });

  describe('severity levels', () => {
    it('should respect custom severity', async () => {
      const criticalGuardrail = new PIIGuardrail({
        severity: GuardrailSeverity.CRITICAL,
      });

      const result = await criticalGuardrail.evaluate({
        content: 'SSN: 123-45-6789',
        contentType: 'input',
      });

      expect(result.severity).toBe(GuardrailSeverity.CRITICAL);
      expect(result.violations![0].severity).toBe(GuardrailSeverity.CRITICAL);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', async () => {
      const result = await guardrail.evaluate({
        content: '',
        contentType: 'input',
      });

      expect(result.passed).toBe(true);
    });

    it('should handle content with only whitespace', async () => {
      const result = await guardrail.evaluate({
        content: '   \n\n   ',
        contentType: 'input',
      });

      expect(result.passed).toBe(true);
    });

    it('should handle very long content', async () => {
      const longContent = 'No PII here. '.repeat(1000) + 'SSN: 123-45-6789';
      const result = await guardrail.evaluate({
        content: longContent,
        contentType: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
    });
  });
});
