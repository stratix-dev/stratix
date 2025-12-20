import type { Document, VectorSearchResult } from './VectorStore.js';
import type { DocumentChunker } from './DocumentChunker.js';
import type { VectorStore } from './VectorStore.js';
import type { LLMProvider } from './LLMProvider.js';

/**
 * Configuration for RAG pipeline
 */
export interface RAGPipelineConfig {
  /**
   * The LLM provider for generating embeddings and completions
   */
  readonly llmProvider: LLMProvider;

  /**
   * The vector store for document persistence
   */
  readonly vectorStore: VectorStore;

  /**
   * The document chunker for splitting documents
   */
  readonly chunker: DocumentChunker;

  /**
   * Model to use for embeddings
   */
  readonly embeddingModel: string;

  /**
   * Model to use for text generation
   */
  readonly generationModel?: string;

  /**
   * Default search parameters
   */
  readonly defaultSearchLimit?: number;

  /**
   * Default minimum similarity score
   */
  readonly defaultMinScore?: number;
}

/**
 * Options for ingesting documents
 */
export interface IngestOptions {
  /**
   * Whether to chunk the documents
   */
  readonly chunk?: boolean;

  /**
   * Custom metadata to add to all documents
   */
  readonly metadata?: Record<string, unknown>;

  /**
   * Whether to skip documents that already exist (by ID)
   */
  readonly skipExisting?: boolean;
}

/**
 * Result of document ingestion
 */
export interface IngestResult {
  /**
   * Number of documents ingested
   */
  readonly documentsIngested: number;

  /**
   * Number of chunks created
   */
  readonly chunksCreated: number;

  /**
   * IDs of ingested documents/chunks
   */
  readonly documentIds: string[];
}

/**
 * Options for retrieval
 */
export interface RetrievalOptions {
  /**
   * Maximum number of results
   */
  readonly limit?: number;

  /**
   * Minimum similarity score
   */
  readonly minScore?: number;

  /**
   * Metadata filters
   */
  readonly filter?: Record<string, unknown>;
}

/**
 * Result of retrieval-augmented generation
 */
export interface RAGResult {
  /**
   * The generated response
   */
  readonly response: string;

  /**
   * Documents used for context
   */
  readonly context: VectorSearchResult[];

  /**
   * Token usage for embeddings and generation
   */
  readonly tokenUsage: {
    readonly embeddings: number;
    readonly generation: number;
    readonly total: number;
  };
}

/**
 * Interface for RAG (Retrieval-Augmented Generation) pipelines.
 *
 * RAG pipelines orchestrate the process of ingesting documents,
 * storing them with embeddings, retrieving relevant context,
 * and generating responses augmented with that context.
 *
 * @example
 * ```typescript
 * const pipeline = new RAGPipeline({
 *   llmProvider: openAIProvider,
 *   vectorStore: new InMemoryVectorStore(openAIProvider),
 *   chunker: new RecursiveTextChunker({ chunkSize: 1000, chunkOverlap: 200 }),
 *   embeddingModel: 'text-embedding-3-small',
 *   generationModel: 'gpt-4-turbo'
 * });
 *
 * // Ingest knowledge base
 * await pipeline.ingest([
 *   { id: 'doc1', content: 'Product manual content...' },
 *   { id: 'doc2', content: 'FAQ content...' }
 * ], { chunk: true });
 *
 * // Query with context
 * const result = await pipeline.query(
 *   'How do I reset my password?',
 *   { limit: 3, minScore: 0.7 }
 * );
 *
 * console.log(result.response);
 * console.log(`Used ${result.context.length} documents for context`);
 * ```
 */
export interface RAGPipeline {
  /**
   * Configuration for this pipeline
   */
  readonly config: RAGPipelineConfig;

  /**
   * Ingest documents into the pipeline
   *
   * @param documents - Documents to ingest
   * @param options - Ingestion options
   * @returns Ingestion result with statistics
   */
  ingest(documents: Document[], options?: IngestOptions): Promise<IngestResult>;

  /**
   * Retrieve relevant documents for a query
   *
   * @param query - Search query
   * @param options - Retrieval options
   * @returns Matching documents with scores
   */
  retrieve(query: string, options?: RetrievalOptions): Promise<VectorSearchResult[]>;

  /**
   * Query with retrieval-augmented generation
   *
   * @param query - User query
   * @param options - Retrieval options
   * @param systemPrompt - Optional system prompt for generation
   * @returns Generated response with context and token usage
   */
  query(
    query: string,
    options?: RetrievalOptions,
    systemPrompt?: string
  ): Promise<RAGResult>;

  /**
   * Clear all documents from the pipeline
   */
  clear(): Promise<void>;

  /**
   * Get statistics about the pipeline
   *
   * @returns Pipeline statistics
   */
  getStatistics(): Promise<RAGPipelineStatistics>;
}

/**
 * Statistics about a RAG pipeline
 */
export interface RAGPipelineStatistics {
  /**
   * Total number of documents
   */
  readonly totalDocuments: number;

  /**
   * Average document size in characters
   */
  readonly averageDocumentSize: number;

  /**
   * Total queries processed
   */
  readonly totalQueries: number;

  /**
   * Average retrieval time in milliseconds
   */
  readonly averageRetrievalTime: number;

  /**
   * Average generation time in milliseconds
   */
  readonly averageGenerationTime: number;

  /**
   * Total tokens used
   */
  readonly totalTokensUsed: number;
}
