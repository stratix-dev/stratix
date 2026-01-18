import type { Document } from '../vector-store/Document.js';
import type { VectorStore } from '../vector-store/VectorStore.js';
import type { LLMProvider } from '../../llm/LLMProvider.js';
import type { DocumentChunker } from '../chunking/DocumentChunker.js';
import type { RAGPipelineConfig } from './PipelineConfig.js';
import { EmbeddingHelpers } from '../vector-store/Embedding.js';

/**
 * Result of a RAG retrieval operation.
 */
export interface RAGRetrievalResult {
  /**
   * Retrieved documents.
   */
  readonly documents: readonly Document[];

  /**
   * Similarity scores for each document.
   */
  readonly scores: readonly number[];

  /**
   * Number of documents retrieved.
   */
  readonly count: number;

  /**
   * Average similarity score.
   */
  readonly averageScore: number;
}

/**
 * Retrieval-Augmented Generation (RAG) Pipeline.
 *
 * Orchestrates the complete RAG workflow:
 * 1. Ingestion: Chunk documents, generate embeddings, store in vector DB
 * 2. Retrieval: Convert query to embedding, search for similar documents
 * 3. Generation: Use retrieved documents as context for LLM
 *
 * @example
 * ```TypeScript
 * const pipeline = new RAGPipeline(
 *   vectorStore,
 *   llmProvider,
 *   chunker,
 *   {
 *     embeddingModel: 'text-embedding-ada-002',
 *     retrievalLimit: 5,
 *     similarityThreshold: 0.7
 *   }
 * );
 *
 * // Ingest documents
 * await pipeline.ingest([doc1, doc2, doc3]);
 *
 * // Retrieve relevant documents
 * const results = await pipeline.retrieve('How do I configure authentication?');
 *
 * // Use in agent prompt
 * const context = results.documents.map(d => d.content).join('\n\n');
 * ```
 */
export class RAGPipeline {
  private readonly config: Required<RAGPipelineConfig>;

  constructor(
    private readonly vectorStore: VectorStore,
    private readonly llmProvider: LLMProvider,
    private readonly chunker: DocumentChunker,
    config: RAGPipelineConfig = {}
  ) {
    this.config = {
      chunking: config.chunking ?? { maxChunkSize: 1000, overlap: 200 },
      embeddingModel: config.embeddingModel ?? 'text-embedding-ada-002',
      retrievalLimit: config.retrievalLimit ?? 5,
      similarityThreshold: config.similarityThreshold ?? 0.7,
      autoChunk: config.autoChunk ?? true,
      embeddingBatchSize: config.embeddingBatchSize ?? 100
    };
  }

  /**
   * Ingest documents into the RAG pipeline.
   *
   * Steps:
   * 1. Optionally chunk documents
   * 2. Generate embeddings
   * 3. Store in vector database
   *
   * @param documents - Documents to ingest
   * @param options - Ingestion options
   * @returns Promise resolving to number of chunks stored
   *
   * @example
   * ```TypeScript
   * const count = await pipeline.ingest(documents);
   * console.log(`Ingested ${count} chunks`);
   * ```
   */
  async ingest(
    documents: readonly Document[],
    options: { skipChunking?: boolean } = {}
  ): Promise<number> {
    // Step 1: Chunk documents if needed
    const chunks =
      this.config.autoChunk && !options.skipChunking
        ? this.chunker.chunkBatch(documents, this.config.chunking)
        : documents;

    if (chunks.length === 0) {
      return 0;
    }

    // Step 2 & 3: Generate embeddings and store in batches
    let storedCount = 0;
    const batchSize = this.config.embeddingBatchSize;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const embeddings = await this.embedBatch(batch);

      await this.vectorStore.upsertBatch(batch, embeddings);
      storedCount += batch.length;
    }

