import type { TokenUsage } from './TokenUsage.js';

/**
 * Metadata about an agent execution.
 *
 * Captures performance metrics, model information, and arbitrary
 * additional data about an execution.
 *
 * @example
 * ```typescript
 * const metadata: ExecutionMetadata = {
 *   model: 'gpt-4',
 *   usage: {
 *     promptTokens: 100,
 *     completionTokens: 50,
 *     totalTokens: 150
 *   },
 *   cost: 0.0075,
 *   durationMs: 1234,
 *   stage: 'completion'
 * };
 * ```
 */
export interface ExecutionMetadata {
  /**
   * Model identifier used for this execution
   */
  readonly model: string;

  /**
   * Token usage breakdown (if applicable)
   */
  readonly usage?: TokenUsage;

  /**
   * Cost in USD (if applicable)
   */
  readonly cost?: number;

  /**
   * Execution duration in milliseconds
   */
  readonly durationMs?: number;

  /**
   * Execution stage/phase identifier.
   * Useful for multi-stage executions.
   *
   * @example 'initialization', 'retrieval', 'generation', 'post-processing'
   */
  readonly stage?: string;

  /**
   * Additional arbitrary metadata.
   * Use for provider-specific or execution-specific data.
   *
   * Index signature allows any additional properties.
   */
  readonly [key: string]: unknown;
}

/**
 * Helper functions for working with execution metadata
 */
export const ExecutionMetadataHelpers = {
  /**
   * Create minimal execution metadata.
   *
   * @param model - Model identifier
   * @param additional - Additional metadata fields
   * @returns ExecutionMetadata instance
   */
  create(model: string, additional?: Partial<ExecutionMetadata>): ExecutionMetadata {
    return {
      model,
      ...additional,
    };
  },

  /**
   * Merge multiple metadata objects.
   * Later objects override earlier ones.
   *
   * @param metadatas - Array of metadata to merge
   * @returns Merged metadata
   */
  merge(...metadatas: ExecutionMetadata[]): ExecutionMetadata {
    return metadatas.reduce(
      (acc, metadata) => ({
        ...acc,
        ...metadata,
        // Special handling for usage - combine if both present
        usage:
          acc.usage && metadata.usage
            ? {
                promptTokens: acc.usage.promptTokens + metadata.usage.promptTokens,
                completionTokens:
                  acc.usage.completionTokens + metadata.usage.completionTokens,
                totalTokens: acc.usage.totalTokens + metadata.usage.totalTokens,
              }
            : metadata.usage ?? acc.usage,
        // Sum costs if both present
        cost: (acc.cost ?? 0) + (metadata.cost ?? 0),
        // Sum durations if both present
        durationMs: (acc.durationMs ?? 0) + (metadata.durationMs ?? 0),
      }),
      {} as ExecutionMetadata
    );
  },

  /**
   * Extract summary statistics from metadata.
   *
   * @param metadata - Execution metadata
   * @returns Summary object
   */
  summarize(metadata: ExecutionMetadata): {
    model: string;
    totalTokens: number;
    totalCost: number;
    durationMs: number;
  } {
    return {
      model: metadata.model,
      totalTokens: metadata.usage?.totalTokens ?? 0,
      totalCost: metadata.cost ?? 0,
      durationMs: metadata.durationMs ?? 0,
    };
  },
};
