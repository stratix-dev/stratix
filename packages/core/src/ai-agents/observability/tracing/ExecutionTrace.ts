/**
 * Trace step within an execution.
 */
export interface TraceStep {
  /**
   * Step name.
   */
  readonly name: string;

  /**
   * Step type (e.g., 'llm', 'tool', 'memory', 'agent').
   */
  readonly type: string;

  /**
   * Start timestamp.
   */
  readonly startTime: Date;

  /**
   * End timestamp (if completed).
   */
  readonly endTime?: Date;

  /**
   * Input data (may be truncated for large inputs).
   */
  readonly input?: unknown;

  /**
   * Output data (may be truncated for large outputs).
   */
  readonly output?: unknown;

  /**
   * Error information (if failed).
   */
  readonly error?: {
    readonly message: string;
    readonly stack?: string;
  };

  /**
   * Step metadata.
   */
  readonly metadata?: Readonly<Record<string, unknown>>;

  /**
   * Nested steps (for hierarchical traces).
   */
  readonly children?: readonly TraceStep[];
}

/**
 * Complete execution trace.
 *
 * Captures the full execution path of an agent, including:
 * - LLM calls
 * - Tool invocations
 * - Memory operations
 * - Sub-agent executions
 *
 * @example
 * ```typescript
 * const trace: ExecutionTrace = {
 *   traceId: 'trace_123',
 *   agentId: 'customer-support',
 *   sessionId: 'session_456',
 *   startTime: new Date(),
 *   endTime: new Date(),
 *   steps: [
 *     {
 *       name: 'llm.request',
 *       type: 'llm',
 *       startTime: new Date(),
 *       endTime: new Date(),
 *       input: { messages: [...] },
 *       output: { text: '...' }
 *     }
 *   ]
 * };
 * ```
 */
export interface ExecutionTrace {
  /**
   * Unique trace ID.
   */
  readonly traceId: string;

  /**
   * Agent ID that was executed.
   */
  readonly agentId: string;

  /**
   * Session ID.
   */
  readonly sessionId?: string;

  /**
   * User ID.
   */
  readonly userId?: string;

  /**
   * Trace start time.
   */
  readonly startTime: Date;

  /**
   * Trace end time (if completed).
   */
  readonly endTime?: Date;

  /**
   * Trace steps.
   */
  readonly steps: readonly TraceStep[];

  /**
   * Total token usage across all LLM calls.
   */
  readonly totalTokens?: number;

  /**
   * Total cost across all operations.
   */
  readonly totalCost?: number;

  /**
   * Trace metadata.
   */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Helper functions for working with execution traces.
 */
export const ExecutionTraceHelpers = {
  /**
   * Create a new execution trace.
   *
   * @param config - Trace configuration
   * @returns Execution trace
   */
  create(config: {
    traceId: string;
    agentId: string;
    sessionId?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  }): ExecutionTrace {
    return {
      traceId: config.traceId,
      agentId: config.agentId,
      sessionId: config.sessionId,
      userId: config.userId,
      startTime: new Date(),
      steps: [],
      metadata: config.metadata
    };
  },

  /**
   * Add a step to a trace.
   *
   * @param trace - The trace
   * @param step - The step to add
   * @returns Updated trace
   */
  addStep(trace: ExecutionTrace, step: TraceStep): ExecutionTrace {
    return {
      ...trace,
      steps: [...trace.steps, step]
    };
  },

  /**
   * Complete a trace.
   *
   * @param trace - The trace to complete
   * @returns Completed trace
   */
  complete(trace: ExecutionTrace): ExecutionTrace {
    return {
      ...trace,
      endTime: new Date()
    };
  },

  /**
   * Calculate total duration of a trace.
   *
   * @param trace - The trace
   * @returns Duration in ms, or undefined if not completed
   */
  getDuration(trace: ExecutionTrace): number | undefined {
    if (!trace.endTime) return undefined;
    return trace.endTime.getTime() - trace.startTime.getTime();
  },

  /**
   * Count steps by type.
   *
   * @param trace - The trace
   * @returns Map of step type to count
   */
  countStepsByType(trace: ExecutionTrace): Map<string, number> {
    const counts = new Map<string, number>();

    for (const step of trace.steps) {
      counts.set(step.type, (counts.get(step.type) ?? 0) + 1);
    }

    return counts;
  },

  /**
   * Find steps by type.
   *
   * @param trace - The trace
   * @param type - Step type to find
   * @returns Array of matching steps
   */
  findStepsByType(trace: ExecutionTrace, type: string): readonly TraceStep[] {
    return trace.steps.filter((step) => step.type === type);
  },

  /**
   * Calculate total cost from steps.
   *
   * @param trace - The trace
   * @returns Total cost, or undefined if no costs recorded
   */
  calculateTotalCost(trace: ExecutionTrace): number | undefined {
    let total = 0;
    let hasCost = false;

    for (const step of trace.steps) {
      if (step.metadata?.cost !== undefined) {
        total += Number(step.metadata.cost);
        hasCost = true;
      }
    }

    return hasCost ? total : undefined;
  },

  /**
   * Calculate total tokens from LLM steps.
   *
   * @param trace - The trace
   * @returns Total tokens, or undefined if no token counts recorded
   */
  calculateTotalTokens(trace: ExecutionTrace): number | undefined {
    const llmSteps = this.findStepsByType(trace, 'llm');
    let total = 0;
    let hasTokens = false;

    for (const step of llmSteps) {
      if (step.metadata?.totalTokens !== undefined) {
        total += Number(step.metadata.totalTokens);
        hasTokens = true;
      }
    }

    return hasTokens ? total : undefined;
  },

  /**
   * Generate a unique trace ID.
   *
   * @returns Trace ID
   */
  generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};
