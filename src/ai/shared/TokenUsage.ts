/**
 * Token usage for LLM API calls.
 *
 * Follows OpenAI API naming convention:
 * - promptTokens: tokens in the input/prompt
 * - completionTokens: tokens in the output/completion
 * - totalTokens: sum of prompt + completion
 *
 * This is the standardized token usage interface used throughout
 * the AI agents system. All LLM providers must map to this format.
 *
 * @example
 * ```typescript
 * const usage: TokenUsage = {
 *   promptTokens: 100,
 *   completionTokens: 50,
 *   totalTokens: 150
 * };
 * ```
 */
export interface TokenUsage {
  /**
   * Number of tokens in the prompt (input)
   */
  readonly promptTokens: number;

  /**
   * Number of tokens in the completion (output)
   */
  readonly completionTokens: number;

  /**
   * Total tokens used (promptTokens + completionTokens)
   */
  readonly totalTokens: number;
}

/**
 * Cost information for an LLM API call.
 *
 * Associates token usage with monetary cost and provider details.
 *
 * @example
 * ```typescript
 * const cost: LLMCost = {
 *   provider: 'openai',
 *   model: 'gpt-4',
 *   usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
 *   costUSD: 0.0075,
 *   timestamp: new Date()
 * };
 * ```
 */
export interface LLMCost {
  /**
   * Provider name (e.g., 'openai', 'anthropic', 'local')
   */
  readonly provider: string;

  /**
   * Model identifier (e.g., 'gpt-4', 'claude-3-opus')
   */
  readonly model: string;

  /**
   * Token usage breakdown
   */
  readonly usage: TokenUsage;

  /**
   * Cost in USD
   */
  readonly costUSD: number;

  /**
   * When this cost was incurred
   */
  readonly timestamp: Date;
}

/**
 * Helper functions for working with token usage
 */
export const TokenUsageHelpers = {
  /**
   * Create a TokenUsage instance with automatic total calculation
   */
  create(promptTokens: number, completionTokens: number): TokenUsage {
    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens
    };
  },

  /**
   * Combine multiple token usages
   */
  combine(usages: TokenUsage[]): TokenUsage {
    return usages.reduce(
      (acc, usage) => ({
        promptTokens: acc.promptTokens + usage.promptTokens,
        completionTokens: acc.completionTokens + usage.completionTokens,
        totalTokens: acc.totalTokens + usage.totalTokens
      }),
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    );
  },

  /**
   * Check if usage is empty (all zeros)
   */
  isEmpty(usage: TokenUsage): boolean {
    return usage.totalTokens === 0;
  }
};
