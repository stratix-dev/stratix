/**
 * Audit logging for AI agent operations.
 *
 * Provides compliance-ready audit trails for agent executions,
 * tool calls, errors, and other significant events.
 *
 * @module observability/audit
 *
 * @example
 * ```typescript
 * import {
 *   ExecutionAuditLog,
 *   InMemoryExecutionAuditLog,
 *   AuditRecord,
 *   AuditRecordHelpers,
 *   AuditSeverity
 * } from '@stratix/core/ai-agents/observability/audit';
 *
 * const auditLog = new InMemoryExecutionAuditLog();
 *
 * // Record an execution
 * auditLog.record(AuditRecordHelpers.info(
 *   'agent.executed',
 *   'customer-support',
 *   {
 *     input: 'Help me reset my password',
 *     output: 'I can help you...',
 *     duration: 1250
 *   }
 * ));
 *
 * // Record an error
 * auditLog.record(AuditRecordHelpers.error(
 *   'tool.failed',
 *   'customer-support',
 *   {
 *     tool: 'database_query',
 *     error: 'Connection timeout'
 *   }
 * ));
 *
 * // Query errors and critical events
 * const incidents = auditLog.query({
 *   minSeverity: AuditSeverity.ERROR,
 *   startTime: new Date('2024-01-01')
 * });
 *
 * // Get statistics
 * const stats = auditLog.getStats();
 * console.log(`Total events: ${stats.totalRecords}`);
 * console.log(`Errors: ${stats.bySeverity.error}`);
 * console.log(`Critical: ${stats.bySeverity.critical}`);
 * ```
 */

// Audit records
export {
  type AuditRecord,
  AuditSeverity,
  AuditRecordHelpers,
} from './AuditRecord.js';

// Audit log
export {
  type ExecutionAuditLog,
  type AuditQuery,
  type AuditStats,
  InMemoryExecutionAuditLog,
} from './ExecutionAuditLog.js';
