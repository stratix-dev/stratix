/**
 * Tool system for AI agents.
 *
 * Provides base classes and utilities for creating tools that agents can use.
 *
 * @module tools
 */

// Base tool class
export {
  type ToolResult,
  type ToolContext,
  Tool,
  ToolHelpers,
} from './Tool.js';

// Tool registry
export {
  ToolRegistry,
  ToolNotFoundError,
  ToolConflictError,
} from './ToolRegistry.js';

// Tool executor
export {
  type ToolExecutionConfig,
  type ToolCallResult,
  type BatchExecutionResult,
  ToolExecutor,
  TimeoutError,
} from './ToolExecutor.js';
