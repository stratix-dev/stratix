/**
 * RAG pipeline for retrieval-augmented generation.
 *
 * Orchestrates document ingestion, retrieval, and context formatting.
 *
 * @module rag/pipeline
 */

// Pipeline config
export { type RAGPipelineConfig } from './PipelineConfig.js';

// RAG pipeline
export { type RAGRetrievalResult, RAGPipeline } from './RAGPipeline.js';
