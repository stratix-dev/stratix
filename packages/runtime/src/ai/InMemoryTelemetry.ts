import type {
  AITelemetry,
  AISpan,
  SpanType,
  SpanStatus,
  TraceContext,
  LLMMetrics,
  AgentMetrics,
  RetrievalMetrics,
  WorkflowMetrics,
  GuardrailMetrics,
  ToolMetrics,
  TelemetryExporter,
  TelemetryMetrics,
  TelemetryConfig,
} from '@stratix/core/ai-agents';

/**
 * In-memory implementation of AISpan
 */
export class InMemorySpan implements AISpan {
  public readonly id: string;
  public readonly name: string;
  public readonly type: SpanType;
  public readonly startTime: Date;
  public endTime?: Date;
  public durationMs?: number;
  public status: SpanStatus = 'unset';
  public error?: Error;
  public readonly attributes: Record<string, string | number | boolean> = {};

  private _ended = false;

  constructor(
    name: string,
    type: SpanType,
    _parentSpan?: AISpan, // Not used in simple implementation
    private readonly onEnd?: (span: AISpan) => void
  ) {
    this.id = this.generateSpanId();
    this.name = name;
    this.type = type;
    this.startTime = new Date();
  }

  setAttribute(key: string, value: string | number | boolean): void {
    if (this._ended) {
      console.warn('Cannot set attribute on ended span');
      return;
    }
    (this.attributes)[key] = value;
  }

  setAttributes(attributes: Record<string, string | number | boolean>): void {
    if (this._ended) {
      console.warn('Cannot set attributes on ended span');
      return;
    }
    Object.assign(this.attributes, attributes);
  }

  recordException(error: Error): void {
    if (this._ended) {
      console.warn('Cannot record exception on ended span');
      return;
    }
    (this as { error?: Error }).error = error;
    this.setStatus('error', error.message);
  }

  setStatus(status: SpanStatus, message?: string): void {
    if (this._ended) {
      console.warn('Cannot set status on ended span');
      return;
    }
    (this as { status: SpanStatus }).status = status;
    if (message) {
      this.setAttribute('status.message', message);
    }
  }

  end(): void {
    if (this._ended) {
      console.warn('Span already ended');
      return;
    }

    (this as { endTime?: Date }).endTime = new Date();
    (this as { durationMs?: number }).durationMs =
      this.endTime!.getTime() - this.startTime.getTime();

    // Default to 'ok' if not set
    if (this.status === 'unset') {
      (this as { status: SpanStatus }).status = 'ok';
    }

    this._ended = true;

    // Notify telemetry system
    if (this.onEnd) {
      this.onEnd(this);
    }
  }

