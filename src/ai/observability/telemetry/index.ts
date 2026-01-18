/**
 * Telemetry for AI agent operations.
 *
 * Provides distributed tracing compatible with OpenTelemetry.
 *
 * @module observability/telemetry
 *
 * @example
 * ```TypeScript
 * import {
 *   AITelemetry,
 *   InMemoryTelemetry,
 *   ConsoleExporter
 * } from '@stratix/core/ai/observability/telemetry';
 *
 * const telemetry = new InMemoryTelemetry();
 * const exporter = new ConsoleExporter();
 *
 * // Start a span
 * const span = telemetry.startSpan('agent.execute', {
 *   'agent.name': 'CustomerSupport',
 *   'agent.version': '1.0'
 * });
 *
 * // ... do work ...
 *
 * // End span
 * telemetry.endSpan(span.spanId);
 *
 * // Export
 * await exporter.export(telemetry.getAllSpans());
 * ```
 */

// Spans
export {
  type TelemetrySpan,
  type SpanEvent,
  type SpanStatus,
  type SpanAttributeValue,
  SpanKind,
  SpanStatusCode,
  TelemetrySpanHelpers
} from './TelemetrySpan.js';

// Telemetry
export { type AITelemetry, InMemoryTelemetry } from './AITelemetry.js';

// Exporters
export { type TelemetryExporter, ConsoleExporter, BatchingExporter } from './TelemetryExporter.js';
