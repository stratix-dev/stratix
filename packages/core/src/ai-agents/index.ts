/**
 * AI Agents system (v3.0 - Hexagonal Architecture).
 *
 * This module exports the AI agents system with strict DDD/hexagonal architecture:
 * - Domain layer (AgentSpecification, LLMPort)
 * - Application layer (AgentService)
 * - Core primitives (metadata, config)
 * - Supporting modules (guardrails, prompts, memory, tools, RAG, observability, workflows)
 */

// Domain layer (hexagonal architecture) - PURE DOMAIN
export * from './domain/index.js';

// Application layer (hexagonal architecture) - ORCHESTRATION
export * from './application/index.js';

// Core primitives (metadata and configuration types)
export * from './core/index.js';

// Shared types
export * from './shared/TokenUsage.js';
export * from './shared/RetryPolicy.js';
export * from './shared/ExecutionMetadata.js';

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

// Workflows
export * from './workflows/index.js';
