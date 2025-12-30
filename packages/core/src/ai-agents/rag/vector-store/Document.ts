/**
 * A document stored in the vector store.
 *
 * Documents can be entire texts or chunks of larger documents.
 */
export interface Document {
  /**
   * Unique identifier for this document.
   */
  readonly id: string;

  /**
   * The document content (text).
   */
  readonly content: string;

  /**
   * Optional metadata about the document.
   *
   * Examples:
   * - source: URL or file path
   * - title: Document title
   * - author: Document author
   * - timestamp: When document was created/indexed
   * - chunkIndex: Position in original document (for chunks)
   */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Helper functions for working with documents.
 */
export const DocumentHelpers = {
  /**
   * Create a document.
   *
   * @param id - Document ID
   * @param content - Document content
   * @param metadata - Optional metadata
   * @returns Document
   *
   * @example
   * ```typescript
   * const doc = DocumentHelpers.create(
   *   'doc1',
   *   'This is the content',
   *   { source: 'manual.pdf', page: 1 }
   * );
   * ```
   */
  create(
    id: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Document {
    return { id, content, metadata };
  },

  /**
   * Generate a unique document ID.
   *
   * @param prefix - Optional prefix
   * @returns Unique ID
   *
   * @example
   * ```typescript
   * const id = DocumentHelpers.generateId('doc');
   * // => 'doc_1234567890_abc123'
   * ```
   */
  generateId(prefix = 'doc'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Extract text from a document.
   *
   * @param doc - The document
   * @returns Content string
   */
  getText(doc: Document): string {
    return doc.content;
  },

  /**
   * Get document length in characters.
   *
   * @param doc - The document
   * @returns Character count
   */
  getLength(doc: Document): number {
    return doc.content.length;
  },

  /**
   * Estimate token count for a document.
   *
   * Uses a rough heuristic: 1 token ≈ 4 characters.
   * For accurate counts, use a proper tokenizer.
   *
   * @param doc - The document
   * @returns Estimated token count
   */
  estimateTokens(doc: Document): number {
    return Math.ceil(doc.content.length / 4);
  },

  /**
   * Check if document is empty.
   *
   * @param doc - The document
   * @returns True if content is empty
   */
  isEmpty(doc: Document): boolean {
    return doc.content.trim().length === 0;
  },
};
