/**
 * Configuration for an LLM model.
 *
 * Defines model selection and generation parameters for AI agents.
 * These settings control how the LLM behaves during execution.
 *
 * @example
 * ```TypeScript
 * const config: ModelConfig = {
 *   provider: 'openai',
 *   model: 'gpt-4',
 *   temperature: 0.7,
 *   maxTokens: 2000,
 *   topP: 1.0,
 *   frequencyPenalty: 0.0,
 *   presencePenalty: 0.0
 * };
 * ```
 */
export interface ModelConfig {
  /**
   * LLM provider name.
   *
   * @example 'openai', 'anthropic', 'local'
   */
  readonly provider: string;

  /**
   * Model identifier.
   *
   * @example 'gpt-4', 'gpt-3.5-turbo', 'claude-3-opus-20240229'
   */
  readonly model: string;

  /**
   * Sampling temperature (0.0 - 2.0).
   *
   * Controls randomness:
   * - 0.0 = deterministic, focused
   * - 1.0 = balanced
   * - 2.0 = very creative, random
   *
   * @default 0.7
   */
  readonly temperature?: number;

  /**
   * Maximum tokens to generate.
   *
   * Limits the length of the model's response.
   * Does not include input tokens.
   *
   * @default provider-specific
   */
  readonly maxTokens?: number;

  /**
   * Nucleus sampling threshold (0.0 - 1.0).
   *
   * Controls diversity via nucleus sampling.
   * - 1.0 = consider all tokens
   * - 0.9 = consider top 90% probability mass
   *
   * Not supported by all providers.
   *
   * @default 1.0
   */
  readonly topP?: number;

  /**
   * Frequency penalty (-2.0 to 2.0).
   *
   * Reduces repetition of token sequences.
   * - Positive values decrease repetition
   * - Negative values encourage repetition
   *
   * Not supported by all providers.
   *
   * @default 0.0
   */
  readonly frequencyPenalty?: number;

  /**
   * Presence penalty (-2.0 to 2.0).
   *
   * Encourages new topics.
   * - Positive values encourage new topics
   * - Negative values stick to current topics
   *
   * Not supported by all providers.
   *
   * @default 0.0
   */
  readonly presencePenalty?: number;

  /**
   * Stop sequences.
   *
   * List of sequences that will stop generation when encountered.
   * Useful for controlling output format.
   *
   * @example ['END', '\n\n\n']
   */
  readonly stopSequences?: readonly string[];

  /**
   * Seed for deterministic generation.
   *
   * When set, the model will attempt to generate the same output
   * for the same input. Not all providers support this.
   */
  readonly seed?: number;

  /**
   * Additional provider-specific parameters.
   *
   * Allows passing custom parameters not defined above.
   * Use sparingly as it reduces portability across providers.
   */
  readonly [key: string]: unknown;
}

/**
 * Helper functions for working with model configurations
 */
export const ModelConfigHelpers = {
  /**
   * Create a model config with common defaults.
   *
   * @param provider - Provider name
   * @param model - Model identifier
   * @param overrides - Optional parameter overrides
   * @returns ModelConfig with defaults applied
   */
  create(provider: string, model: string, overrides?: Partial<ModelConfig>): ModelConfig {
    return {
      provider,
      model,
      temperature: 0.7,
      topP: 1.0,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
      ...overrides
    };
  },

  /**
   * Validate model config parameters.
   *
   * Checks that all parameters are within valid ranges.
   *
   * @param config - Config to validate
   * @returns Array of validation errors (empty if valid)
   */
  validate(config: ModelConfig): string[] {
    const errors: string[] = [];

    if (!config.provider || config.provider.trim().length === 0) {
      errors.push('Provider cannot be empty');
    }

    if (!config.model || config.model.trim().length === 0) {
      errors.push('Model cannot be empty');
    }

    if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
      errors.push('Temperature must be between 0 and 2');
    }

    if (config.maxTokens !== undefined && config.maxTokens <= 0) {
      errors.push('Max tokens must be positive');
    }

    if (config.topP !== undefined && (config.topP < 0 || config.topP > 1)) {
      errors.push('Top P must be between 0 and 1');
    }

    if (
      config.frequencyPenalty !== undefined &&
      (config.frequencyPenalty < -2 || config.frequencyPenalty > 2)
    ) {
      errors.push('Frequency penalty must be between -2 and 2');
    }

    if (
      config.presencePenalty !== undefined &&
      (config.presencePenalty < -2 || config.presencePenalty > 2)
    ) {
      errors.push('Presence penalty must be between -2 and 2');
    }

    return errors;
  },

  /**
   * Check if a model config is valid.
   *
   * @param config - Config to check
   * @returns true if valid
   */
  isValid(config: ModelConfig): boolean {
    return this.validate(config).length === 0;
  },

  /**
   * Merge two model configs.
   * Later config overrides earlier config.
   *
   * @param base - Base config
   * @param override - Override config
   * @returns Merged config
   */
  merge(base: ModelConfig, override: Partial<ModelConfig>): ModelConfig {
    return {
      ...base,
      ...override
    };
  }
};
