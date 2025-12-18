import { describe, it, expect, beforeEach } from 'vitest';
import { TopicFilterGuardrail } from '../guardrails/TopicFilterGuardrail.js';
import { GuardrailSeverity } from '@stratix/core';

describe('TopicFilterGuardrail', () => {
  describe('forbidden topics', () => {
    let guardrail: TopicFilterGuardrail;

    beforeEach(() => {
      guardrail = new TopicFilterGuardrail({
        forbiddenTopics: ['politics', 'religion'],
        severity: GuardrailSeverity.ERROR,
      });
    });

    it('should block forbidden topic - politics', async () => {
      const result = await guardrail.evaluate({
        content: 'What do you think about the recent election and government policies?',
        contentType: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.severity).toBe(GuardrailSeverity.ERROR);
      expect(result.violations).toBeDefined();
      expect(result.metadata?.forbiddenTopics).toContain('politics');
    });

    it('should block forbidden topic - religion', async () => {
      const result = await guardrail.evaluate({
        content: 'Can you tell me about different religious beliefs and church practices?',
        contentType: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.metadata?.forbiddenTopics).toContain('religion');
    });

    it('should allow content without forbidden topics', async () => {
      const result = await guardrail.evaluate({
        content: 'I need help with my software installation',
        contentType: 'input',
      });

      expect(result.passed).toBe(true);
    });

    it('should detect multiple forbidden topics', async () => {
      const result = await guardrail.evaluate({
        content: 'The election results show political parties divided on religious faith policies',
        contentType: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.metadata?.forbiddenTopics.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('allowed topics', () => {
    let guardrail: TopicFilterGuardrail;

    beforeEach(() => {
      guardrail = new TopicFilterGuardrail({
        allowedTopics: ['support', 'billing'],
        topicKeywords: {
          support: ['help', 'issue', 'problem', 'fix', 'error'],
          billing: ['payment', 'invoice', 'charge', 'subscription'],
        },
        severity: GuardrailSeverity.WARNING,
      });
    });

    it('should allow content matching allowed topics', async () => {
      const result = await guardrail.evaluate({
        content: 'I have an issue with my account, need help to fix this problem',
        contentType: 'input',
      });

      expect(result.passed).toBe(true);
      expect(result.metadata?.detectedTopics).toContain('support');
    });

    it('should block content not matching allowed topics', async () => {
      const result = await guardrail.evaluate({
        content: 'Just a random conversation about weather',
        contentType: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.severity).toBe(GuardrailSeverity.WARNING);
    });
  });

  describe('custom topic keywords', () => {
    it('should use custom keywords for detection', async () => {
      const guardrail = new TopicFilterGuardrail({
        forbiddenTopics: ['sensitive'],
        topicKeywords: {
          sensitive: ['confidential', 'secret', 'private'],
        },
        minKeywordMatches: 2,
      });

      const result = await guardrail.evaluate({
        content: 'This is confidential and secret information',
        contentType: 'input',
      });

      expect(result.passed).toBe(false);
      expect(result.metadata?.forbiddenTopics).toContain('sensitive');
    });

    it('should require minimum keyword matches', async () => {
      const guardrail = new TopicFilterGuardrail({
        forbiddenTopics: ['test'],
        topicKeywords: {
          test: ['word1', 'word2', 'word3'],
        },
        minKeywordMatches: 3,
      });

      const result1 = await guardrail.evaluate({
        content: 'Contains word1 and word2',
        contentType: 'input',
      });

      expect(result1.passed).toBe(true); // Only 2 matches, needs 3

      const result2 = await guardrail.evaluate({
        content: 'Contains word1, word2, and word3',
        contentType: 'input',
      });

      expect(result2.passed).toBe(false); // 3 matches
    });
  });

  describe('default topic keywords', () => {
    it('should use default keywords for politics', async () => {
      const guardrail = new TopicFilterGuardrail({
        forbiddenTopics: ['politics'],
      });

      const result = await guardrail.evaluate({
        content: 'The president announced new legislation in congress',
        contentType: 'input',
      });

      expect(result.passed).toBe(false);
    });

    it('should use default keywords for violence', async () => {
      const guardrail = new TopicFilterGuardrail({
        forbiddenTopics: ['violence'],
      });

      const result = await guardrail.evaluate({
        content: 'Weapons and violence are harmful',
        contentType: 'input',
      });

      expect(result.passed).toBe(false);
    });
  });

  describe('remediation', () => {
    it('should provide remediation for forbidden topics', async () => {
      const guardrail = new TopicFilterGuardrail({
        forbiddenTopics: ['politics'],
      });

      const result = await guardrail.evaluate({
        content: 'The election results show how political parties vote',
        contentType: 'input',
      });

      expect(result.remediation).toBeDefined();
      expect(result.remediation).toContain('forbidden topics');
    });

    it('should provide remediation for allowed topics', async () => {
      const guardrail = new TopicFilterGuardrail({
        allowedTopics: ['support'],
        topicKeywords: {
          support: ['help', 'issue'],
        },
      });

      const result = await guardrail.evaluate({
        content: 'Random conversation',
        contentType: 'input',
      });

      expect(result.remediation).toBeDefined();
      expect(result.remediation).toContain('allowed topics');
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', async () => {
      const guardrail = new TopicFilterGuardrail({
        forbiddenTopics: ['politics'],
      });

      const result = await guardrail.evaluate({
        content: '',
        contentType: 'input',
      });

      expect(result.passed).toBe(true);
    });

    it('should handle content with no topic match', async () => {
      const guardrail = new TopicFilterGuardrail({
        forbiddenTopics: ['politics'],
      });

      const result = await guardrail.evaluate({
        content: 'Generic content',
        contentType: 'input',
      });

      expect(result.passed).toBe(true);
    });

    it('should be case insensitive', async () => {
      const guardrail = new TopicFilterGuardrail({
        forbiddenTopics: ['politics'],
      });

      const result = await guardrail.evaluate({
        content: 'ELECTION and GOVERNMENT news',
        contentType: 'input',
      });

      expect(result.passed).toBe(false);
    });
  });
});
