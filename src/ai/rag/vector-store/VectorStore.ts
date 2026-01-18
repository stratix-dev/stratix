import type { Document } from './Document.js';
import type { Embedding, SimilarityResult } from './Embedding.js';

/**
 * Query for searching the vector store.
 */
export interface VectorStoreQuery {
  /**
   * The query embedding vector.
   */
  readonly vector: readonly number[];

  /**
   * Maximum number of results to return.
   * Default: 10
   */
  readonly limit?: number;

  /**
   * Minimum similarity score threshold (0-1).
   * Only return results with score >= threshold.
   * Default: 0.0
   */
  readonly threshold?: number;

  /**
   * Optional metadata filters.
   *
   * Only return results where metadata matches all filters.
   */
  readonly filters?: Readonly<Record<string, unknown>>;
}

/**
 * Base interface for vector stores.
 *
 * Vector stores provide semantic search by storing and querying
 * high-dimensional vector embeddings of documents.
 *
 * Implementations:
 * - InMemoryVectorStore: Simple in-memory storage for development/testing
 * - PineconeVectorStore: Pinecone cloud vector database
 * - ChromaVectorStore: ChromaDB vector database
 * - WeaviateVectorStore: Weaviate vector database
 *
 * @example
 * ```TypeScript
 * const store = new InMemoryVectorStore();
 *
 * // Add documents with embeddings
 * await store.upsert(
 *   { id: 'doc1', content: 'Hello world' },
 *   { vector: [0.1, 0.2, ...], documentId: 'doc1' }
 * );
 *
 * // Search by similarity
 * const results = await store.search({
 *   vector: queryEmbedding,
 *   limit: 5,
 *   threshold: 0.7
 * });
 * ```
 */
export interface VectorStore {
  /**
   * Insert or update a document with its embedding.
   *
   * If document with same ID exists, it will be updated.
   *
   * @param document - The document to store
   * @param embedding - The document's embedding
   * @returns Promise resolving when complete
   *
   * @example
   * ```TypeScript
   * await store.upsert(
   *   { id: 'doc1', content: 'Introduction to AI' },
   *   { vector: [0.1, 0.2, ...], documentId: 'doc1' }
   * );
   * ```
   */
  upsert(document: Document, embedding: Embedding): Promise<void>;

  /**
   * Insert or update multiple documents with their embeddings.
   *
   * More efficient than calling upsert() multiple times.
   *
   * @param documents - Array of documents
   * @param embeddings - Corresponding embeddings (same length)
   * @returns Promise resolving when complete
   *
   * @example
   * ```TypeScript
   * await store.upsertBatch(
   *   [doc1, doc2, doc3],
   *   [emb1, emb2, emb3]
   * );
   * ```
   */
  upsertBatch(documents: readonly Document[], embeddings: readonly Embedding[]): Promise<void>;

  /**
   * Search for similar documents.
   *
   * Finds documents whose embeddings are most similar to the query embedding.
   * Results are ordered by similarity (highest first).
   *
   * @param query - The search query
   * @returns Promise resolving to similarity results
   *
   * @example
   * ```TypeScript
   * const results = await store.search({
   *   vector: queryEmbedding,
   *   limit: 5,
   *   threshold: 0.7,
   *   filters: { category: 'technical' }
   * });
   *
   * for (const result of results) {
   *   console.log(`${result.documentId}: ${result.score}`);
   * }
   * ```
   */
  search(query: VectorStoreQuery): Promise<readonly SimilarityResult[]>;

  /**
   * Get a document by ID.
   *
   * @param id - Document ID
   * @returns Promise resolving to document or undefined if not found
   *
   * @example
   * ```TypeScript
   * const doc = await store.get('doc1');
   * if (doc) {
   *   console.log(doc.content);
   * }
   * ```
   */
  get(id: string): Promise<Document | undefined>;

  /**
   * Get an embedding by document ID.
   *
   * @param documentId - Document ID
   * @returns Promise resolving to embedding or undefined if not found
   *
   * @example
   * ```TypeScript
   * const embedding = await store.getEmbedding('doc1');
   * if (embedding) {
   *   console.log(`Dimensions: ${embedding.vector.length}`);
   * }
   * ```
   */
  getEmbedding(documentId: string): Promise<Embedding | undefined>;

  /**
   * Delete a document and its embedding.
   *
   * @param id - Document ID
   * @returns Promise resolving to true if deleted, false if not found
   *
   * @example
   * ```TypeScript
   * const deleted = await store.delete('doc1');
   * ```
   */
  delete(id: string): Promise<boolean>;

  /**
   * Delete multiple documents and their embeddings.
   *
   * @param ids - Array of document IDs
   * @returns Promise resolving to number of documents deleted
   *
   * @example
   * ```TypeScript
   * const count = await store.deleteBatch(['doc1', 'doc2', 'doc3']);
   * console.log(`Deleted ${count} documents`);
   * ```
   */
  deleteBatch(ids: readonly string[]): Promise<number>;

