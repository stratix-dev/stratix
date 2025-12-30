/**
 * Execution tracing for AI agents.
 *
 * Captures detailed execution paths including LLM calls, tool invocations,
 * and memory operations.
 *
 * @module observability/tracing
 *
 * @example
 * ```typescript
 * import {
 *   TraceCollector,
 *   ExecutionTraceHelpers
 * } from '@stratix/core/ai-agents/observability/tracing';
 *
 * const collector = new TraceCollector();
 *
 * // Start tracing an execution
 * const trace = collector.startTrace({
 *   agentId: 'customer-support',
 *   sessionId: 'session_123'
 * });
 *
 * // Add steps
 * collector.addStep(trace.traceId, {
 *   name: 'llm.request',
 *   type: 'llm',
 *   startTime: new Date(),
 *   endTime: new Date(),
 *   metadata: { model: 'gpt-4', tokens: 100 }
 * });
 *
 * // Complete trace
 * collector.endTrace(trace.traceId);
 *
 * // Analyze
 * const stats = collector.getStats();
 * console.log(`Total cost: $${stats.totalCost}`);
 * ```
 */

// Trace types
export {
  type ExecutionTrace,
  type TraceStep,
  ExecutionTraceHelpers,
} from './ExecutionTrace.js';

// Trace collector
export { TraceCollector } from './TraceCollector.js';
