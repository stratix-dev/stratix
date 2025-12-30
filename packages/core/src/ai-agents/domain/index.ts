/**
 * Domain layer for AI agents.
 *
 * This module contains pure domain entities and abstractions.
 * No I/O operations or infrastructure dependencies.
 */

export { AgentSpecification } from './AgentSpecification.js';
export type { AgentSpecificationId } from './AgentSpecification.js';

// LLMPort types (avoiding conflicts with LLM module)
export type {
  LLMPort,
  LLMRequest,
  LLMCompletionResponse,
  TokenUsage as DomainTokenUsage,
  ToolCall as DomainToolCall,
  LLMStreamChunk as DomainLLMStreamChunk,
} from './ports/LLMPort.js';
export { LLMPortHelpers } from './ports/LLMPort.js';