  /**
   * Clear all documents and embeddings.
   *
   * @returns Promise resolving when complete
   *
   * @example
   * ```TypeScript
   * await store.clear();
   * ```
   */
  clear(): Promise<void>;

  /**
   * Get the total number of documents in the store.
   *
   * @returns Promise resolving to document count
   *
   * @example
   * ```TypeScript
   * const count = await store.size();
   * console.log(`Store contains ${count} documents`);
   * ```
   */
  size(): Promise<number>;

  /**
   * Check if a document exists.
   *
   * @param id - Document ID
   * @returns Promise resolving to true if exists
   *
   * @example
   * ```TypeScript
   * if (await store.has('doc1')) {
   *   console.log('Document exists');
   * }
   * ```
   */
  has(id: string): Promise<boolean>;

  /**
   * List all document IDs.
   *
   * @param limit - Optional limit on number of IDs
   * @returns Promise resolving to array of document IDs
   *
   * @example
   * ```TypeScript
   * const ids = await store.listIds(100);
   * ```
   */
  listIds(limit?: number): Promise<readonly string[]>;
}

/**
 * In-memory vector store implementation.
 *
 * Simple implementation for development, testing, and small datasets.
 * Not suitable for production use with large datasets.
 *
 * @example
 * ```TypeScript
 * const store = new InMemoryVectorStore();
 *
 * await store.upsert(doc, embedding);
 * const results = await store.search({ vector: queryVec, limit: 5 });
 * ```
 */
export class InMemoryVectorStore implements VectorStore {
  private documents = new Map<string, Document>();
  private embeddings = new Map<string, Embedding>();

  async upsert(document: Document, embedding: Embedding): Promise<void> {
    this.documents.set(document.id, document);
    this.embeddings.set(document.id, embedding);
    return Promise.resolve();
  }

  async upsertBatch(
    documents: readonly Document[],
    embeddings: readonly Embedding[]
  ): Promise<void> {
    if (documents.length !== embeddings.length) {
      throw new Error(
        `Document and embedding count mismatch: ${documents.length} vs ${embeddings.length}`
      );
    }

    for (let i = 0; i < documents.length; i++) {
      await this.upsert(documents[i], embeddings[i]);
    }
  }

  async search(query: VectorStoreQuery): Promise<readonly SimilarityResult[]> {
    const limit = query.limit ?? 10;
    const threshold = query.threshold ?? 0.0;

    // Calculate similarity for all embeddings
    const results: SimilarityResult[] = [];

    for (const [docId, embedding] of this.embeddings.entries()) {
      const doc = this.documents.get(docId);
      if (!doc) continue;

      // Apply metadata filters
      if (query.filters && !this.matchesFilters(doc, query.filters)) {
        continue;
      }

      // Calculate cosine similarity
      const score = this.cosineSimilarity(query.vector, embedding.vector);

      // Apply threshold
      if (score >= threshold) {
        results.push({
          documentId: docId,
          score,
          embedding: embedding.vector,
          metadata: doc.metadata
        });
      }
    }

    // Sort by score (highest first) and limit
    results.sort((a, b) => b.score - a.score);
    return Promise.resolve(results.slice(0, limit));
  }

  async get(id: string): Promise<Document | undefined> {
    return Promise.resolve(this.documents.get(id));
  }

  async getEmbedding(documentId: string): Promise<Embedding | undefined> {
    return Promise.resolve(this.embeddings.get(documentId));
  }

  async delete(id: string): Promise<boolean> {
    const hadDoc = this.documents.delete(id);
    this.embeddings.delete(id);
    return Promise.resolve(hadDoc);
  }

  async deleteBatch(ids: readonly string[]): Promise<number> {
    let count = 0;
    for (const id of ids) {
      if (await this.delete(id)) {
        count++;
      }
    }
    return count;
  }

  async clear(): Promise<void> {
    this.documents.clear();
    this.embeddings.clear();
    return Promise.resolve();
  }

  async size(): Promise<number> {
    return Promise.resolve(this.documents.size);
  }

  async has(id: string): Promise<boolean> {
    return Promise.resolve(this.documents.has(id));
  }

  async listIds(limit?: number): Promise<readonly string[]> {
    const ids = Array.from(this.documents.keys());
    return Promise.resolve(limit !== undefined ? ids.slice(0, limit) : ids);
  }

  /**
   * Calculate cosine similarity between two vectors.
   */
  private cosineSimilarity(a: readonly number[], b: readonly number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA * normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Check if document metadata matches all filters.
   */
  private matchesFilters(doc: Document, filters: Record<string, unknown>): boolean {
    if (!doc.metadata) return false;

    return Object.entries(filters).every(([key, value]) => doc.metadata![key] === value);
  }
}
