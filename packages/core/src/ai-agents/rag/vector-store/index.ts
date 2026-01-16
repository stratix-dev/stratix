/**
 * Vector store for semantic search.
 *
 * Provides storage and retrieval of documents using vector embeddings.
 *
 * @module rag/vector-store
 */

// Document types
export { type Document, DocumentHelpers } from './Document.js';

// Embedding types
export { type Embedding, type SimilarityResult, EmbeddingHelpers } from './Embedding.js';

// Vector store
export { type VectorStore, type VectorStoreQuery, InMemoryVectorStore } from './VectorStore.js';
