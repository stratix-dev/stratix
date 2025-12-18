import type { Document, DocumentMetadata } from './VectorStore.js';

/**
 * Configuration for document chunking
 */
export interface ChunkerConfig {
  /**
   * Maximum size of each chunk in characters
   */
  readonly chunkSize: number;

  /**
   * Number of characters to overlap between chunks
   */
  readonly chunkOverlap: number;

  /**
   * Minimum chunk size (chunks smaller than this will be discarded or merged)
   */
  readonly minChunkSize?: number;
}

/**
 * Result of chunking a document
 */
export interface ChunkResult {
  /**
   * The chunked documents
   */
  readonly chunks: Document[];

  /**
   * Original document metadata
   */
  readonly originalMetadata?: DocumentMetadata;
}

/**
 * Interface for document chunking strategies.
 *
 * Chunkers split large documents into smaller pieces suitable for
 * embedding and retrieval. Different strategies work better for
 * different content types.
 *
 * @example
 * ```typescript
 * const chunker = new RecursiveTextChunker({
 *   chunkSize: 1000,
 *   chunkOverlap: 200
 * });
 *
 * const result = await chunker.chunk({
 *   id: 'doc1',
 *   content: largeDocument,
 *   metadata: { source: 'manual.pdf' }
 * });
 *
 * console.log(`Split into ${result.chunks.length} chunks`);
 * result.chunks.forEach((chunk, i) => {
 *   console.log(`Chunk ${i}: ${chunk.metadata?.chunkIndex}/${chunk.metadata?.totalChunks}`);
 * });
 * ```
 */
export interface DocumentChunker {
  /**
   * Configuration for this chunker
   */
  readonly config: ChunkerConfig;

  /**
   * Split a document into chunks
   *
   * @param document - Document to chunk
   * @returns Chunked documents with metadata
   */
  chunk(document: Document): Promise<ChunkResult>;

  /**
   * Split multiple documents into chunks
   *
   * @param documents - Documents to chunk
   * @returns Array of chunk results
   */
  chunkMany(documents: Document[]): Promise<ChunkResult[]>;

  /**
   * Estimate the number of chunks that will be created
   *
   * @param document - Document to estimate
   * @returns Estimated number of chunks
   */
  estimateChunks(document: Document): number;
}
