/**
 * LLM (Large Language Model) integration subsystem.
 *
 * Provides interfaces and types for integrating with LLM providers like OpenAI, Anthropic, etc.
 *
 * @module llm
 */

// Message types
export {
  type MessageRole,
  type MessageContent,
  type TextContent,
  type ImageContent,
  type ImageSource,
  type ToolCall,
  type ToolResult,
  type LLMMessage,
  LLMMessageHelpers,
} from './LLMMessage.js';

// Response types
export {
  type FinishReason,
  type LLMResponse,
  type LLMStreamChunk,
  type ToolCallDelta,
  type Embedding,
  type EmbeddingResponse,
  LLMResponseHelpers,
} from './LLMResponse.js';

// Provider interface
export {
  type ToolDefinition,
  type ResponseFormat,
  type ChatCompletionParams,
  type EmbeddingParams,
  type ProviderCapabilities,
  type LLMProvider,
  LLMProviderHelpers,
} from './LLMProvider.js';
