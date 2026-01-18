import type { TelemetrySpan, SpanKind, SpanAttributeValue } from './TelemetrySpan.js';
import { TelemetrySpanHelpers } from './TelemetrySpan.js';

/**
 * Telemetry interface for AI agent operations.
 *
 * Provides observability into agent execution, tool calls, LLM requests, etc.
 *
 * @example
 * ```TypeScript
 * const telemetry = new InMemoryTelemetry();
 *
 * const span = telemetry.startSpan('agent.execute', {
 *   'agent.name': 'CustomerSupport',
 *   'agent.version': '1.0'
 * });
 *
 * // ... do work ...
 *
 * telemetry.endSpan(span.spanId);
 * ```
 */
export interface AITelemetry {
  /**
   * Start a new telemetry span.
   *
   * @param name - Span name
   * @param attributes - Optional span attributes
   * @param kind - Span kind
   * @param parentSpanId - Parent span ID for nesting
   * @returns Started span
   */
  startSpan(
    name: string,
    attributes?: Record<string, SpanAttributeValue>,
    kind?: SpanKind,
    parentSpanId?: string
  ): TelemetrySpan;

  /**
   * End a span.
   *
   * @param spanId - Span ID to end
   * @param error - Optional error if span failed
   */
  endSpan(spanId: string, error?: Error): void;

  /**
   * Add an event to a span.
   *
   * @param spanId - Span ID
   * @param eventName - Event name
   * @param attributes - Optional event attributes
   */
  addSpanEvent(
    spanId: string,
    eventName: string,
    attributes?: Record<string, SpanAttributeValue>
  ): void;

  /**
   * Set attributes on a span.
   *
   * @param spanId - Span ID
   * @param attributes - Attributes to set
   */
  setSpanAttributes(spanId: string, attributes: Record<string, SpanAttributeValue>): void;

  /**
   * Get a span by ID.
   *
   * @param spanId - Span ID
   * @returns The span or undefined if not found
   */
  getSpan(spanId: string): TelemetrySpan | undefined;

  /**
   * Get all spans.
   *
   * @returns Array of all spans
   */
  getAllSpans(): readonly TelemetrySpan[];

  /**
   * Clear all spans.
   */
  clear(): void;
}

/**
 * In-memory telemetry implementation.
 *
 * Simple implementation for development and testing.
 * For production, use an exporter to send to a backend.
 *
 * @example
 * ```TypeScript
 * const telemetry = new InMemoryTelemetry();
 *
 * const span = telemetry.startSpan('llm.request', {
 *   'llm.model': 'gpt-4',
 *   'llm.tokens': 100
 * });
 *
 * telemetry.endSpan(span.spanId);
 * ```
 */
export class InMemoryTelemetry implements AITelemetry {
  private spans = new Map<string, TelemetrySpan>();
  private currentTraceId: string | undefined;

  startSpan(
    name: string,
    attributes?: Record<string, SpanAttributeValue>,
    kind?: SpanKind,
    parentSpanId?: string
  ): TelemetrySpan {
    // Generate or reuse trace ID
    const traceId = this.currentTraceId ?? TelemetrySpanHelpers.generateTraceId();
    if (!this.currentTraceId) {
      this.currentTraceId = traceId;
    }

    const span = TelemetrySpanHelpers.create({
      traceId,
      name,
      kind,
      parentSpanId,
      attributes
    });

    this.spans.set(span.spanId, span);
    return span;
  }

  endSpan(spanId: string, error?: Error): void {
    const span = this.spans.get(spanId);
    if (!span) return;

    const completedSpan = TelemetrySpanHelpers.complete(span, error);
    this.spans.set(spanId, completedSpan);
  }

  addSpanEvent(
    spanId: string,
    eventName: string,
    attributes?: Record<string, SpanAttributeValue>
  ): void {
    const span = this.spans.get(spanId);
    if (!span) return;

    const updatedSpan = TelemetrySpanHelpers.addEvent(span, eventName, attributes);
    this.spans.set(spanId, updatedSpan);
  }

  setSpanAttributes(spanId: string, attributes: Record<string, SpanAttributeValue>): void {
    const span = this.spans.get(spanId);
    if (!span) return;

    const updatedSpan = TelemetrySpanHelpers.setAttributes(span, attributes);
    this.spans.set(spanId, updatedSpan);
  }

  getSpan(spanId: string): TelemetrySpan | undefined {
    return this.spans.get(spanId);
  }

  getAllSpans(): readonly TelemetrySpan[] {
    return Array.from(this.spans.values());
  }

  clear(): void {
    this.spans.clear();
    this.currentTraceId = undefined;
  }
}