  private generateSpanId(): string {
    return `span_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}

/**
 * In-memory implementation of AITelemetry for development and testing
 */
export class InMemoryTelemetry implements AITelemetry {
  private traceId: string;
  private currentSpan?: AISpan;
  private readonly spans: AISpan[] = [];
  private readonly llmMetrics: LLMMetrics[] = [];
  private readonly agentMetrics: AgentMetrics[] = [];
  private readonly retrievalMetrics: RetrievalMetrics[] = [];
  private readonly workflowMetrics: WorkflowMetrics[] = [];
  private readonly guardrailMetrics: GuardrailMetrics[] = [];
  private readonly toolMetrics: ToolMetrics[] = [];
  private readonly exporters: TelemetryExporter[] = [];
  private readonly config: TelemetryConfig;

  constructor(config?: Partial<TelemetryConfig>) {
    this.config = {
      enabled: true,
      serviceName: 'stratix-service',
      serviceVersion: '1.0.0',
      ...config,
    };
    this.traceId = this.generateTraceId();

    if (config?.exporters) {
      this.exporters.push(...config.exporters);
    }
  }

  startSpan(name: string, type: SpanType, parentSpan?: AISpan): AISpan {
    if (!this.config.enabled) {
      // Return a no-op span
      return new InMemorySpan(name, type, parentSpan);
    }

    const span = new InMemorySpan(name, type, parentSpan || this.currentSpan, (endedSpan) => {
      this.spans.push(endedSpan);
      // Export to exporters
      this.exporters.forEach((exporter) => {
        exporter.exportSpan(endedSpan).catch((err) => {
          console.error('Failed to export span:', err);
        });
      });
    });

    // Set global attributes from config
    if (this.config.attributes) {
      span.setAttributes(this.config.attributes);
    }

    // Set service attributes
    span.setAttribute('service.name', this.config.serviceName);
    span.setAttribute('service.version', this.config.serviceVersion);
    if (this.config.environment) {
      span.setAttribute('environment', this.config.environment);
    }

    return span;
  }

  getActiveSpan(): AISpan | undefined {
    return this.currentSpan;
  }

  setActiveSpan(span: AISpan | undefined): void {
    this.currentSpan = span;
  }

  recordLLMCall(metrics: LLMMetrics): void {
    if (!this.config.enabled) return;

    this.llmMetrics.push(metrics);
    this.exporters.forEach((exporter) => {
      exporter.exportMetrics(metrics).catch((err) => {
        console.error('Failed to export LLM metrics:', err);
      });
    });
  }

  recordAgentExecution(metrics: AgentMetrics): void {
    if (!this.config.enabled) return;

    this.agentMetrics.push(metrics);
    this.exporters.forEach((exporter) => {
      exporter.exportMetrics(metrics).catch((err) => {
        console.error('Failed to export agent metrics:', err);
      });
    });
  }

  recordRetrieval(metrics: RetrievalMetrics): void {
    if (!this.config.enabled) return;

    this.retrievalMetrics.push(metrics);
    this.exporters.forEach((exporter) => {
      exporter.exportMetrics(metrics).catch((err) => {
        console.error('Failed to export retrieval metrics:', err);
      });
    });
  }

  recordWorkflow(metrics: WorkflowMetrics): void {
    if (!this.config.enabled) return;

    this.workflowMetrics.push(metrics);
    this.exporters.forEach((exporter) => {
      exporter.exportMetrics(metrics).catch((err) => {
        console.error('Failed to export workflow metrics:', err);
      });
    });
  }

  recordGuardrail(metrics: GuardrailMetrics): void {
    if (!this.config.enabled) return;

    this.guardrailMetrics.push(metrics);
    this.exporters.forEach((exporter) => {
      exporter.exportMetrics(metrics).catch((err) => {
        console.error('Failed to export guardrail metrics:', err);
      });
    });
  }

  recordTool(metrics: ToolMetrics): void {
    if (!this.config.enabled) return;

    this.toolMetrics.push(metrics);
    this.exporters.forEach((exporter) => {
      exporter.exportMetrics(metrics).catch((err) => {
        console.error('Failed to export tool metrics:', err);
      });
    });
  }

  getContext(): TraceContext {
    return {
      traceId: this.traceId,
      spanId: this.currentSpan?.id || 'root',
      parentSpanId: undefined,
    };
  }

  setContext(context: TraceContext): void {
    this.traceId = context.traceId;
    // In a real implementation, this would set up distributed tracing context
  }

  getMetrics(): TelemetryMetrics {
    const totalCost = this.llmMetrics.reduce((sum, m) => sum + m.cost, 0);
    const totalTokens = this.llmMetrics.reduce((sum, m) => sum + m.totalTokens, 0);
    const totalLatencyMs = [
      ...this.llmMetrics.map((m) => m.latencyMs),
      ...this.agentMetrics.map((m) => m.latencyMs),
      ...this.retrievalMetrics.map((m) => m.latencyMs),
      ...this.workflowMetrics.map((m) => m.latencyMs),
      ...this.toolMetrics.map((m) => m.latencyMs),
    ].reduce((sum, latency) => sum + latency, 0);

    return {
      llmCalls: [...this.llmMetrics],
      agentExecutions: [...this.agentMetrics],
      retrievals: [...this.retrievalMetrics],
      workflows: [...this.workflowMetrics],
      guardrails: [...this.guardrailMetrics],
      tools: [...this.toolMetrics],
      totalSpans: this.spans.length,
      totalCost,
      totalTokens,
      totalLatencyMs,
    };
  }

  clear(): void {
    this.spans.length = 0;
    this.llmMetrics.length = 0;
    this.agentMetrics.length = 0;
    this.retrievalMetrics.length = 0;
    this.workflowMetrics.length = 0;
    this.guardrailMetrics.length = 0;
    this.toolMetrics.length = 0;
    this.currentSpan = undefined;
    this.traceId = this.generateTraceId();
  }

  addExporter(exporter: TelemetryExporter): void {
    this.exporters.push(exporter);
  }

  async flush(): Promise<void> {
    await Promise.all(this.exporters.map((exporter) => exporter.flush()));
  }

  /**
   * Get all recorded spans
   */
  getSpans(): ReadonlyArray<AISpan> {
    return this.spans;
  }

  /**
   * Get span by ID
   */
  getSpanById(spanId: string): AISpan | undefined {
    return this.spans.find((span) => span.id === spanId);
  }

  /**
   * Get spans by type
   */
  getSpansByType(type: SpanType): AISpan[] {
    return this.spans.filter((span) => span.type === type);
  }

  /**
   * Get failed spans
   */
  getFailedSpans(): AISpan[] {
    return this.spans.filter((span) => span.status === 'error');
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalSpans: number;
    spansByType: Record<SpanType, number>;
    successRate: number;
    averageDuration: number;
    totalLLMCalls: number;
    totalAgentExecutions: number;
    totalRetrievals: number;
    totalWorkflows: number;
    totalGuardrails: number;
    totalTools: number;
  } {
    const spansByType = this.spans.reduce(
      (acc, span) => {
        acc[span.type] = (acc[span.type] || 0) + 1;
        return acc;
      },
      {} as Record<SpanType, number>
    );

    const successfulSpans = this.spans.filter((span) => span.status === 'ok').length;
    const successRate = this.spans.length > 0 ? successfulSpans / this.spans.length : 0;

    const totalDuration = this.spans.reduce((sum, span) => sum + (span.durationMs || 0), 0);
    const averageDuration = this.spans.length > 0 ? totalDuration / this.spans.length : 0;

    return {
      totalSpans: this.spans.length,
      spansByType,
      successRate,
      averageDuration,
      totalLLMCalls: this.llmMetrics.length,
      totalAgentExecutions: this.agentMetrics.length,
      totalRetrievals: this.retrievalMetrics.length,
      totalWorkflows: this.workflowMetrics.length,
      totalGuardrails: this.guardrailMetrics.length,
      totalTools: this.toolMetrics.length,
    };
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}

/**
 * Console exporter for debugging
 */
export class ConsoleExporter implements TelemetryExporter {
  exportSpan(span: AISpan): Promise<void> {
    console.log('[Telemetry Span]', {
      id: span.id,
      name: span.name,
      type: span.type,
      status: span.status,
      durationMs: span.durationMs,
      attributes: span.attributes,
    });
    return Promise.resolve();
  }

  exportMetrics(metrics: unknown): Promise<void> {
    console.log('[Telemetry Metrics]', metrics);
    return Promise.resolve();
  }

  async flush(): Promise<void> {
    // No-op for console exporter
  }

  async shutdown(): Promise<void> {
    // No-op for console exporter
  }
}
