/**
 * Observability for AI agent operations.
 *
 * Provides comprehensive observability capabilities including:
 * - **Telemetry**: OpenTelemetry-compatible distributed tracing
 * - **Tracing**: Agent execution path tracking with cost/token analysis
 * - **Audit**: Compliance-ready audit logging for agent operations
 *
 * @module observability
 *
 * @example
 * ```typescript
 * import {
 *   // Telemetry
 *   AITelemetry,
 *   InMemoryTelemetry,
 *   TelemetrySpan,
 *   SpanKind,
 *
 *   // Tracing
 *   TraceCollector,
 *   ExecutionTrace,
 *
 *   // Audit
 *   ExecutionAuditLog,
 *   InMemoryExecutionAuditLog,
 *   AuditRecord,
 *   AuditRecordHelpers,
 *   AuditSeverity
 * } from '@stratix/core/ai-agents/observability';
 *
 * // Setup observability
 * const telemetry = new InMemoryTelemetry();
 * const traceCollector = new TraceCollector();
 * const auditLog = new InMemoryExecutionAuditLog();
 *
 * // Start telemetry span
 * const span = telemetry.startSpan('agent.execute', {
 *   'agent.name': 'CustomerSupport',
 *   'agent.version': '1.0'
 * });
 *
 * // Start execution trace
 * const trace = traceCollector.startTrace({
 *   agentId: 'customer-support',
 *   sessionId: 'session_123'
 * });
 *
 * // Record audit event
 * auditLog.record(AuditRecordHelpers.info(
 *   'agent.started',
 *   'customer-support',
 *   { input: 'Help me...' }
 * ));
 *
 * // ... execute agent ...
 *
 * // Complete observability
 * telemetry.endSpan(span.spanId);
 * traceCollector.endTrace(trace.traceId);
 * auditLog.record(AuditRecordHelpers.info(
 *   'agent.completed',
 *   'customer-support',
 *   { output: '...', duration: 1250 }
 * ));
 *
 * // Analyze
 * const stats = traceCollector.getStats();
 * console.log(`Total cost: $${stats.totalCost}`);
 * console.log(`Total tokens: ${stats.totalTokens}`);
 *
 * const auditStats = auditLog.getStats();
 * console.log(`Total events: ${auditStats.totalRecords}`);
 * ```
 */

// Re-export all telemetry
export * from './telemetry/index.js';

// Re-export all tracing
export * from './tracing/index.js';

// Re-export all audit
export * from './audit/index.js';
