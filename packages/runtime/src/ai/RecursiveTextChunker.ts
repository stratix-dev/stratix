import type {
  DocumentChunker,
  ChunkerConfig,
  ChunkResult,
  Document,
} from '@stratix/core';

/**
 * Recursive text chunking strategy.
 *
 * Splits text using a hierarchy of separators (paragraphs, sentences, words)
 * to maintain semantic coherence while respecting size constraints.
 *
 * The algorithm tries to split on:
 * 1. Double newlines (paragraphs)
 * 2. Single newlines
 * 3. Sentences (. ! ?)
 * 4. Words (spaces)
 *
 * @example
 * ```typescript
 * const chunker = new RecursiveTextChunker({
 *   chunkSize: 1000,
 *   chunkOverlap: 200,
 *   minChunkSize: 100
 * });
 *
 * const result = await chunker.chunk({
 *   id: 'doc1',
 *   content: largeText,
 *   metadata: { source: 'manual.pdf' }
 * });
 * ```
 */
export class RecursiveTextChunker implements DocumentChunker {
  readonly config: ChunkerConfig;

  private readonly separators: string[] = [
    '\n\n', // Paragraphs
    '\n', // Lines
    '. ', // Sentences
    '! ',
    '? ',
    ' ', // Words
  ];

  constructor(config: ChunkerConfig) {
    this.config = config;

    // Validate config
    if (config.chunkSize <= 0) {
      throw new Error('chunkSize must be positive');
    }

    if (config.chunkOverlap < 0) {
      throw new Error('chunkOverlap cannot be negative');
    }

    if (config.chunkOverlap >= config.chunkSize) {
      throw new Error('chunkOverlap must be less than chunkSize');
    }
  }

  async chunk(document: Document): Promise<ChunkResult> {
    const chunks = this.splitText(document.content);
    const minSize = this.config.minChunkSize ?? 0;

    // Filter out chunks that are too small
    const filteredChunks = chunks.filter((chunk) => chunk.length >= minSize);

    // Create document chunks with metadata
    const chunkDocuments: Document[] = filteredChunks.map((content, index) => ({
      id: `${document.id}_chunk_${index}`,
      content,
      metadata: {
        ...document.metadata,
        chunkIndex: index,
        totalChunks: filteredChunks.length,
        source: document.metadata?.source,
      },
    }));

    return {
      chunks: chunkDocuments,
      originalMetadata: document.metadata,
    };
  }

  async chunkMany(documents: Document[]): Promise<ChunkResult[]> {
    return Promise.all(documents.map((doc) => this.chunk(doc)));
  }

  estimateChunks(document: Document): number {
    const contentLength = document.content.length;
    const effectiveChunkSize = this.config.chunkSize - this.config.chunkOverlap;

    if (effectiveChunkSize <= 0) {
      return 1;
    }

    return Math.ceil(contentLength / effectiveChunkSize);
  }

  /**
   * Recursively split text using different separators
   */
  private splitText(text: string): string[] {
    return this.splitTextRecursive(text, this.separators);
  }

  /**
   * Recursive splitting algorithm
   */
  private splitTextRecursive(text: string, separators: string[]): string[] {
    // Base case: text is small enough
    if (text.length <= this.config.chunkSize) {
      return [text];
    }

    // If no more separators, force split by character position
    if (separators.length === 0) {
      return this.forceSplit(text);
    }

    const [separator, ...remainingSeparators] = separators;
    const parts = text.split(separator);

    const chunks: string[] = [];
    let currentChunk = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      // Reconstruct with separator (except for last part)
      const pieceWithSeparator =
        i < parts.length - 1 ? part + separator : part;

      // If adding this piece exceeds chunk size
      if (currentChunk.length + pieceWithSeparator.length > this.config.chunkSize) {
        // If we have accumulated content, save it
        if (currentChunk) {
          chunks.push(currentChunk.trim());

          // Start new chunk with overlap
          const overlapText = this.getOverlapText(currentChunk);
          currentChunk = overlapText;
        }

        // If the piece itself is too large, split it further
        if (pieceWithSeparator.length > this.config.chunkSize) {
          const subChunks = this.splitTextRecursive(
            pieceWithSeparator,
            remainingSeparators
          );

          for (const subChunk of subChunks) {
            if (currentChunk.length + subChunk.length <= this.config.chunkSize) {
              currentChunk += subChunk;
            } else {
              if (currentChunk) {
                chunks.push(currentChunk.trim());
                const overlapText = this.getOverlapText(currentChunk);
                currentChunk = overlapText + subChunk;
              } else {
                // Chunk is larger than max size, force it
                chunks.push(subChunk.trim());
                currentChunk = this.getOverlapText(subChunk);
              }
            }
          }
        } else {
          currentChunk += pieceWithSeparator;
        }
      } else {
        currentChunk += pieceWithSeparator;
      }
    }

    // Add remaining chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Get overlap text from the end of a chunk
   */
  private getOverlapText(text: string): string {
    if (this.config.chunkOverlap === 0) {
      return '';
    }

    const overlapLength = Math.min(this.config.chunkOverlap, text.length);
    return text.slice(-overlapLength);
  }

  /**
   * Force split text by character position when no separators work
   */
  private forceSplit(text: string): string[] {
    const chunks: string[] = [];
    let position = 0;

    while (position < text.length) {
      const end = Math.min(position + this.config.chunkSize, text.length);
      const chunk = text.slice(position, end);
      chunks.push(chunk);

      // Move position forward
      // If we're at the end, we're done
      if (end === text.length) {
        break;
      }

      // Otherwise, move forward by (chunkSize - overlap) to create overlap
      position += this.config.chunkSize - this.config.chunkOverlap;
    }

    return chunks;
  }
}
