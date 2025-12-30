import type { AuditRecord, AuditSeverity } from './AuditRecord.js';

/**
 * Query options for audit records.
 */
export interface AuditQuery {
  /**
   * Filter by agent ID.
   */
  readonly agentId?: string;

  /**
   * Filter by session ID.
   */
  readonly sessionId?: string;

  /**
   * Filter by user ID.
   */
  readonly userId?: string;

  /**
   * Filter by event type.
   */
  readonly eventType?: string;

  /**
   * Filter by minimum severity.
   */
  readonly minSeverity?: AuditSeverity;

  /**
   * Filter by time range (start).
   */
  readonly startTime?: Date;

  /**
   * Filter by time range (end).
   */
  readonly endTime?: Date;

  /**
   * Maximum number of records to return.
   */
  readonly limit?: number;

  /**
   * Offset for pagination.
   */
  readonly offset?: number;
}

/**
 * Audit log statistics.
 */
export interface AuditStats {
  /**
   * Total number of audit records.
   */
  readonly totalRecords: number;

  /**
   * Count by severity level.
   */
  readonly bySeverity: Readonly<Record<AuditSeverity, number>>;

  /**
   * Count by event type.
   */
  readonly byEventType: Readonly<Record<string, number>>;

  /**
   * Unique agent count.
   */
  readonly uniqueAgents: number;

  /**
   * Unique session count.
   */
  readonly uniqueSessions: number;

  /**
   * Time range of records.
   */
  readonly timeRange?: {
    readonly earliest: Date;
    readonly latest: Date;
  };
}

/**
 * Interface for execution audit logging.
 *
 * Provides storage and querying capabilities for audit records.
 */
export interface ExecutionAuditLog {
  /**
   * Record an audit event.
   *
   * @param record - Audit record to store
   */
  record(record: AuditRecord): void;

  /**
   * Record multiple audit events.
   *
   * @param records - Audit records to store
   */
  recordMany(records: readonly AuditRecord[]): void;

  /**
   * Query audit records.
   *
   * @param query - Query options
   * @returns Array of matching audit records
   */
  query(query?: AuditQuery): readonly AuditRecord[];

  /**
   * Get a specific audit record by ID.
   *
   * @param id - Record ID
   * @returns The audit record or undefined if not found
   */
  getById(id: string): AuditRecord | undefined;

  /**
   * Get all audit records.
   *
   * @returns Array of all audit records
   */
  getAll(): readonly AuditRecord[];

  /**
   * Get audit statistics.
   *
   * @returns Statistics about the audit log
   */
  getStats(): AuditStats;

  /**
   * Clear all audit records.
   */
  clear(): void;

  /**
   * Clear audit records older than a specific date.
   *
   * @param before - Date threshold
   */
  clearBefore(before: Date): void;
}

/**
 * In-memory implementation of ExecutionAuditLog.
 *
 * Suitable for development and testing. For production, implement
 * a persistent backend (database, log aggregator, etc.).
 *
 * @example
 * ```typescript
 * const auditLog = new InMemoryExecutionAuditLog();
 *
 * // Record an event
 * auditLog.record(AuditRecordHelpers.info(
 *   'agent.executed',
 *   'customer-support',
 *   { input: '...', output: '...' }
 * ));
 *
 * // Query by severity
 * const errors = auditLog.query({
 *   minSeverity: AuditSeverity.ERROR
 * });
 *
 * // Get statistics
 * const stats = auditLog.getStats();
 * console.log(`Total records: ${stats.totalRecords}`);
 * ```
 */
export class InMemoryExecutionAuditLog implements ExecutionAuditLog {
  private records = new Map<string, AuditRecord>();

  /**
   * Record an audit event.
   *
   * @param record - Audit record to store
   */
  record(record: AuditRecord): void {
    this.records.set(record.id, record);
  }

