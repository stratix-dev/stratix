import type {
  GuardrailChain,
  GuardrailChainConfig,
  GuardrailChainResult,
  GuardrailContext,
  GuardrailResult,
  Guardrail,
  GuardrailSeverity,
} from '@stratix/core';

/**
 * Standard implementation of guardrail chain.
 *
 * Executes multiple guardrails in sequence or parallel and aggregates results.
 * @category AI Agents
 *
 * @example
 * ```typescript
 * const chain = new StandardGuardrailChain({
 *   guardrails: [
 *     new PIIGuardrail(),
 *     new PromptInjectionGuardrail(),
 *     new TopicFilterGuardrail({ allowedTopics: ['support', 'sales'] })
 *   ],
 *   stopOnFirstFailure: true,
 *   parallel: false,
 * });
 *
 * const result = await chain.execute({
 *   content: 'My SSN is 123-45-6789',
 *   contentType: 'input',
 * });
 *
 * console.log(result.passed); // false
 * console.log(result.totalViolations); // 1
 * ```
 */
export class StandardGuardrailChain implements GuardrailChain {
  private guardrails: Guardrail[];

  constructor(public readonly config: GuardrailChainConfig) {
    this.guardrails = [...config.guardrails];
  }

  async execute(context: GuardrailContext): Promise<GuardrailChainResult> {
    const startTime = Date.now();
    const results: Array<{ guardrail: string; result: GuardrailResult }> = [];
    let highestSeverity: GuardrailSeverity | undefined;
    let totalViolations = 0;

    // Filter enabled guardrails
    const enabledGuardrails = this.guardrails.filter((g) => g.enabled);

    if (this.config.parallel) {
      // Execute in parallel
      const promises = enabledGuardrails.map((guardrail) =>
        this.executeGuardrail(guardrail, context)
      );

      const parallelResults: GuardrailResult[] = await Promise.all(promises);

      for (let i = 0; i < enabledGuardrails.length; i++) {
        const guardrail = enabledGuardrails[i];
        const result: GuardrailResult = parallelResults[i];

        results.push({
          guardrail: guardrail.name,
          result,
        });

        if (!result.passed) {
          totalViolations += result.violations?.length || 1;

          if (result.severity) {
            highestSeverity = this.getHigherSeverity(highestSeverity, result.severity);
          }

          if (this.config.onViolation) {
            await this.config.onViolation(result, guardrail);
          }
        }
      }
    } else {
      // Execute in sequence
      for (const guardrail of enabledGuardrails) {
        const result: GuardrailResult = await this.executeGuardrail(guardrail, context);

        results.push({
          guardrail: guardrail.name,
          result,
        });

        if (!result.passed) {
          totalViolations += result.violations?.length || 1;

          if (result.severity) {
            highestSeverity = this.getHigherSeverity(highestSeverity, result.severity);
          }

          if (this.config.onViolation) {
            await this.config.onViolation(result, guardrail);
          }

          // Stop if configured
          if (this.config.stopOnFirstFailure) {
            break;
          }
        }
      }
    }

    const executionTime = Date.now() - startTime;
    const passed = results.every((r) => r.result.passed);

    return {
      passed,
      results,
      highestSeverity,
      totalViolations,
      executionTime,
    };
  }

  add(guardrail: Guardrail): void {
    this.guardrails.push(guardrail);
  }

  remove(name: string): boolean {
    const initialLength = this.guardrails.length;
    this.guardrails = this.guardrails.filter((g) => g.name !== name);
    return this.guardrails.length < initialLength;
  }

  list(): Guardrail[] {
    return [...this.guardrails];
  }

  /**
   * Execute a single guardrail with error handling
   */
  private async executeGuardrail(
    guardrail: Guardrail,
    context: GuardrailContext
  ): Promise<GuardrailResult> {
    try {
      return await guardrail.evaluate(context);
    } catch (error) {
      // If guardrail throws, treat as critical failure
      return {
        passed: false,
        severity: 'critical' as GuardrailSeverity,
        reason: `Guardrail execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        violations: [],
      };
    }
  }

  /**
   * Determine which severity is higher
   */
  private getHigherSeverity(
    current: GuardrailSeverity | undefined,
    incoming: GuardrailSeverity
  ): GuardrailSeverity {
    if (!current) return incoming;

    const severityOrder: GuardrailSeverity[] = [
      'info' as GuardrailSeverity,
      'warning' as GuardrailSeverity,
      'error' as GuardrailSeverity,
      'critical' as GuardrailSeverity,
    ];

    const currentIndex = severityOrder.indexOf(current);
    const incomingIndex = severityOrder.indexOf(incoming);

    return incomingIndex > currentIndex ? incoming : current;
  }
}
