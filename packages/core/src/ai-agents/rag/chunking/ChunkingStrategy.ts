import type { Document } from '../vector-store/Document.js';
import { DocumentHelpers } from '../vector-store/Document.js';

/**
 * Configuration for chunking.
 */
export interface ChunkingConfig {
  /**
   * Maximum chunk size in characters.
   * Default: 1000
   */
  readonly maxChunkSize?: number;

  /**
   * Overlap between chunks in characters.
   * Helps preserve context across chunk boundaries.
   * Default: 200
   */
  readonly overlap?: number;

  /**
   * Separator to split on (for text-based strategies).
   * Default: '\n\n' (paragraph separator)
   */
  readonly separator?: string;

  /**
   * Whether to preserve metadata from source document.
   * Default: true
   */
  readonly preserveMetadata?: boolean;
}

/**
 * Strategy for chunking documents.
 *
 * Different strategies are suitable for different document types:
 * - FixedSizeChunking: Simple, fixed-size chunks with overlap
 * - ParagraphChunking: Split on paragraph boundaries
 * - SentenceChunking: Split on sentence boundaries
 * - TokenChunking: Split by token count (for LLM context limits)
 */
export interface ChunkingStrategy {
  /**
   * Chunk a document into smaller pieces.
   *
   * @param document - The document to chunk
   * @param config - Chunking configuration
   * @returns Array of document chunks
   */
  chunk(
    document: Document,
    config?: ChunkingConfig
  ): readonly Document[];
}

/**
 * Fixed-size chunking strategy.
 *
 * Splits documents into fixed-size chunks with optional overlap.
 * Simple but effective for most use cases.
 *
 * @example
 * ```typescript
 * const strategy = new FixedSizeChunking();
 * const chunks = strategy.chunk(document, {
 *   maxChunkSize: 1000,
 *   overlap: 200
 * });
 * ```
 */
export class FixedSizeChunking implements ChunkingStrategy {
  chunk(
    document: Document,
    config: ChunkingConfig = {}
  ): readonly Document[] {
    const maxSize = config.maxChunkSize ?? 1000;
    const overlap = config.overlap ?? 200;
    const preserveMetadata = config.preserveMetadata ?? true;

    const text = document.content;
    const chunks: Document[] = [];

    let start = 0;
    let chunkIndex = 0;

    while (start < text.length) {
      const end = Math.min(start + maxSize, text.length);
      const chunkText = text.slice(start, end);

      const metadata = preserveMetadata
        ? {
            ...document.metadata,
            sourceDocumentId: document.id,
            chunkIndex,
            chunkStart: start,
            chunkEnd: end,
          }
        : {
            sourceDocumentId: document.id,
            chunkIndex,
          };

      chunks.push(
        DocumentHelpers.create(
          `${document.id}_chunk_${chunkIndex}`,
          chunkText,
          metadata
        )
      );

      chunkIndex++;
      start += maxSize - overlap;
    }

    return chunks;
  }
}

/**
 * Paragraph-based chunking strategy.
 *
 * Splits documents on paragraph boundaries, then combines paragraphs
 * to reach target chunk size.
 *
 * Better preserves semantic meaning than fixed-size chunking.
 *
 * @example
 * ```typescript
 * const strategy = new ParagraphChunking();
 * const chunks = strategy.chunk(document, {
 *   maxChunkSize: 1000,
 *   separator: '\n\n'
 * });
 * ```
 */
export class ParagraphChunking implements ChunkingStrategy {
  chunk(
    document: Document,
    config: ChunkingConfig = {}
  ): readonly Document[] {
    const maxSize = config.maxChunkSize ?? 1000;
    const separator = config.separator ?? '\n\n';
    const preserveMetadata = config.preserveMetadata ?? true;

    const paragraphs = document.content.split(separator);
    const chunks: Document[] = [];
    let currentChunk = '';
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      if (paragraph.trim().length === 0) continue;

      // If adding this paragraph would exceed max size, start new chunk
      if (
        currentChunk.length > 0 &&
        currentChunk.length + paragraph.length > maxSize
      ) {
        const metadata = preserveMetadata
          ? {
              ...document.metadata,
              sourceDocumentId: document.id,
              chunkIndex,
            }
          : {
              sourceDocumentId: document.id,
              chunkIndex,
            };

        chunks.push(
          DocumentHelpers.create(
            `${document.id}_chunk_${chunkIndex}`,
            currentChunk.trim(),
            metadata
          )
        );

        chunkIndex++;
        currentChunk = '';
      }

      currentChunk += (currentChunk ? separator : '') + paragraph;
    }

    // Add final chunk
    if (currentChunk.trim().length > 0) {
      const metadata = preserveMetadata
        ? {
            ...document.metadata,
            sourceDocumentId: document.id,
            chunkIndex,
          }
        : {
            sourceDocumentId: document.id,
            chunkIndex,
          };

      chunks.push(
        DocumentHelpers.create(
          `${document.id}_chunk_${chunkIndex}`,
          currentChunk.trim(),
          metadata
        )
      );
    }

    return chunks;
  }
}

/**
 * Sentence-based chunking strategy.
 *
 * Splits documents on sentence boundaries, then combines sentences
 * to reach target chunk size.
 *
 * Provides the best semantic coherence but may be slower.
 *
 * @example
 * ```typescript
 * const strategy = new SentenceChunking();
 * const chunks = strategy.chunk(document, {
 *   maxChunkSize: 500
 * });
 * ```
 */
export class SentenceChunking implements ChunkingStrategy {
  chunk(
    document: Document,
    config: ChunkingConfig = {}
  ): readonly Document[] {
    const maxSize = config.maxChunkSize ?? 1000;
    const preserveMetadata = config.preserveMetadata ?? true;

    // Simple sentence splitting (can be improved with proper NLP)
    const sentences = document.content.match(/[^.!?]+[.!?]+/g) || [
      document.content,
    ];

    const chunks: Document[] = [];
    let currentChunk = '';
    let chunkIndex = 0;

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length === 0) continue;

      // If adding this sentence would exceed max size, start new chunk
      if (currentChunk.length > 0 && currentChunk.length + trimmed.length > maxSize) {
        const metadata = preserveMetadata
          ? {
              ...document.metadata,
              sourceDocumentId: document.id,
              chunkIndex,
            }
          : {
              sourceDocumentId: document.id,
              chunkIndex,
            };

        chunks.push(
          DocumentHelpers.create(
            `${document.id}_chunk_${chunkIndex}`,
            currentChunk.trim(),
            metadata
          )
        );

        chunkIndex++;
        currentChunk = '';
      }

      currentChunk += (currentChunk ? ' ' : '') + trimmed;
    }

    // Add final chunk
    if (currentChunk.trim().length > 0) {
      const metadata = preserveMetadata
        ? {
            ...document.metadata,
            sourceDocumentId: document.id,
            chunkIndex,
          }
        : {
            sourceDocumentId: document.id,
            chunkIndex,
          };

      chunks.push(
        DocumentHelpers.create(
          `${document.id}_chunk_${chunkIndex}`,
          currentChunk.trim(),
          metadata
        )
      );
    }

    return chunks;
  }
}
