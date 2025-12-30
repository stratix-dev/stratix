/**
 * Core execution primitives for AI agents.
 *
 * This module contains the fundamental types and classes for
 * executing agents:
 * - ExecutionContext: Immutable context for tracking execution state
 * - ExecutionResult: Result type with monadic operations
 * - ExecutionEngine: Orchestrates agent execution
 * - ExecutionConfig: Configuration for execution
 */

export { ExecutionContext, type Message } from './ExecutionContext.js';

export { ExecutionResult, ExecutionResultHelpers } from './ExecutionResult.js';

export {
  ExecutionEngine,
  AgentTimeoutError,
  AgentBudgetExceededError,
} from './ExecutionEngine.js';

export { ExecutionConfigHelpers, type ExecutionConfig } from './ExecutionConfig.js';
