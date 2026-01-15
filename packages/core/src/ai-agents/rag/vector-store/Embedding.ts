/**
 * A vector embedding with associated metadata.
 *
 * Embeddings are high-dimensional vector representations of text,
 * used for semantic similarity search.
 */
export interface Embedding {
  /**
   * The embedding vector.
   *
   * Typically 768, 1536, or 3072 dimensions depending on the model.
   */
  readonly vector: readonly number[];

  /**
   * ID of the document this embedding represents.
   */
  readonly documentId: string;

  /**
   * Optional metadata about the embedding.
   *
   * Examples:
   * - model: Which embedding model was used
   * - timestamp: When the embedding was created
   * - dimensions: Vector dimensions
   */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Result of a similarity search.
 */
export interface SimilarityResult {
  /**
   * The document ID.
   */
  readonly documentId: string;

  /**
   * Similarity score (0-1, higher is more similar).
   *
   * Typically cosine similarity.
   */
  readonly score: number;

  /**
   * Optional embedding vector.
   */
  readonly embedding?: readonly number[];

  /**
   * Optional metadata.
   */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Helper functions for working with embeddings.
 */
export const EmbeddingHelpers = {
  /**
   * Create an embedding.
   *
   * @param vector - The embedding vector
   * @param documentId - Document ID
   * @param metadata - Optional metadata
   * @returns Embedding
   *
   * @example
   * ```typescript
   * const embedding = EmbeddingHelpers.create(
   *   [0.1, 0.2, 0.3, ...],
   *   'doc1',
   *   { model: 'text-embedding-ada-002' }
   * );
   * ```
   */
  create(
    vector: readonly number[],
    documentId: string,
    metadata?: Record<string, unknown>
  ): Embedding {
    return { vector, documentId, metadata };
  },

  /**
   * Get vector dimensions.
   *
   * @param embedding - The embedding
   * @returns Number of dimensions
   */
  getDimensions(embedding: Embedding): number {
    return embedding.vector.length;
  },

  /**
   * Calculate cosine similarity between two embeddings.
   *
   * Cosine similarity is the dot product of normalized vectors,
   * resulting in a value between -1 and 1 (typically 0-1 for embeddings).
   *
   * @param a - First embedding
   * @param b - Second embedding
   * @returns Cosine similarity (0-1)
   *
   * @example
   * ```typescript
   * const similarity = EmbeddingHelpers.cosineSimilarity(embedding1, embedding2);
   * if (similarity > 0.8) {
   *   console.log('Very similar!');
   * }
   * ```
   */
  cosineSimilarity(a: Embedding, b: Embedding): number {
    if (a.vector.length !== b.vector.length) {
      throw new Error(
        `Dimension mismatch: ${a.vector.length} vs ${b.vector.length}`
      );
    }

    return this.cosineSimilarityVectors(a.vector, b.vector);
  },

  /**
   * Calculate cosine similarity between two vectors.
   *
   * @param a - First vector
   * @param b - Second vector
   * @returns Cosine similarity (0-1)
   */
  cosineSimilarityVectors(
    a: readonly number[],
    b: readonly number[]
  ): number {
    if (a.length !== b.length) {
      throw new Error(`Dimension mismatch: ${a.length} vs ${b.length}`);
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
    if (magnitude === 0) {
      return 0;
    }

    return dotProduct / magnitude;
  },

  /**
   * Calculate Euclidean distance between two embeddings.
   *
   * @param a - First embedding
   * @param b - Second embedding
   * @returns Euclidean distance
   */
  euclideanDistance(a: Embedding, b: Embedding): number {
    if (a.vector.length !== b.vector.length) {
      throw new Error(
        `Dimension mismatch: ${a.vector.length} vs ${b.vector.length}`
      );
    }

    return this.euclideanDistanceVectors(a.vector, b.vector);
  },

  /**
   * Calculate Euclidean distance between two vectors.
   *
   * @param a - First vector
   * @param b - Second vector
   * @returns Euclidean distance
   */
  euclideanDistanceVectors(
    a: readonly number[],
    b: readonly number[]
  ): number {
    if (a.length !== b.length) {
      throw new Error(`Dimension mismatch: ${a.length} vs ${b.length}`);
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  },

  /**
   * Normalize a vector to unit length.
   *
   * @param vector - The vector to normalize
   * @returns Normalized vector
   */
  normalize(vector: readonly number[]): number[] {
    let norm = 0;
    for (const val of vector) {
      norm += val * val;
    }

    norm = Math.sqrt(norm);

    if (norm === 0) {
      return [...vector];
    }

    return vector.map((val) => val / norm);
  },

  /**
   * Validate an embedding vector.
   *
   * Checks for NaN, Infinity, and dimension requirements.
   *
   * @param vector - The vector to validate
   * @param expectedDimensions - Expected number of dimensions (optional)
   * @returns Array of validation errors (empty if valid)
   */
  validate(
    vector: readonly number[],
    expectedDimensions?: number
  ): string[] {
    const errors: string[] = [];

    if (vector.length === 0) {
      errors.push('Vector is empty');
    }

    if (expectedDimensions !== undefined && vector.length !== expectedDimensions) {
      errors.push(
        `Expected ${expectedDimensions} dimensions, got ${vector.length}`
      );
    }

    for (let i = 0; i < vector.length; i++) {
      if (!Number.isFinite(vector[i])) {
        errors.push(`Invalid value at index ${i}: ${vector[i]}`);
        break; // Avoid flooding with errors
      }
    }

    return errors;
  },
};
