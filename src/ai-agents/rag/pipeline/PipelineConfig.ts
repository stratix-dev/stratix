import type { ChunkingConfig } from '../chunking/ChunkingStrategy.js';

/**
 * Configuration for RAG pipeline.
 */
export interface RAGPipelineConfig {
  /**
   * Chunking configuration.
   *
   * How to split documents before embedding.
   */
  readonly chunking?: ChunkingConfig;

  /**
   * Embedding model to use.
   *
   * Examples:
   * - 'text-embedding-ada-002' (OpenAI)
   * - 'text-embedding-3-small' (OpenAI)
   * - 'text-embedding-3-large' (OpenAI)
   */
  readonly embeddingModel?: string;

  /**
   * Maximum number of documents to retrieve.
   * Default: 5
   */
  readonly retrievalLimit?: number;

  /**
   * Minimum similarity score threshold (0-1).
   * Only retrieve documents with score >= threshold.
   * Default: 0.7
   */
  readonly similarityThreshold?: number;

  /**
   * Whether to automatically chunk documents during ingestion.
   * Default: true
   */
  readonly autoChunk?: boolean;

  /**
   * Batch size for embedding operations.
   * Larger batches are more efficient but use more memory.
   * Default: 100
   */
  readonly embeddingBatchSize?: number;
}
