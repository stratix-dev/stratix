/**
 * Audit record for agent execution.
 *
 * Captures what happened, when, and by whom.
 * Used for compliance, debugging, and analytics.
 */
export interface AuditRecord {
  /**
   * Unique record ID.
   */
  readonly id: string;

  /**
   * Timestamp when the event occurred.
   */
  readonly timestamp: Date;

  /**
   * Event type (e.g., 'agent.executed', 'tool.called', 'error.occurred').
   */
  readonly eventType: string;

  /**
   * Agent ID that triggered the event.
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
   * Event data (inputs, outputs, errors, etc.).
   */
  readonly data: Readonly<Record<string, unknown>>;

  /**
   * Severity level.
   */
  readonly severity: AuditSeverity;

  /**
   * Additional metadata.
   */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Audit severity levels.
 */
export enum AuditSeverity {
  /**
   * Informational event.
   */
  INFO = 'info',

  /**
   * Warning event.
   */
  WARNING = 'warning',

  /**
   * Error event.
   */
  ERROR = 'error',

  /**
   * Critical event.
   */
  CRITICAL = 'critical'
}

/**
 * Helper functions for working with audit records.
 */
export const AuditRecordHelpers = {
  /**
   * Create an audit record.
   *
   * @param config - Record configuration
   * @returns Audit record
   */
  create(config: {
    eventType: string;
    agentId: string;
    data: Record<string, unknown>;
    sessionId?: string;
    userId?: string;
    severity?: AuditSeverity;
    metadata?: Record<string, unknown>;
  }): AuditRecord {
    return {
      id: this.generateId(),
      timestamp: new Date(),
      eventType: config.eventType,
      agentId: config.agentId,
      sessionId: config.sessionId,
      userId: config.userId,
      data: config.data,
      severity: config.severity ?? AuditSeverity.INFO,
      metadata: config.metadata
    };
  },

  /**
   * Create an info-level record.
   *
   * @param eventType - Event type
   * @param agentId - Agent ID
   * @param data - Event data
   * @returns Audit record
   */
  info(eventType: string, agentId: string, data: Record<string, unknown>): AuditRecord {
    return this.create({
      eventType,
      agentId,
      data,
      severity: AuditSeverity.INFO
    });
  },

  /**
   * Create a warning-level record.
   *
   * @param eventType - Event type
   * @param agentId - Agent ID
   * @param data - Event data
   * @returns Audit record
   */
  warning(eventType: string, agentId: string, data: Record<string, unknown>): AuditRecord {
    return this.create({
      eventType,
      agentId,
      data,
      severity: AuditSeverity.WARNING
    });
  },

  /**
   * Create an error-level record.
   *
   * @param eventType - Event type
   * @param agentId - Agent ID
   * @param data - Event data
   * @returns Audit record
   */
  error(eventType: string, agentId: string, data: Record<string, unknown>): AuditRecord {
    return this.create({
      eventType,
      agentId,
      data,
      severity: AuditSeverity.ERROR
    });
  },

  /**
   * Create a critical-level record.
   *
   * @param eventType - Event type
   * @param agentId - Agent ID
   * @param data - Event data
   * @returns Audit record
   */
  critical(eventType: string, agentId: string, data: Record<string, unknown>): AuditRecord {
    return this.create({
      eventType,
      agentId,
      data,
      severity: AuditSeverity.CRITICAL
    });
  },

  /**
   * Generate a unique record ID.
   *
   * @returns Record ID
   */
  generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};