  /**
   * Record multiple audit events.
   *
   * @param records - Audit records to store
   */
  recordMany(records: readonly AuditRecord[]): void {
    for (const record of records) {
      this.records.set(record.id, record);
    }
  }

  /**
   * Query audit records.
   *
   * @param query - Query options
   * @returns Array of matching audit records
   */
  query(query?: AuditQuery): readonly AuditRecord[] {
    let results = Array.from(this.records.values());

    if (query) {
      // Filter by agent ID
      if (query.agentId !== undefined) {
        results = results.filter((r) => r.agentId === query.agentId);
      }

      // Filter by session ID
      if (query.sessionId !== undefined) {
        results = results.filter((r) => r.sessionId === query.sessionId);
      }

      // Filter by user ID
      if (query.userId !== undefined) {
        results = results.filter((r) => r.userId === query.userId);
      }

      // Filter by event type
      if (query.eventType !== undefined) {
        results = results.filter((r) => r.eventType === query.eventType);
      }

      // Filter by minimum severity
      if (query.minSeverity !== undefined) {
        const severityLevels: Record<AuditSeverity, number> = {
          info: 0,
          warning: 1,
          error: 2,
          critical: 3,
        };
        const minLevel = severityLevels[query.minSeverity];
        results = results.filter(
          (r) => severityLevels[r.severity] >= minLevel
        );
      }

      // Filter by time range
      if (query.startTime !== undefined) {
        results = results.filter(
          (r) => r.timestamp.getTime() >= query.startTime!.getTime()
        );
      }

      if (query.endTime !== undefined) {
        results = results.filter(
          (r) => r.timestamp.getTime() <= query.endTime!.getTime()
        );
      }

      // Apply pagination
      if (query.offset !== undefined) {
        results = results.slice(query.offset);
      }

      if (query.limit !== undefined) {
        results = results.slice(0, query.limit);
      }
    }

    // Sort by timestamp (newest first) - always sort
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return results;
  }

  /**
   * Get a specific audit record by ID.
   *
   * @param id - Record ID
   * @returns The audit record or undefined if not found
   */
  getById(id: string): AuditRecord | undefined {
    return this.records.get(id);
  }

  /**
   * Get all audit records.
   *
   * @returns Array of all audit records
   */
  getAll(): readonly AuditRecord[] {
    return Array.from(this.records.values());
  }

  /**
   * Get audit statistics.
   *
   * @returns Statistics about the audit log
   */
  getStats(): AuditStats {
    const records = this.getAll();

    // Count by severity
    const bySeverity: Record<AuditSeverity, number> = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    };

    for (const record of records) {
      bySeverity[record.severity]++;
    }

    // Count by event type
    const byEventType: Record<string, number> = {};
    for (const record of records) {
      byEventType[record.eventType] =
        (byEventType[record.eventType] ?? 0) + 1;
    }

    // Count unique agents
    const agentIds = new Set(records.map((r) => r.agentId));

    // Count unique sessions
    const sessionIds = new Set(
      records.map((r) => r.sessionId).filter((id): id is string => id !== undefined)
    );

    // Calculate time range
    let timeRange: { earliest: Date; latest: Date } | undefined;
    if (records.length > 0) {
      const timestamps = records.map((r) => r.timestamp.getTime());
      timeRange = {
        earliest: new Date(Math.min(...timestamps)),
        latest: new Date(Math.max(...timestamps)),
      };
    }

    return {
      totalRecords: records.length,
      bySeverity,
      byEventType,
      uniqueAgents: agentIds.size,
      uniqueSessions: sessionIds.size,
      timeRange,
    };
  }

  /**
   * Clear all audit records.
   */
  clear(): void {
    this.records.clear();
  }

  /**
   * Clear audit records older than a specific date.
   *
   * @param before - Date threshold
   */
  clearBefore(before: Date): void {
    const threshold = before.getTime();
    for (const [id, record] of this.records.entries()) {
      if (record.timestamp.getTime() < threshold) {
        this.records.delete(id);
      }
    }
  }
}
