/**
 * AI Agents system (v2.0).
 *
 * This module exports the complete AI agents system including:
 * - Shared types and primitives
 * - Core agent and execution system
 * - LLM provider interfaces
 * - Guardrails
 * - Prompts
 * - Memory
 * - Tools
 * - RAG
 * - Observability
 * - Orchestration
 * - Workflows
 * - Streaming
 *
 * Note: This is the new v2.0 architecture - a complete rewrite.
 */

// Shared types
export * from './shared/TokenUsage.js';
export * from './shared/RetryPolicy.js';
export * from './shared/ExecutionMetadata.js';

// Core system
export * from './core/index.js';

// LLM provider interfaces
export * from './llm/index.js';

// Guardrails
export * from './guardrails/index.js';

// Prompts
export * from './prompts/index.js';

// Memory
export * from './memory/index.js';

// Tools (renamed to avoid conflicts)
export {
  type ToolResult as AgentToolResult,
  type ToolContext,
  Tool,
  ToolHelpers,
  ToolRegistry,
  ToolNotFoundError,
  ToolConflictError,
  type ToolExecutionConfig,
  type ToolCallResult,
  type BatchExecutionResult,
  ToolExecutor,
  TimeoutError,
} from './tools/index.js';

// RAG (renamed Embedding to RAGEmbedding to avoid conflict)
export {
  type Document,
  DocumentHelpers,
  type Embedding as RAGEmbedding,
  type SimilarityResult,
  EmbeddingHelpers,
  type VectorStore,
  type VectorStoreQuery,
  InMemoryVectorStore,
  type ChunkingStrategy,
  type ChunkingConfig,
  FixedSizeChunking,
  ParagraphChunking,
  SentenceChunking,
  DocumentChunker,
  type RAGPipelineConfig,
  type RAGRetrievalResult,
  RAGPipeline,
} from './rag/index.js';

// Observability
export * from './observability/index.js';

// Orchestration
export * from './orchestration/index.js';

// Workflows
export * from './workflows/index.js';

// Streaming
export * from './streaming/index.js';

// Domain layer (for hexagonal architecture)
export * from './domain/index.js';

// Application layer (for hexagonal architecture)
export * from './application/index.js';
