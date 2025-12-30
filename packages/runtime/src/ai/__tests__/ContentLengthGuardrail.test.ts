import { describe, it, expect, beforeEach } from 'vitest';
import { ContentLengthGuardrail } from '../guardrails/ContentLengthGuardrail.js';
import { GuardrailSeverity } from '@stratix/core/ai-agents';

describe('ContentLengthGuardrail', () => {
  describe('constructor', () => {
    it('should create with default config', () => {
      const guardrail = new ContentLengthGuardrail();
      expect(guardrail.name).toBe('content-length');
      expect(guardrail.severity).toBe(GuardrailSeverity.WARNING);
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
      const result = await guardrail.check('This is valid content', {
        type: 'input',
      });

      expect(result.passed).toBe(true);
      expect(result.details?.charCount).toBe(21);
    });

    it('should fail for content too short', async () => {
      const result = await guardrail.check('Short', { type: 'input' });

      expect(result.passed).toBe(false);
      expect(result.severity).toBe(GuardrailSeverity.WARNING);
      expect(result.message).toContain('too short');
      expect(result.details?.violations).toBeDefined();
    });

    it('should fail for content too long', async () => {
      const result = await guardrail.check('A'.repeat(150), { type: 'input' });

      expect(result.passed).toBe(false);
      expect(result.message).toContain('too long');
    });

    it('should include char count in details', async () => {
      const content = 'Test content';
      const result = await guardrail.check(content, { type: 'input' });

      expect(result.details?.charCount).toBe(content.length);
      expect(result.details?.limits?.minLength).toBe(10);
      expect(result.details?.limits?.maxLength).toBe(100);
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
      const result = await guardrail.check('This is a valid test sentence', {
        type: 'input',
      });

      expect(result.passed).toBe(true);
      expect(result.details?.wordCount).toBe(6);
    });

    it('should fail for too few words', async () => {
      const result = await guardrail.check('Too few', { type: 'input' });

      expect(result.passed).toBe(false);
      expect(result.message).toContain('too few words');
    });

    it('should fail for too many words', async () => {
      const result = await guardrail.check('word '.repeat(60), {
        type: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.message).toContain('too many words');
    });

    it('should count words correctly', async () => {
      const result = await guardrail.check('One two three four five six', {
        type: 'input',
      });

      expect(result.details?.wordCount).toBe(6);
    });

    it('should handle multiple spaces', async () => {
      const result = await guardrail.check(
        'Word1    Word2     Word3   Word4    Word5',
        { type: 'input' }
      );

      expect(result.details?.wordCount).toBe(5);
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
      const result = await guardrail.check(
        'This is a valid sentence with enough words and characters',
        { type: 'input' }
      );

      expect(result.passed).toBe(true);
    });

    it('should detect multiple violations', async () => {
      const result = await guardrail.check('A', { type: 'input' });

      expect(result.passed).toBe(false);
      expect(result.details?.violations?.length).toBe(2); // Too short in chars and words
    });

    it('should combine violation reasons', async () => {
      const result = await guardrail.check('A', { type: 'input' });

      expect(result.message).toContain('too short');
      expect(result.message).toContain('too few words');
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', async () => {
      const guardrail = new ContentLengthGuardrail({
        minLength: 5,
      });

      const result = await guardrail.check('', { type: 'input' });

      expect(result.passed).toBe(false);
      expect(result.details?.charCount).toBe(0);
      expect(result.details?.wordCount).toBe(0);
    });

    it('should handle whitespace-only content', async () => {
      const guardrail = new ContentLengthGuardrail({
        minWords: 1,
      });

      const result = await guardrail.check('   \n\n   ', { type: 'input' });

      expect(result.details?.wordCount).toBe(0);
    });

    it('should work with only minLength set', async () => {
      const guardrail = new ContentLengthGuardrail({
        minLength: 10,
      });

      const result1 = await guardrail.check('Short', { type: 'input' });
      const result2 = await guardrail.check('This is long enough content', {
        type: 'input',
      });

      expect(result1.passed).toBe(false);
      expect(result2.passed).toBe(true);
    });

    it('should work with only maxLength set', async () => {
      const guardrail = new ContentLengthGuardrail({
        maxLength: 20,
      });

      const result1 = await guardrail.check('Short', { type: 'input' });
      const result2 = await guardrail.check(
        'This is way too long for the limit',
        { type: 'input' }
      );

      expect(result1.passed).toBe(true);
      expect(result2.passed).toBe(false);
    });

    it('should work with no limits set', async () => {
      const guardrail = new ContentLengthGuardrail();

      const result = await guardrail.check('Any content', { type: 'input' });

      expect(result.passed).toBe(true);
    });
  });

  describe('severity levels', () => {
    it('should respect custom severity', async () => {
      const guardrail = new ContentLengthGuardrail({
        maxLength: 10,
        severity: GuardrailSeverity.CRITICAL,
      });

      const result = await guardrail.check('This is too long', {
        type: 'input',
      });

      expect(result.severity).toBe(GuardrailSeverity.CRITICAL);
    });
  });

  describe('description', () => {
    it('should generate appropriate description', () => {
      const guardrail = new ContentLengthGuardrail({
        minLength: 10,
        maxLength: 100,
        minWords: 5,
        maxWords: 50,
      });

      expect(guardrail.description).toContain('min 10 chars');
      expect(guardrail.description).toContain('max 100 chars');
      expect(guardrail.description).toContain('min 5 words');
      expect(guardrail.description).toContain('max 50 words');
    });
  });
});
