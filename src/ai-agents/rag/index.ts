/**
 * Retrieval-Augmented Generation (RAG) for AI agents.
 *
 * Provides components for semantic search and context retrieval:
 * - Vector stores for embedding storage
 * - Document chunking strategies
 * - RAG pipeline for end-to-end workflow
 *
 * @module rag
 *
 * @example
 * ```typescript
 * import {
 *   RAGPipeline,
 *   InMemoryVectorStore,
 *   DocumentChunker,
 *   FixedSizeChunking
 * } from '@stratix/core/ai-agents/rag';
 *
 * // Set up RAG pipeline
 * const vectorStore = new InMemoryVectorStore();
 * const chunker = new DocumentChunker(new FixedSizeChunking());
 * const pipeline = new RAGPipeline(vectorStore, llmProvider, chunker);
 *
 * // Ingest documents
 * await pipeline.ingest(documents);
 *
 * // Retrieve relevant context
 * const results = await pipeline.retrieve('user authentication');
 * const context = pipeline.formatContext(results);
 * ```
 */

// Vector store
export {
  type Document,
  DocumentHelpers,
  type Embedding,
  type SimilarityResult,
  EmbeddingHelpers,
  type VectorStore,
  type VectorStoreQuery,
  InMemoryVectorStore
} from './vector-store/index.js';

// Chunking
export {
  type ChunkingStrategy,
  type ChunkingConfig,
  FixedSizeChunking,
  ParagraphChunking,
  SentenceChunking,
  DocumentChunker
} from './chunking/index.js';

// Pipeline
export { type RAGPipelineConfig, type RAGRetrievalResult, RAGPipeline } from './pipeline/index.js';
