import type { Guardrail, GuardrailContext } from './Guardrail.js';
import type { GuardrailResult } from './GuardrailResult.js';
import { GuardrailResultHelpers } from './GuardrailResult.js';

/**
 * Configuration for guardrail chain execution.
 */
export interface GuardrailChainConfig {
  /**
   * Whether to stop on first failure.
   *
   * If true, stops executing guardrails after the first failure.
   * If false, runs all guardrails and collects all results.
   *
   * Default: false
   */
  readonly stopOnFirstFailure?: boolean;

  /**
   * Whether to run guardrails in parallel.
   *
   * If true, all guardrails run concurrently.
   * If false, guardrails run sequentially.
   *
   * Default: false
   */
  readonly parallel?: boolean;

  /**
   * Timeout for each guardrail check (ms).
   *
   * Default: 5000 (5 seconds)
   */
  readonly timeout?: number;
}

/**
 * Result of running a guardrail chain.
 */
export interface ChainResult {
  /**
   * Whether all guardrails passed.
   */
  readonly allPassed: boolean;

  /**
   * Whether execution should be blocked.
   */
  readonly shouldBlock: boolean;

  /**
   * Individual guardrail results.
   */
  readonly results: readonly GuardrailResult[];

  /**
   * Guardrails that failed.
   */
  readonly violations: readonly GuardrailResult[];

  /**
   * Summary message.
   */
  readonly summary: string;

  /**
   * Total execution time (ms).
   */
  readonly duration: number;
}

/**
 * Chain of guardrails for comprehensive validation.
 *
 * Allows combining multiple guardrails and running them together.
 *
 * @example
 * ```TypeScript
 * const chain = new GuardrailChain<string>()
 *   .add(new TextLengthGuardrail(1000, GuardrailSeverity.ERROR))
 *   .add(new ProfanityGuardrail())
 *   .add(new PIIDetectionGuardrail());
 *
 * const result = await chain.check(userInput);
 * if (result.shouldBlock) {
 *   console.error('Guardrail violations:', result.violations);
 * }
 * ```
 */
export class GuardrailChain<T = unknown> {
  private guardrails: Guardrail<T>[] = [];
  private readonly config: Required<GuardrailChainConfig>;

  constructor(config: GuardrailChainConfig = {}) {
    this.config = {
      stopOnFirstFailure: config.stopOnFirstFailure ?? false,
      parallel: config.parallel ?? false,
      timeout: config.timeout ?? 5000
    };
  }

  /**
   * Add a guardrail to the chain.
   *
   * @param guardrail - Guardrail to add
   * @returns This chain for method chaining
   *
   * @example
   * ```TypeScript
   * chain.add(new TextLengthGuardrail(1000, GuardrailSeverity.ERROR));
   * ```
   */
  add(guardrail: Guardrail<T>): this {
    this.guardrails.push(guardrail);
    return this;
  }

  /**
   * Add multiple guardrails to the chain.
   *
   * @param guardrails - Array of guardrails
   * @returns This chain for method chaining
   *
   * @example
   * ```TypeScript
   * chain.addAll([guardrail1, guardrail2, guardrail3]);
   * ```
   */
  addAll(guardrails: readonly Guardrail<T>[]): this {
    this.guardrails.push(...guardrails);
    return this;
  }

  /**
   * Remove a guardrail by name.
   *
   * @param name - Name of guardrail to remove
   * @returns True if removed
   *
   * @example
   * ```TypeScript
   * chain.remove('text-length');
   * ```
   */
  remove(name: string): boolean {
    const initialLength = this.guardrails.length;
    this.guardrails = this.guardrails.filter((g) => g.name !== name);
    return this.guardrails.length < initialLength;
  }

  /**
   * Clear all guardrails from the chain.
   *
   * @example
   * ```TypeScript
   * chain.clear();
   * ```
   */
  clear(): void {
    this.guardrails = [];
  }

  /**
   * Get the number of guardrails in the chain.
   *
   * @returns Guardrail count
   */
  get size(): number {
    return this.guardrails.length;
  }

  /**
   * Check if chain is empty.
   *
   * @returns True if no guardrails
   */
  get isEmpty(): boolean {
    return this.guardrails.length === 0;
  }

  /**
   * Check content against all guardrails in the chain.
   *
   * @param content - Content to check
   * @param context - Optional context
   * @returns Promise resolving to chain result
   *
   * @example
   * ```TypeScript
   * const result = await chain.check(userInput, { type: 'user-message' });
   *
   * if (result.shouldBlock) {
   *   console.error('Violations:', result.violations);
   *   throw new Error('Content blocked by guardrails');
   * }
   * ```
   */
  async check(content: T, context?: GuardrailContext): Promise<ChainResult> {
    const startTime = Date.now();

    if (this.guardrails.length === 0) {
      return {
        allPassed: true,
        shouldBlock: false,
        results: [],
        violations: [],
        summary: 'No guardrails configured',
        duration: 0
      };
    }

    const results = this.config.parallel
      ? await this.checkParallel(content, context)
      : await this.checkSequential(content, context);

    const combined = GuardrailResultHelpers.combine(results);
    const duration = Date.now() - startTime;

    return {
      allPassed: combined.allPassed,
      shouldBlock: combined.shouldBlock,
      results,
      violations: combined.violations,
      summary: combined.summary,
      duration
    };
  }

  /**
   * Run guardrails sequentially.
   */
  private async checkSequential(
    content: T,
    context?: GuardrailContext
  ): Promise<GuardrailResult[]> {
    const results: GuardrailResult[] = [];

    for (const guardrail of this.guardrails) {
      const result = await this.checkWithTimeout(guardrail, content, context);
      results.push(result);

      if (this.config.stopOnFirstFailure && GuardrailResultHelpers.shouldBlock(result)) {
        break;
      }
    }

    return results;
  }

  /**
   * Run guardrails in parallel.
   */
  private async checkParallel(content: T, context?: GuardrailContext): Promise<GuardrailResult[]> {
    const promises = this.guardrails.map((guardrail) =>
      this.checkWithTimeout(guardrail, content, context)
    );

    return Promise.all(promises);
  }

  /**
   * Run a single guardrail with timeout.
   */
  private async checkWithTimeout(
    guardrail: Guardrail<T>,
    content: T,
    context?: GuardrailContext
  ): Promise<GuardrailResult> {
    try {
      const timeoutPromise = new Promise<GuardrailResult>((_, reject) => {
        setTimeout(() => reject(new Error('Guardrail check timeout')), this.config.timeout);
      });

      return await Promise.race([guardrail.check(content, context), timeoutPromise]);
    } catch (error) {
      return GuardrailResultHelpers.fail(
        guardrail.name,
        guardrail.severity,
        `Guardrail check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error: String(error) }
      );
    }
  }

  /**
   * Get all guardrail names.
   *
   * @returns Array of names
   */
  getNames(): readonly string[] {
    return this.guardrails.map((g) => g.name);
  }

  /**
   * Clone this chain.
   *
   * Creates a new chain with the same guardrails and config.
   *
   * @returns New chain
   */
  clone(): GuardrailChain<T> {
    const cloned = new GuardrailChain<T>(this.config);
    cloned.guardrails = [...this.guardrails];
    return cloned;
  }
}
