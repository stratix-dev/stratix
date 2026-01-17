import type { Document } from '../vector-store/Document.js';
import type { ChunkingStrategy, ChunkingConfig } from './ChunkingStrategy.js';
import { FixedSizeChunking } from './ChunkingStrategy.js';

/**
 * Document chunker that splits large documents into smaller pieces.
 *
 * Chunking is essential for RAG because:
 * - LLMs have context limits
 * - Smaller chunks improve semantic search precision
 * - Reduces noise in retrieved context
 *
 * @example
 * ```typescript
 * const chunker = new DocumentChunker();
 *
 * // Chunk a single document
 * const chunks = chunker.chunk(document, {
 *   maxChunkSize: 1000,
 *   overlap: 200
 * });
 *
 * // Chunk multiple documents
 * const allChunks = chunker.chunkBatch(documents, config);
 * ```
 */
export class DocumentChunker {
  private readonly strategy: ChunkingStrategy;

  /**
   * Create a new document chunker.
   *
   * @param strategy - Chunking strategy to use (default: FixedSizeChunking)
   *
   * @example
   * ```typescript
   * import { SentenceChunking } from './ChunkingStrategy.js';
   *
   * const chunker = new DocumentChunker(new SentenceChunking());
   * ```
   */
  constructor(strategy?: ChunkingStrategy) {
    this.strategy = strategy ?? new FixedSizeChunking();
  }

  /**
   * Chunk a document into smaller pieces.
   *
   * @param document - The document to chunk
   * @param config - Optional chunking config
   * @returns Array of document chunks
   *
   * @example
   * ```typescript
   * const chunks = chunker.chunk(document, {
   *   maxChunkSize: 1000,
   *   overlap: 200
   * });
   *
   * console.log(`Split into ${chunks.length} chunks`);
   * ```
   */
  chunk(document: Document, config?: ChunkingConfig): readonly Document[] {
    return this.strategy.chunk(document, config);
  }

  /**
   * Chunk multiple documents.
   *
   * More convenient than calling chunk() multiple times.
   *
   * @param documents - Array of documents to chunk
   * @param config - Optional chunking config
   * @returns Flattened array of all chunks
   *
   * @example
   * ```typescript
   * const allChunks = chunker.chunkBatch(
   *   [doc1, doc2, doc3],
   *   { maxChunkSize: 1000 }
   * );
   * ```
   */
  chunkBatch(documents: readonly Document[], config?: ChunkingConfig): readonly Document[] {
    const allChunks: Document[] = [];

    for (const document of documents) {
      const chunks = this.chunk(document, config);
      allChunks.push(...chunks);
    }

    return allChunks;
  }

  /**
   * Get statistics about chunking results.
   *
   * @param chunks - Array of chunks
   * @returns Chunking statistics
   *
   * @example
   * ```typescript
   * const chunks = chunker.chunk(document);
   * const stats = chunker.getStats(chunks);
   *
   * console.log(`Average chunk size: ${stats.averageSize}`);
   * console.log(`Min size: ${stats.minSize}, Max size: ${stats.maxSize}`);
   * ```
   */
  getStats(chunks: readonly Document[]): {
    totalChunks: number;
    totalCharacters: number;
    averageSize: number;
    minSize: number;
    maxSize: number;
  } {
    if (chunks.length === 0) {
      return {
        totalChunks: 0,
        totalCharacters: 0,
        averageSize: 0,
        minSize: 0,
        maxSize: 0
      };
    }

    let totalCharacters = 0;
    let minSize = Infinity;
    let maxSize = 0;

    for (const chunk of chunks) {
      const size = chunk.content.length;
      totalCharacters += size;
      minSize = Math.min(minSize, size);
      maxSize = Math.max(maxSize, size);
    }

    return {
      totalChunks: chunks.length,
      totalCharacters,
      averageSize: Math.round(totalCharacters / chunks.length),
      minSize: minSize === Infinity ? 0 : minSize,
      maxSize
    };
  }

  /**
   * Validate chunks meet size requirements.
   *
   * @param chunks - Array of chunks to validate
   * @param maxSize - Maximum allowed chunk size
   * @returns Array of validation errors (empty if valid)
   *
   * @example
   * ```typescript
   * const errors = chunker.validate(chunks, 1000);
   * if (errors.length > 0) {
   *   console.error('Invalid chunks:', errors);
   * }
   * ```
   */
  validate(chunks: readonly Document[], maxSize: number): string[] {
    const errors: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const size = chunk.content.length;

      if (size === 0) {
        errors.push(`Chunk ${i} is empty`);
      }

      if (size > maxSize) {
        errors.push(`Chunk ${i} exceeds max size: ${size} > ${maxSize}`);
      }
    }

    return errors;
  }
}
