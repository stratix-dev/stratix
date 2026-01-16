/**
 * RAG pipeline for retrieval-augmented generation.
 *
 * Orchestrates document ingestion, retrieval, and context formatting.
 *
 * @module rag/pipeline
 */

// Pipeline configuration
export { type RAGPipelineConfig } from './PipelineConfig.js';

// RAG pipeline
export { type RAGRetrievalResult, RAGPipeline } from './RAGPipeline.js';
