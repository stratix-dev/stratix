import type { ExecutionTrace, TraceStep } from './ExecutionTrace.js';
import { ExecutionTraceHelpers } from './ExecutionTrace.js';

/**
 * Collector for execution traces.
 *
 * Manages trace lifecycle and provides query capabilities.
 *
 * @example
 * ```typescript
 * const collector = new TraceCollector();
 *
 * // Start a trace
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
 *   endTime: new Date()
 * });
 *
 * // Complete trace
 * collector.endTrace(trace.traceId);
 *
 * // Query traces
 * const traces = collector.getTracesBySession('session_123');
 * ```
 */
export class TraceCollector {
  private traces = new Map<string, ExecutionTrace>();
  private activeTraces = new Set<string>();

  /**
   * Start a new trace.
   *
   * @param config - Trace config
   * @returns Started trace
   */
  startTrace(config: {
    agentId: string;
    sessionId?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  }): ExecutionTrace {
    const traceId = ExecutionTraceHelpers.generateTraceId();

    const trace = ExecutionTraceHelpers.create({
      traceId,
      ...config
    });

    this.traces.set(traceId, trace);
    this.activeTraces.add(traceId);

    return trace;
  }

  /**
   * Add a step to a trace.
   *
   * @param traceId - Trace ID
   * @param step - Step to add
   */
  addStep(traceId: string, step: TraceStep): void {
    const trace = this.traces.get(traceId);
    if (!trace) return;

    const updated = ExecutionTraceHelpers.addStep(trace, step);
    this.traces.set(traceId, updated);
  }

  /**
   * End a trace.
   *
   * @param traceId - Trace ID
   */
  endTrace(traceId: string): void {
    const trace = this.traces.get(traceId);
    if (!trace) return;

    const completed = ExecutionTraceHelpers.complete(trace);

    // Calculate totals
    const totalCost = ExecutionTraceHelpers.calculateTotalCost(completed);
    const totalTokens = ExecutionTraceHelpers.calculateTotalTokens(completed);

    const final: ExecutionTrace = {
      ...completed,
      totalCost,
      totalTokens
    };

    this.traces.set(traceId, final);
    this.activeTraces.delete(traceId);
  }

  /**
   * Get a trace by ID.
   *
   * @param traceId - Trace ID
   * @returns The trace or undefined if not found
   */
  getTrace(traceId: string): ExecutionTrace | undefined {
    return this.traces.get(traceId);
  }

  /**
   * Get all traces.
   *
   * @returns Array of all traces
   */
  getAllTraces(): readonly ExecutionTrace[] {
    return Array.from(this.traces.values());
  }

  /**
   * Get traces by session ID.
   *
   * @param sessionId - Session ID
   * @returns Array of traces for the session
   */
  getTracesBySession(sessionId: string): readonly ExecutionTrace[] {
    return this.getAllTraces().filter((trace) => trace.sessionId === sessionId);
  }

  /**
   * Get traces by agent ID.
   *
   * @param agentId - Agent ID
   * @returns Array of traces for the agent
   */
  getTracesByAgent(agentId: string): readonly ExecutionTrace[] {
    return this.getAllTraces().filter((trace) => trace.agentId === agentId);
  }

  /**
   * Get active (incomplete) traces.
   *
   * @returns Array of active traces
   */
  getActiveTraces(): readonly ExecutionTrace[] {
    return Array.from(this.activeTraces)
      .map((id) => this.traces.get(id))
      .filter((trace): trace is ExecutionTrace => trace !== undefined);
  }

  /**
   * Get completed traces.
   *
   * @returns Array of completed traces
   */
  getCompletedTraces(): readonly ExecutionTrace[] {
    return this.getAllTraces().filter((trace) => trace.endTime !== undefined);
  }

  /**
   * Clear all traces.
   */
  clear(): void {
    this.traces.clear();
    this.activeTraces.clear();
  }

  /**
   * Get trace statistics.
   *
   * @returns Statistics about collected traces
   */
  getStats(): {
    total: number;
    active: number;
    completed: number;
    averageDuration: number;
    totalCost: number;
    totalTokens: number;
  } {
    const completed = this.getCompletedTraces();

    const durations = completed
      .map((trace) => ExecutionTraceHelpers.getDuration(trace))
      .filter((d): d is number => d !== undefined);

    const averageDuration =
      durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;

    const totalCost = completed.reduce((sum, trace) => sum + (trace.totalCost ?? 0), 0);

    const totalTokens = completed.reduce((sum, trace) => sum + (trace.totalTokens ?? 0), 0);

    return {
      total: this.traces.size,
      active: this.activeTraces.size,
      completed: completed.length,
      averageDuration,
      totalCost,
      totalTokens
    };
  }
}
