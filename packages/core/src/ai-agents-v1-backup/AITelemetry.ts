/**
 * AI Telemetry - Comprehensive observability for AI operations
 *
 * Provides structured telemetry for LLM calls, agent executions, RAG retrievals,
 * and workflow steps. Designed for integration with observability platforms
 * like OpenTelemetry, Datadog, New Relic, etc.
 */

/**
 * Span types for different AI operations
 */
export type SpanType =
  | 'agent.execute'
  | 'llm.call'
  | 'llm.stream'
  | 'rag.retrieve'
  | 'rag.ingest'
  | 'tool.execute'
  | 'workflow.execute'
  | 'workflow.step'
  | 'guardrail.evaluate'
  | 'prompt.render';

/**
 * Span status
 */
export type SpanStatus = 'ok' | 'error' | 'unset';

/**
 * Trace context for distributed tracing
 */
export interface TraceContext {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly traceState?: string;
  readonly baggage?: Record<string, string>;
}

/**
 * A telemetry span representing a unit of work
 */
export interface AISpan {
  /**
   * Unique identifier for this span
   */
  readonly id: string;

  /**
   * Span name
   */
  readonly name: string;

  /**
   * Span type
   */
  readonly type: SpanType;

  /**
   * Start time
   */
  readonly startTime: Date;

  /**
   * End time (set when span is completed)
   */
  readonly endTime?: Date;

  /**
   * Span duration in milliseconds
   */
  readonly durationMs?: number;

  /**
   * Span status
   */
  readonly status: SpanStatus;

  /**
   * Error if span failed
   */
  readonly error?: Error;

  /**
   * Span attributes (metadata)
   */
  readonly attributes: Record<string, string | number | boolean>;

  /**
   * Set an attribute on the span
   */
  setAttribute(key: string, value: string | number | boolean): void;

  /**
   * Set multiple attributes
   */
  setAttributes(attributes: Record<string, string | number | boolean>): void;

  /**
   * Record an exception
   */
  recordException(error: Error): void;

  /**
   * Set span status
   */
  setStatus(status: SpanStatus, message?: string): void;

  /**
   * End the span
   */
  end(): void;
}

/**
 * LLM call metrics
 */
export interface LLMMetrics {
  readonly traceId: string;
  readonly spanId: string;
  readonly provider: string;
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  readonly latencyMs: number;
  readonly cost: number;
  readonly success: boolean;
  readonly error?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly topP?: number;
  readonly streaming?: boolean;
  readonly timestamp: Date;
}

/**
 * Agent execution metrics
 */
export interface AgentMetrics {
  readonly traceId: string;
  readonly spanId: string;
  readonly agentId: string;
  readonly agentVersion: string;
  readonly inputSize: number;
  readonly outputSize: number;
  readonly latencyMs: number;
  readonly llmCalls: number;
  readonly toolCalls: number;
  readonly totalTokens: number;
  readonly totalCost: number;
  readonly success: boolean;
  readonly error?: string;
  readonly timestamp: Date;
}

/**
 * RAG retrieval metrics
 */
export interface RetrievalMetrics {
  readonly traceId: string;
  readonly spanId: string;
  readonly pipelineId: string;
  readonly query: string;
  readonly topK: number;
  readonly documentsRetrieved: number;
  readonly latencyMs: number;
  readonly embeddingLatencyMs?: number;
  readonly searchLatencyMs?: number;
  readonly success: boolean;
  readonly error?: string;
  readonly timestamp: Date;
}

/**
 * Workflow execution metrics
 */
export interface WorkflowMetrics {
  readonly traceId: string;
  readonly spanId: string;
  readonly workflowId: string;
  readonly workflowVersion: string;
  readonly totalSteps: number;
  readonly completedSteps: number;
  readonly failedSteps: number;
  readonly skippedSteps: number;
  readonly latencyMs: number;
  readonly success: boolean;
  readonly error?: string;
  readonly timestamp: Date;
}

/**
 * Guardrail evaluation metrics
 */
export interface GuardrailMetrics {
  readonly traceId: string;
  readonly spanId: string;
  readonly guardrailId: string;
  readonly passed: boolean;
  readonly violations: number;
  readonly severity: string;
  readonly latencyMs: number;
  readonly timestamp: Date;
}

/**
 * Tool execution metrics
 */
export interface ToolMetrics {
  readonly traceId: string;
  readonly spanId: string;
  readonly toolName: string;
  readonly inputSize: number;
  readonly outputSize: number;
  readonly latencyMs: number;
  readonly success: boolean;
  readonly error?: string;
  readonly timestamp: Date;
}

/**
 * Telemetry exporter interface
 */
export interface TelemetryExporter {
  /**
   * Export a span
   */
  exportSpan(span: AISpan): Promise<void>;

  /**
   * Export metrics
   */
  exportMetrics(metrics: unknown): Promise<void>;

  /**
   * Flush any buffered telemetry
   */
  flush(): Promise<void>;

  /**
   * Shutdown the exporter
   */
  shutdown(): Promise<void>;
}

/**
 * Main AI Telemetry interface
 */
export interface AITelemetry {
  /**
   * Start a trace span
   */
  startSpan(name: string, type: SpanType, parentSpan?: AISpan): AISpan;

  /**
   * Get current active span
   */
  getActiveSpan(): AISpan | undefined;

  /**
   * Set active span
   */
  setActiveSpan(span: AISpan | undefined): void;

  /**
   * Record LLM metrics
   */
  recordLLMCall(metrics: LLMMetrics): void;

  /**
   * Record agent execution metrics
   */
  recordAgentExecution(metrics: AgentMetrics): void;

  /**
   * Record RAG retrieval metrics
   */
  recordRetrieval(metrics: RetrievalMetrics): void;

  /**
   * Record workflow execution metrics
   */
  recordWorkflow(metrics: WorkflowMetrics): void;

  /**
   * Record guardrail evaluation metrics
   */
  recordGuardrail(metrics: GuardrailMetrics): void;

  /**
   * Record tool execution metrics
   */
  recordTool(metrics: ToolMetrics): void;

  /**
   * Get current trace context
   */
  getContext(): TraceContext;

  /**
   * Set trace context (for distributed tracing)
   */
  setContext(context: TraceContext): void;

  /**
   * Get all recorded metrics
   */
  getMetrics(): TelemetryMetrics;

  /**
   * Clear all recorded data
   */
  clear(): void;

  /**
   * Add a telemetry exporter
   */
  addExporter(exporter: TelemetryExporter): void;

  /**
   * Flush all telemetry data
   */
  flush(): Promise<void>;
}

/**
 * Aggregated telemetry metrics
 */
export interface TelemetryMetrics {
  readonly llmCalls: LLMMetrics[];
  readonly agentExecutions: AgentMetrics[];
  readonly retrievals: RetrievalMetrics[];
  readonly workflows: WorkflowMetrics[];
  readonly guardrails: GuardrailMetrics[];
  readonly tools: ToolMetrics[];
  readonly totalSpans: number;
  readonly totalCost: number;
  readonly totalTokens: number;
  readonly totalLatencyMs: number;
}

/**
 * Telemetry configuration
 */
export interface TelemetryConfig {
  readonly enabled: boolean;
  readonly serviceName: string;
  readonly serviceVersion: string;
  readonly environment?: string;
  readonly sampleRate?: number;
  readonly exporters?: TelemetryExporter[];
  readonly attributes?: Record<string, string | number | boolean>;
}
