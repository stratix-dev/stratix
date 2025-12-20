/**
 * Represents a document with its content and metadata
 * @category AI Agents
 */
export interface Document {
  /**
   * Unique identifier for the document
   */
  readonly id: string;

  /**
   * The actual content of the document
   */
  readonly content: string;

  /**
   * Optional metadata associated with the document
   */
  readonly metadata?: DocumentMetadata;

  /**
   * Optional embedding vector for the document
   */
  readonly embedding?: number[];
}

/**
 * Metadata associated with a document
 */
export interface DocumentMetadata {
  /**
   * Source of the document (file path, URL, etc.)
   */
  readonly source?: string;

  /**
   * Title of the document
   */
  readonly title?: string;

  /**
   * Author of the document
   */
  readonly author?: string;

  /**
   * When the document was created
   */
  readonly createdAt?: Date;

  /**
   * When the document was last updated
   */
  readonly updatedAt?: Date;

  /**
   * Tags or categories for the document
   */
  readonly tags?: string[];

  /**
   * Chunk index if this document is part of a larger document
   */
  readonly chunkIndex?: number;

  /**
   * Total number of chunks if this document is part of a larger document
   */
  readonly totalChunks?: number;

  /**
   * Custom metadata fields
   */
  [key: string]: unknown;
}

/**
 * Query parameters for searching in vector store
 */
export interface VectorSearchQuery {
  /**
   * The query text or embedding vector
   */
  readonly query: string | number[];

  /**
   * Maximum number of results to return
   */
  readonly limit?: number;

  /**
   * Minimum similarity score (0-1)
   */
  readonly minScore?: number;

  /**
   * Metadata filters to apply
   */
  readonly filter?: MetadataFilter;
}

/**
 * Metadata filter for search queries
 */
export interface MetadataFilter {
  /**
   * Filter by source
   */
  readonly source?: string;

  /**
   * Filter by tags (match any)
   */
  readonly tags?: string[];

  /**
   * Custom filters
   */
  [key: string]: unknown;
}

/**
 * Result from a vector search
 */
export interface VectorSearchResult {
  /**
   * The matched document
   */
  readonly document: Document;

  /**
   * Similarity score (0-1, where 1 is perfect match)
   */
  readonly score: number;
}

/**
 * Interface for vector store implementations.
 *
 * Vector stores persist documents with their embeddings and enable
 * semantic similarity search.
 *
 * @example
 * ```typescript
 * const store = new InMemoryVectorStore(llmProvider);
 *
 * // Add documents
 * await store.add([
 *   { id: '1', content: 'AI agents are autonomous software entities' },
 *   { id: '2', content: 'Machine learning powers modern AI systems' }
 * ]);
 *
 * // Semantic search
 * const results = await store.search({
 *   query: 'What are AI agents?',
 *   limit: 3,
 *   minScore: 0.7
 * });
 *
 * console.log(results[0].document.content);
 * console.log(`Relevance: ${results[0].score}`);
 * ```
 */
export interface VectorStore {
  /**
   * Add documents to the vector store
   *
   * @param documents - Documents to add (embeddings will be generated if not provided)
   * @returns Number of documents added
   */
  add(documents: Document[]): Promise<number>;

  /**
   * Search for similar documents
   *
   * @param query - Search query
   * @returns Matching documents with similarity scores
   */
  search(query: VectorSearchQuery): Promise<VectorSearchResult[]>;

  /**
   * Get a document by ID
   *
   * @param id - Document ID
   * @returns The document or null if not found
   */
  get(id: string): Promise<Document | null>;

  /**
   * Update a document
   *
   * @param id - Document ID
   * @param document - Updated document
   * @returns true if updated, false if not found
   */
  update(id: string, document: Partial<Document>): Promise<boolean>;

  /**
   * Delete a document
   *
   * @param id - Document ID
   * @returns true if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;

  /**
   * Delete multiple documents matching a filter
   *
   * @param filter - Metadata filter
   * @returns Number of documents deleted
   */
  deleteMany(filter: MetadataFilter): Promise<number>;

  /**
   * Get total number of documents
   *
   * @returns Document count
   */
  count(): Promise<number>;

  /**
   * Clear all documents
   */
  clear(): Promise<void>;

  /**
   * List all documents (optionally filtered)
   *
   * @param filter - Optional metadata filter
   * @returns All matching documents
   */
  listAll(filter?: MetadataFilter): Promise<Document[]>;
}
