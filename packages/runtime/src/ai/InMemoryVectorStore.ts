import type {
  VectorStore,
  Document,
  VectorSearchQuery,
  VectorSearchResult,
  MetadataFilter,
} from '@stratix/core';
import type { LLMProvider } from '@stratix/core';

/**
 * In-memory vector store implementation.
 *
 * Uses cosine similarity for vector search and stores all documents in memory.
 * Suitable for development, testing, and small-scale applications.
 *
 * For production use with large datasets, consider using persistent vector stores
 * like Pinecone, Weaviate, or Chroma.
 * @category AI Agents
 *
 * @example
 * ```typescript
 * const store = new InMemoryVectorStore(llmProvider, 'text-embedding-3-small');
 *
 * await store.add([
 *   { id: '1', content: 'AI agents are autonomous entities' },
 *   { id: '2', content: 'Machine learning powers modern AI' }
 * ]);
 *
 * const results = await store.search({
 *   query: 'What are AI agents?',
 *   limit: 3
 * });
 * ```
 */
export class InMemoryVectorStore implements VectorStore {
  private documents: Map<string, Document> = new Map();

  constructor(
    private readonly llmProvider: LLMProvider,
    private readonly embeddingModel: string
  ) {}

  async add(documents: Document[]): Promise<number> {
    let added = 0;

    for (const doc of documents) {
      // Generate embedding if not provided
      let embedding = doc.embedding;

      if (!embedding) {
        const response = await this.llmProvider.embeddings({
          model: this.embeddingModel,
          input: doc.content,
        });
        embedding = response.embeddings[0];
      }

      // Store document with embedding
      this.documents.set(doc.id, {
        ...doc,
        embedding,
      });

      added++;
    }

    return added;
  }

  async search(query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    // Get query embedding
    let queryEmbedding: number[];

    if (typeof query.query === 'string') {
      const response = await this.llmProvider.embeddings({
        model: this.embeddingModel,
        input: query.query,
      });
      queryEmbedding = response.embeddings[0];
    } else {
      queryEmbedding = query.query;
    }

    // Calculate similarity for all documents
    const results: VectorSearchResult[] = [];

    for (const doc of this.documents.values()) {
      // Apply metadata filter if provided
      if (query.filter && !this.matchesFilter(doc, query.filter)) {
        continue;
      }

      // Skip documents without embeddings
      if (!doc.embedding) {
        continue;
      }

      // Calculate cosine similarity
      const score = this.cosineSimilarity(queryEmbedding, doc.embedding);

      // Apply minimum score filter
      if (query.minScore !== undefined && score < query.minScore) {
        continue;
      }

      results.push({ document: doc, score });
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Apply limit
    if (query.limit !== undefined) {
      return results.slice(0, query.limit);
    }

    return results;
  }

  async get(id: string): Promise<Document | null> {
    return this.documents.get(id) ?? null;
  }

  async update(id: string, document: Partial<Document>): Promise<boolean> {
    const existing = this.documents.get(id);

    if (!existing) {
      return false;
    }

    // If content changed, regenerate embedding
    let embedding = existing.embedding;

    if (document.content && document.content !== existing.content) {
      const response = await this.llmProvider.embeddings({
        model: this.embeddingModel,
        input: document.content,
      });
      embedding = response.embeddings[0];
    }

    // Update document
    this.documents.set(id, {
      ...existing,
      ...document,
      id, // Preserve original ID
      embedding,
    });

    return true;
  }

  async delete(id: string): Promise<boolean> {
    return this.documents.delete(id);
  }

  async deleteMany(filter: MetadataFilter): Promise<number> {
    let deleted = 0;

    for (const [id, doc] of this.documents.entries()) {
      if (this.matchesFilter(doc, filter)) {
        this.documents.delete(id);
        deleted++;
      }
    }

    return deleted;
  }

  async count(): Promise<number> {
    return this.documents.size;
  }

  async clear(): Promise<void> {
    this.documents.clear();
  }

  async listAll(filter?: MetadataFilter): Promise<Document[]> {
    const results: Document[] = [];

    for (const doc of this.documents.values()) {
      if (!filter || this.matchesFilter(doc, filter)) {
        results.push(doc);
      }
    }

    return results;
  }

  /**
   * Calculate cosine similarity between two vectors
   *
   * @param a - First vector
   * @param b - Second vector
   * @returns Similarity score between 0 and 1
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Check if a document matches a metadata filter
   *
   * @param doc - Document to check
   * @param filter - Metadata filter
   * @returns true if document matches filter
   */
  private matchesFilter(doc: Document, filter: MetadataFilter): boolean {
    if (!doc.metadata) {
      return false;
    }

    // Check source filter
    if (filter.source !== undefined && doc.metadata.source !== filter.source) {
      return false;
    }

    // Check tags filter (match any)
    if (filter.tags !== undefined && filter.tags.length > 0) {
      if (!doc.metadata.tags) {
        return false;
      }

      const hasMatchingTag = filter.tags.some((tag) =>
        doc.metadata!.tags!.includes(tag)
      );

      if (!hasMatchingTag) {
        return false;
      }
    }

    // Check custom filters
    for (const [key, value] of Object.entries(filter)) {
      if (key === 'source' || key === 'tags') {
        continue; // Already handled above
      }

      if (doc.metadata[key] !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get number of stored documents (for testing)
   */
  size(): number {
    return this.documents.size;
  }
}
