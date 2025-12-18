import { describe, it, expect, beforeEach } from 'vitest';
import { ContentLengthGuardrail } from '../guardrails/ContentLengthGuardrail.js';
import { GuardrailSeverity } from '@stratix/core';

describe('ContentLengthGuardrail', () => {
  describe('constructor', () => {
    it('should create with default config', () => {
      const guardrail = new ContentLengthGuardrail();
      expect(guardrail.name).toBe('content-length');
      expect(guardrail.enabled).toBe(true);
    });

    it('should throw error if minLength > maxLength', () => {
      expect(() => {
        new ContentLengthGuardrail({
          minLength: 100,
          maxLength: 50,
        });
      }).toThrow('minLength cannot be greater than maxLength');
    });

    it('should throw error if minWords > maxWords', () => {
      expect(() => {
        new ContentLengthGuardrail({
          minWords: 100,
          maxWords: 50,
        });
      }).toThrow('minWords cannot be greater than maxWords');
    });
  });

  describe('character length validation', () => {
    let guardrail: ContentLengthGuardrail;

    beforeEach(() => {
      guardrail = new ContentLengthGuardrail({
        minLength: 10,
        maxLength: 100,
        severity: GuardrailSeverity.WARNING,
      });
    });

    it('should pass for valid length', async () => {
      const result = await guardrail.evaluate({
        content: 'This is valid content',
        contentType: 'input',
      });

      expect(result.passed).toBe(true);
      expect(result.metadata?.charCount).toBe(21);
    });

    it('should fail for content too short', async () => {
      const result = await guardrail.evaluate({
        content: 'Short',
        contentType: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.severity).toBe(GuardrailSeverity.WARNING);
      expect(result.violations![0].type).toBe('length:min_chars');
      expect(result.violations![0].description).toContain('too short');
    });

    it('should fail for content too long', async () => {
      const result = await guardrail.evaluate({
        content: 'A'.repeat(150),
        contentType: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.violations![0].type).toBe('length:max_chars');
      expect(result.violations![0].description).toContain('too long');
    });

    it('should include char count in metadata', async () => {
      const content = 'Test content';
      const result = await guardrail.evaluate({
        content,
        contentType: 'input',
      });

      expect(result.metadata?.charCount).toBe(content.length);
      expect(result.metadata?.limits?.minLength).toBe(10);
      expect(result.metadata?.limits?.maxLength).toBe(100);
    });
  });

  describe('word count validation', () => {
    let guardrail: ContentLengthGuardrail;

    beforeEach(() => {
      guardrail = new ContentLengthGuardrail({
        minWords: 5,
        maxWords: 50,
        severity: GuardrailSeverity.ERROR,
      });
    });

    it('should pass for valid word count', async () => {
      const result = await guardrail.evaluate({
        content: 'This is a valid test sentence',
        contentType: 'input',
      });

      expect(result.passed).toBe(true);
      expect(result.metadata?.wordCount).toBe(6);
    });

    it('should fail for too few words', async () => {
      const result = await guardrail.evaluate({
        content: 'Too few',
        contentType: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.violations![0].type).toBe('length:min_words');
      expect(result.violations![0].description).toContain('too few words');
    });

    it('should fail for too many words', async () => {
      const result = await guardrail.evaluate({
        content: 'word '.repeat(60),
        contentType: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.violations![0].type).toBe('length:max_words');
      expect(result.violations![0].description).toContain('too many words');
    });

    it('should count words correctly', async () => {
      const result = await guardrail.evaluate({
        content: 'One two three four five six',
        contentType: 'input',
      });

      expect(result.metadata?.wordCount).toBe(6);
    });

    it('should handle multiple spaces', async () => {
      const result = await guardrail.evaluate({
        content: 'Word1    Word2     Word3   Word4    Word5',
        contentType: 'input',
      });

      expect(result.metadata?.wordCount).toBe(5);
    });
  });

  describe('combined validation', () => {
    let guardrail: ContentLengthGuardrail;

    beforeEach(() => {
      guardrail = new ContentLengthGuardrail({
        minLength: 20,
        maxLength: 200,
        minWords: 3,
        maxWords: 30,
      });
    });

    it('should pass all checks', async () => {
      const result = await guardrail.evaluate({
        content: 'This is a valid sentence with enough words and characters',
        contentType: 'input',
      });

      expect(result.passed).toBe(true);
    });

    it('should detect multiple violations', async () => {
      const result = await guardrail.evaluate({
        content: 'A',
        contentType: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.violations!.length).toBe(2); // Too short in chars and words
      expect(result.violations!.some((v) => v.type === 'length:min_chars')).toBe(true);
      expect(result.violations!.some((v) => v.type === 'length:min_words')).toBe(true);
    });

    it('should combine violation reasons', async () => {
      const result = await guardrail.evaluate({
        content: 'A',
        contentType: 'input',
      });

      expect(result.reason).toContain('too short');
      expect(result.reason).toContain('too few words');
    });
  });

  describe('remediation', () => {
    it('should suggest expansion for min violations', async () => {
      const guardrail = new ContentLengthGuardrail({
        minLength: 50,
      });

      const result = await guardrail.evaluate({
        content: 'Short',
        contentType: 'input',
      });

      expect(result.remediation).toContain('Expand');
      expect(result.remediation).toContain('minimum');
    });

    it('should suggest shortening for max violations', async () => {
      const guardrail = new ContentLengthGuardrail({
        maxLength: 10,
      });

      const result = await guardrail.evaluate({
        content: 'This is way too long',
        contentType: 'input',
      });

      expect(result.remediation).toContain('Shorten');
      expect(result.remediation).toContain('maximum');
    });

    it('should suggest adjustment for both violations', async () => {
      const guardrail = new ContentLengthGuardrail({
        minLength: 20,
        maxLength: 30,
      });

      // This shouldn't happen in practice but testing the logic
      const result1 = await guardrail.evaluate({
        content: 'A',
        contentType: 'input',
      });

      const result2 = await guardrail.evaluate({
        content: 'A'.repeat(50),
        contentType: 'input',
      });

      expect(result1.remediation).toBeDefined();
      expect(result2.remediation).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', async () => {
      const guardrail = new ContentLengthGuardrail({
        minLength: 5,
      });

      const result = await guardrail.evaluate({
        content: '',
        contentType: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.metadata?.charCount).toBe(0);
      expect(result.metadata?.wordCount).toBe(0);
    });

    it('should handle whitespace-only content', async () => {
      const guardrail = new ContentLengthGuardrail({
        minWords: 1,
      });

      const result = await guardrail.evaluate({
        content: '   \n\n   ',
        contentType: 'input',
      });

      expect(result.metadata?.wordCount).toBe(0);
    });

    it('should work with only minLength set', async () => {
      const guardrail = new ContentLengthGuardrail({
        minLength: 10,
      });

      const result1 = await guardrail.evaluate({
        content: 'Short',
        contentType: 'input',
      });

      const result2 = await guardrail.evaluate({
        content: 'This is long enough content',
        contentType: 'input',
      });

      expect(result1.passed).toBe(false);
      expect(result2.passed).toBe(true);
    });

    it('should work with only maxLength set', async () => {
      const guardrail = new ContentLengthGuardrail({
        maxLength: 20,
      });

      const result1 = await guardrail.evaluate({
        content: 'Short',
        contentType: 'input',
      });

      const result2 = await guardrail.evaluate({
        content: 'This is way too long for the limit',
        contentType: 'input',
      });

      expect(result1.passed).toBe(true);
      expect(result2.passed).toBe(false);
    });

    it('should work with no limits set', async () => {
      const guardrail = new ContentLengthGuardrail();

      const result = await guardrail.evaluate({
        content: 'Any content',
        contentType: 'input',
      });

      expect(result.passed).toBe(true);
    });
  });

  describe('severity levels', () => {
    it('should respect custom severity', async () => {
      const guardrail = new ContentLengthGuardrail({
        maxLength: 10,
        severity: GuardrailSeverity.CRITICAL,
      });

      const result = await guardrail.evaluate({
        content: 'This is too long',
        contentType: 'input',
      });

      expect(result.severity).toBe(GuardrailSeverity.CRITICAL);
    });
  });
});
