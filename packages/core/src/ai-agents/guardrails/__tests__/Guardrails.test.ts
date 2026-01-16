import { describe, it, expect } from 'vitest';
import { GuardrailSeverity, GuardrailSeverityHelpers } from '../GuardrailSeverity.js';
import { GuardrailResultHelpers } from '../GuardrailResult.js';
import { Guardrail, TextLengthGuardrail, PatternGuardrail } from '../Guardrail.js';
import { GuardrailChain } from '../GuardrailChain.js';

describe('GuardrailSeverity', () => {
  describe('getLevel', () => {
    it('should return numeric levels', () => {
      expect(GuardrailSeverityHelpers.getLevel(GuardrailSeverity.INFO)).toBe(0);
      expect(GuardrailSeverityHelpers.getLevel(GuardrailSeverity.WARNING)).toBe(1);
      expect(GuardrailSeverityHelpers.getLevel(GuardrailSeverity.ERROR)).toBe(2);
      expect(GuardrailSeverityHelpers.getLevel(GuardrailSeverity.CRITICAL)).toBe(3);
    });
  });

  describe('shouldBlock', () => {
    it('should identify blocking severities', () => {
      expect(GuardrailSeverityHelpers.shouldBlock(GuardrailSeverity.INFO)).toBe(false);
      expect(GuardrailSeverityHelpers.shouldBlock(GuardrailSeverity.WARNING)).toBe(false);
      expect(GuardrailSeverityHelpers.shouldBlock(GuardrailSeverity.ERROR)).toBe(true);
      expect(GuardrailSeverityHelpers.shouldBlock(GuardrailSeverity.CRITICAL)).toBe(true);
    });
  });

  describe('compare', () => {
    it('should compare severities', () => {
      expect(
        GuardrailSeverityHelpers.compare(GuardrailSeverity.INFO, GuardrailSeverity.ERROR)
      ).toBe(-1);

      expect(
        GuardrailSeverityHelpers.compare(GuardrailSeverity.ERROR, GuardrailSeverity.WARNING)
      ).toBe(1);

      expect(
        GuardrailSeverityHelpers.compare(GuardrailSeverity.ERROR, GuardrailSeverity.ERROR)
      ).toBe(0);
    });
  });

  describe('max', () => {
    it('should find most severe', () => {
      const max = GuardrailSeverityHelpers.max([
        GuardrailSeverity.INFO,
        GuardrailSeverity.CRITICAL,
        GuardrailSeverity.WARNING
      ]);

      expect(max).toBe(GuardrailSeverity.CRITICAL);
    });
  });
});

describe('GuardrailResult', () => {
  describe('pass', () => {
    it('should create passing result', () => {
      const result = GuardrailResultHelpers.pass('test-guardrail');

      expect(result.passed).toBe(true);
      expect(result.guardrailName).toBe('test-guardrail');
    });
  });

  describe('fail', () => {
    it('should create failing result', () => {
      const result = GuardrailResultHelpers.fail(
        'test-guardrail',
        GuardrailSeverity.ERROR,
        'Test violation'
      );

      expect(result.passed).toBe(false);
      expect(result.severity).toBe(GuardrailSeverity.ERROR);
      expect(result.message).toBe('Test violation');
    });
  });

  describe('combine', () => {
    it('should combine results', () => {
      const results = [
        GuardrailResultHelpers.pass('g1'),
        GuardrailResultHelpers.fail('g2', GuardrailSeverity.WARNING, 'Fail'),
        GuardrailResultHelpers.pass('g3')
      ];

      const combined = GuardrailResultHelpers.combine(results);

      expect(combined.allPassed).toBe(false);
      expect(combined.violations.length).toBe(1);
    });

    it('should detect blocking violations', () => {
      const results = [GuardrailResultHelpers.fail('g1', GuardrailSeverity.ERROR, 'Block me')];

      const combined = GuardrailResultHelpers.combine(results);

      expect(combined.shouldBlock).toBe(true);
    });
  });
});

describe('TextLengthGuardrail', () => {
  it('should pass for valid length', async () => {
    const guardrail = new TextLengthGuardrail(100, GuardrailSeverity.ERROR);

    const result = await guardrail.check('Short text');

    expect(result.passed).toBe(true);
  });

  it('should fail for excessive length', async () => {
    const guardrail = new TextLengthGuardrail(10, GuardrailSeverity.ERROR);

    const result = await guardrail.check('This is a very long text');

    expect(result.passed).toBe(false);
    expect(result.severity).toBe(GuardrailSeverity.ERROR);
    expect(result.details?.length).toBe(24);
  });
});

describe('PatternGuardrail', () => {
  it('should pass when pattern not found', async () => {
    const guardrail = new PatternGuardrail(
      'email-detector',
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      GuardrailSeverity.WARNING,
      'Email detected'
    );

    const result = await guardrail.check('No email here');

    expect(result.passed).toBe(true);
  });

  it('should fail when pattern found', async () => {
    const guardrail = new PatternGuardrail(
      'email-detector',
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      GuardrailSeverity.WARNING,
      'Email detected'
    );

    const result = await guardrail.check('Contact me at test@example.com');

    expect(result.passed).toBe(false);
    expect(result.message).toBe('Email detected');
  });
});

describe('GuardrailChain', () => {
  it('should check all guardrails', async () => {
    const chain = new GuardrailChain<string>()
      .add(new TextLengthGuardrail(100, GuardrailSeverity.ERROR))
      .add(
        new PatternGuardrail('test-pattern', /bad/gi, GuardrailSeverity.WARNING, 'Bad word found')
      );

    const result = await chain.check('This is good');

    expect(result.allPassed).toBe(true);
    expect(result.results.length).toBe(2);
  });

  it('should detect violations', async () => {
    const chain = new GuardrailChain<string>().add(
      new TextLengthGuardrail(5, GuardrailSeverity.ERROR)
    );

    const result = await chain.check('This is too long');

    expect(result.allPassed).toBe(false);
    expect(result.shouldBlock).toBe(true);
    expect(result.violations.length).toBe(1);
  });

  it('should stop on first failure when configured', async () => {
    const chain = new GuardrailChain<string>({
      stopOnFirstFailure: true
    })
      .add(new TextLengthGuardrail(5, GuardrailSeverity.ERROR))
      .add(new PatternGuardrail('test', /bad/gi, GuardrailSeverity.ERROR, 'Bad word'));

    const result = await chain.check('This is too long and bad');

    // Should only have one result (stopped after first failure)
    expect(result.results.length).toBe(1);
  });

  it('should handle empty chain', async () => {
    const chain = new GuardrailChain<string>();

    const result = await chain.check('test');

    expect(result.allPassed).toBe(true);
    expect(result.results.length).toBe(0);
  });

  it('should add and remove guardrails', () => {
    const chain = new GuardrailChain<string>();
    const guardrail = new TextLengthGuardrail(100, GuardrailSeverity.ERROR);

    chain.add(guardrail);
    expect(chain.size).toBe(1);

    chain.remove('text-length');
    expect(chain.size).toBe(0);
  });

  it('should clone chain', () => {
    const chain = new GuardrailChain<string>().add(
      new TextLengthGuardrail(100, GuardrailSeverity.ERROR)
    );

    const cloned = chain.clone();

    expect(cloned.size).toBe(1);
    expect(cloned).not.toBe(chain);
  });
});
