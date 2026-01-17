/**
 * Document chunking for RAG.
 *
 * Splits large documents into smaller, manageable chunks for embedding and retrieval.
 *
 * @module rag/chunking
 */

// Chunking strategies
export {
  type ChunkingStrategy,
  type ChunkingConfig,
  FixedSizeChunking,
  ParagraphChunking,
  SentenceChunking
} from './ChunkingStrategy.js';

// Document chunker
export { DocumentChunker } from './DocumentChunker.js';