    return storedCount;
  }

  /**
   * Retrieve relevant documents for a query.
   *
   * Steps:
   * 1. Convert query to embedding
   * 2. Search vector store for similar documents
   * 3. Return results with scores
   *
   * @param query - Query string
   * @param options - Retrieval options
   * @returns Promise resolving to retrieval results
   *
   * @example
   * ```TypeScript
   * const results = await pipeline.retrieve('authentication setup');
   *
   * for (let i = 0; i < results.documents.length; i++) {
   *   console.log(`${results.scores[i]}: ${results.documents[i].content}`);
   * }
   * ```
   */
  async retrieve(
    query: string,
    options: {
      limit?: number;
      threshold?: number;
      filters?: Record<string, unknown>;
    } = {}
  ): Promise<RAGRetrievalResult> {
    // Step 1: Generate query embedding
    const queryEmbedding = await this.embedText(query);

    // Step 2: Search vector store
    const searchResults = await this.vectorStore.search({
      vector: queryEmbedding,
      limit: options.limit ?? this.config.retrievalLimit,
      threshold: options.threshold ?? this.config.similarityThreshold,
      filters: options.filters
    });

    // Step 3: Extract documents and scores
    const documents: Document[] = [];
    const scores: number[] = [];

    for (const result of searchResults) {
      const doc = await this.vectorStore.get(result.documentId);
      if (doc) {
        documents.push(doc);
        scores.push(result.score);
      }
    }

    const averageScore =
      scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;

    return {
      documents,
      scores,
      count: documents.length,
      averageScore
    };
  }

  /**
   * Generate context string from retrieved documents.
   *
   * Formats documents for use in LLM prompts.
   *
   * @param results - Retrieval results
   * @param options - Formatting options
   * @returns Formatted context string
   *
   * @example
   * ```TypeScript
   * const results = await pipeline.retrieve(query);
   * const context = pipeline.formatContext(results);
   *
   * const prompt = `Context:\n${context}\n\nQuestion: ${query}`;
   * ```
   */
  formatContext(
    results: RAGRetrievalResult,
    options: {
      includeScores?: boolean;
      includeMetadata?: boolean;
      separator?: string;
    } = {}
  ): string {
    const includeScores = options.includeScores ?? false;
    const includeMetadata = options.includeMetadata ?? false;
    const separator = options.separator ?? '\n\n---\n\n';

    return results.documents
      .map((doc, i) => {
        let text = doc.content;

        if (includeScores) {
          text = `[Score: ${results.scores[i].toFixed(2)}]\n${text}`;
        }

        if (includeMetadata && doc.metadata) {
          const metadataStr = JSON.stringify(doc.metadata, null, 2);
          text = `${text}\n\nMetadata: ${metadataStr}`;
        }

        return text;
      })
      .join(separator);
  }

  /**
   * Delete documents from the pipeline.
   *
   * @param documentIds - IDs of documents to delete
   * @returns Promise resolving to number of documents deleted
   *
   * @example
   * ```TypeScript
   * const deleted = await pipeline.delete(['doc1', 'doc2']);
   * console.log(`Deleted ${deleted} documents`);
   * ```
   */
  async delete(documentIds: readonly string[]): Promise<number> {
    return this.vectorStore.deleteBatch(documentIds);
  }

  /**
   * Clear all documents from the pipeline.
   *
   * @returns Promise resolving when complete
   *
   * @example
   * ```TypeScript
   * await pipeline.clear();
   * ```
   */
  async clear(): Promise<void> {
    return this.vectorStore.clear();
  }

  /**
   * Get the number of documents in the pipeline.
   *
   * @returns Promise resolving to document count
   *
   * @example
   * ```TypeScript
   * const count = await pipeline.size();
   * console.log(`Pipeline contains ${count} documents`);
   * ```
   */
  async size(): Promise<number> {
    return this.vectorStore.size();
  }

  /**
   * Generate an embedding for a single text.
   */
  private async embedText(text: string): Promise<readonly number[]> {
    const response = await this.llmProvider.embeddings({
      input: text,
      model: this.config.embeddingModel
    });

    if (response.embeddings.length === 0) {
      throw new Error('No embedding returned from provider');
    }

    return response.embeddings[0].vector;
  }

  /**
   * Generate embeddings for a batch of documents.
   */
  private async embedBatch(documents: readonly Document[]) {
    const texts = documents.map((doc) => doc.content);

    const response = await this.llmProvider.embeddings({
      input: texts,
      model: this.config.embeddingModel
    });

    if (response.embeddings.length !== documents.length) {
      throw new Error(
        `Embedding count mismatch: expected ${documents.length}, got ${response.embeddings.length}`
      );
    }

    return documents.map((doc, i) =>
      EmbeddingHelpers.create(response.embeddings[i].vector, doc.id, {
        model: this.config.embeddingModel,
        timestamp: new Date().toISOString()
      })
    );
  }
}
