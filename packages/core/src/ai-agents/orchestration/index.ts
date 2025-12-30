/**
 * Agent orchestration utilities for coordinating multiple agents.
 *
 * This module provides type-safe patterns for sequential and parallel agent execution,
 * along with delegation utilities for dynamic agent selection.
 *
 * @module orchestration
 */

// Pipeline - Type-safe sequential execution
export { Pipeline, PipelineBuilder } from './Pipeline.js';

// DynamicPipeline - Runtime sequential execution
export { DynamicPipeline } from './DynamicPipeline.js';

// ParallelExecutor - Type-safe parallel execution
export {
  ParallelExecutor,
  DynamicParallelExecutor,
  type ParallelTask,
} from './ParallelExecutor.js';

// Delegation - Agent selection and delegation
export {
  Delegation,
  AgentPool,
  NoDelegateFoundError,
  type AgentSelector,
  CapabilitySelector,
  MultiCapabilitySelector,
  AnyCapabilitySelector,
  FirstAgentSelector,
  RandomAgentSelector,
  RoundRobinSelector,
  PredicateSelector,
} from './Delegation.js';
