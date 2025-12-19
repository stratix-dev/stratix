import type {
  DocumentChunker,
  ChunkerConfig,
  ChunkResult,
  Document,
} from '@stratix/core';

/**
 * Markdown-aware chunking strategy.
 *
 * Splits markdown documents while respecting document structure:
 * - Tries to keep sections under the same header together
 * - Preserves code blocks
 * - Respects list structures
 * - Maintains document hierarchy
 *
 * The chunker splits on markdown headers (# ## ### etc.) and tries to
 * keep content under each header as a coherent unit.
 *
 * @example
 * ```typescript
 * const chunker = new MarkdownChunker({
 *   chunkSize: 1000,
 *   chunkOverlap: 100
 * });
 *
 * const result = await chunker.chunk({
 *   id: 'readme',
 *   content: markdownContent,
 *   metadata: { source: 'README.md' }
 * });
 * ```
 */
export class MarkdownChunker implements DocumentChunker {
  readonly config: ChunkerConfig;

  constructor(config: ChunkerConfig) {
    this.config = config;

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

  chunk(document: Document): Promise<ChunkResult> {
    const sections = this.extractSections(document.content);
    const chunks: Document[] = [];
    let currentChunk = '';
    let chunkIndex = 0;

    const minSize = this.config.minChunkSize ?? 0;

    for (const section of sections) {
      const sectionText = section.header + section.content;

      // If adding this section exceeds chunk size
      if (currentChunk.length + sectionText.length > this.config.chunkSize) {
        // Save current chunk if not empty
        if (currentChunk.trim() && currentChunk.length >= minSize) {
          chunks.push({
            id: `${document.id}_chunk_${chunkIndex}`,
            content: currentChunk.trim(),
            metadata: {
              ...document.metadata,
              chunkIndex,
              totalChunks: 0, // Will update later
            },
          });
          chunkIndex++;
        }

        // Start new chunk
        // Include previous section's header in overlap if configured
        if (this.config.chunkOverlap > 0 && currentChunk) {
          const overlapText = this.getOverlapText(currentChunk);
          currentChunk = overlapText + sectionText;
        } else {
          currentChunk = sectionText;
        }

        // If section itself is too large, split it
        if (sectionText.length > this.config.chunkSize) {
          const subChunks = this.splitLargeSection(section);

          for (const subChunk of subChunks) {
            if (subChunk.length >= minSize) {
              chunks.push({
                id: `${document.id}_chunk_${chunkIndex}`,
                content: subChunk.trim(),
                metadata: {
                  ...document.metadata,
                  chunkIndex,
                  totalChunks: 0,
                },
              });
              chunkIndex++;
            }
          }

          currentChunk = this.getOverlapText(subChunks[subChunks.length - 1] || '');
        }
      } else {
        currentChunk += sectionText;
      }
    }

    // Add final chunk
    if (currentChunk.trim() && currentChunk.length >= minSize) {
      chunks.push({
        id: `${document.id}_chunk_${chunkIndex}`,
        content: currentChunk.trim(),
        metadata: {
          ...document.metadata,
          chunkIndex,
          totalChunks: 0, // Will update below
        },
      });
    }

    // Update totalChunks in all chunks by recreating them
    const totalChunks = chunks.length;
    const updatedChunks = chunks.map((chunk) => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        totalChunks,
      },
    }));

    return Promise.resolve({
      chunks: updatedChunks,
      originalMetadata: document.metadata,
    });
  }

  async chunkMany(documents: Document[]): Promise<ChunkResult[]> {
    return Promise.all(documents.map((doc) => this.chunk(doc)));
  }

  estimateChunks(document: Document): number {
    const sections = this.extractSections(document.content);
    let estimatedChunks = 0;
    let currentSize = 0;

    for (const section of sections) {
      const sectionSize = section.header.length + section.content.length;

      if (currentSize + sectionSize > this.config.chunkSize) {
        estimatedChunks++;
        currentSize = sectionSize;
      } else {
        currentSize += sectionSize;
      }
    }

    if (currentSize > 0) {
      estimatedChunks++;
    }

    return estimatedChunks || 1;
  }

  /**
   * Extract markdown sections based on headers
   */
  private extractSections(text: string): Array<{ header: string; content: string }> {
    const lines = text.split('\n');
    const sections: Array<{ header: string; content: string }> = [];
    let currentHeader = '';
    let currentContent = '';

    for (const line of lines) {
      // Check if line is a header
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headerMatch) {
        // Save previous section
        if (currentHeader || currentContent) {
          sections.push({
            header: currentHeader,
            content: currentContent,
          });
        }

        // Start new section
        currentHeader = line + '\n';
        currentContent = '';
      } else {
        currentContent += line + '\n';
      }
    }

    // Add final section
    if (currentHeader || currentContent) {
      sections.push({
        header: currentHeader,
        content: currentContent,
      });
    }

    return sections.length > 0 ? sections : [{ header: '', content: text }];
  }

  /**
   * Split a large section into smaller chunks
   */
  private splitLargeSection(section: { header: string; content: string }): string[] {
    const chunks: string[] = [];
    const header = section.header;
    const content = section.content;

    // Try splitting on paragraphs first
    const paragraphs = content.split('\n\n');
    let currentChunk = header;

    for (const para of paragraphs) {
      if (currentChunk.length + para.length + 2 > this.config.chunkSize) {
        if (currentChunk !== header) {
          chunks.push(currentChunk.trim());
          currentChunk = header + this.getOverlapText(currentChunk);
        }

        // If paragraph itself is too large, split by lines
        if (para.length > this.config.chunkSize) {
          const lines = para.split('\n');

          for (const line of lines) {
            if (currentChunk.length + line.length + 1 > this.config.chunkSize) {
              chunks.push(currentChunk.trim());
              currentChunk = header + this.getOverlapText(currentChunk);
            }
            currentChunk += line + '\n';
          }
        } else {
          currentChunk += para + '\n\n';
        }
      } else {
        currentChunk += para + '\n\n';
      }
    }

    if (currentChunk.trim() && currentChunk !== header.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [header + content];
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
}
