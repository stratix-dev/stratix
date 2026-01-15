import { describe, it, expect, beforeEach } from 'vitest';
import {
  AuditRecord,
  AuditRecordHelpers,
  AuditSeverity,
} from '../AuditRecord.js';
import {
  InMemoryExecutionAuditLog,
  type AuditQuery,
} from '../ExecutionAuditLog.js';

describe('AuditRecord', () => {
  describe('AuditRecordHelpers.create', () => {
    it('should create an audit record with all fields', () => {
      const record = AuditRecordHelpers.create({
        eventType: 'agent.executed',
        agentId: 'agent-1',
        sessionId: 'session-1',
        userId: 'user-1',
        data: { input: 'test' },
        severity: AuditSeverity.INFO,
        metadata: { version: '1.0' },
      });

      expect(record.id).toMatch(/^audit_\d+_/);
      expect(record.timestamp).toBeInstanceOf(Date);
      expect(record.eventType).toBe('agent.executed');
      expect(record.agentId).toBe('agent-1');
      expect(record.sessionId).toBe('session-1');
      expect(record.userId).toBe('user-1');
      expect(record.data).toEqual({ input: 'test' });
      expect(record.severity).toBe(AuditSeverity.INFO);
      expect(record.metadata).toEqual({ version: '1.0' });
    });

    it('should default severity to INFO', () => {
      const record = AuditRecordHelpers.create({
        eventType: 'test',
        agentId: 'agent-1',
        data: {},
      });

      expect(record.severity).toBe(AuditSeverity.INFO);
    });

    it('should allow optional fields to be undefined', () => {
      const record = AuditRecordHelpers.create({
        eventType: 'test',
        agentId: 'agent-1',
        data: {},
      });

      expect(record.sessionId).toBeUndefined();
      expect(record.userId).toBeUndefined();
      expect(record.metadata).toBeUndefined();
    });
  });

  describe('AuditRecordHelpers.info', () => {
    it('should create an INFO-level record', () => {
      const record = AuditRecordHelpers.info('agent.started', 'agent-1', {
        config: 'default',
      });

      expect(record.eventType).toBe('agent.started');
      expect(record.agentId).toBe('agent-1');
      expect(record.data).toEqual({ config: 'default' });
      expect(record.severity).toBe(AuditSeverity.INFO);
    });
  });

  describe('AuditRecordHelpers.warning', () => {
    it('should create a WARNING-level record', () => {
      const record = AuditRecordHelpers.warning(
        'tool.slow',
        'agent-1',
        { duration: 5000 }
      );

      expect(record.severity).toBe(AuditSeverity.WARNING);
      expect(record.eventType).toBe('tool.slow');
    });
  });

  describe('AuditRecordHelpers.error', () => {
    it('should create an ERROR-level record', () => {
      const record = AuditRecordHelpers.error('llm.failed', 'agent-1', {
        error: 'Rate limit exceeded',
      });

      expect(record.severity).toBe(AuditSeverity.ERROR);
      expect(record.eventType).toBe('llm.failed');
    });
  });

  describe('AuditRecordHelpers.critical', () => {
    it('should create a CRITICAL-level record', () => {
      const record = AuditRecordHelpers.critical(
        'security.breach',
        'agent-1',
        { details: 'Unauthorized access attempt' }
      );

      expect(record.severity).toBe(AuditSeverity.CRITICAL);
      expect(record.eventType).toBe('security.breach');
    });
  });

  describe('AuditRecordHelpers.generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = AuditRecordHelpers.generateId();
      const id2 = AuditRecordHelpers.generateId();

      expect(id1).toMatch(/^audit_\d+_/);
      expect(id2).toMatch(/^audit_\d+_/);
      expect(id1).not.toBe(id2);
    });
  });
});

describe('InMemoryExecutionAuditLog', () => {
  let auditLog: InMemoryExecutionAuditLog;

  beforeEach(() => {
    auditLog = new InMemoryExecutionAuditLog();
  });

  describe('record', () => {
    it('should store an audit record', () => {
      const record = AuditRecordHelpers.info('test', 'agent-1', {});
      auditLog.record(record);

      const retrieved = auditLog.getById(record.id);
      expect(retrieved).toEqual(record);
    });

    it('should store multiple records', () => {
      const record1 = AuditRecordHelpers.info('test1', 'agent-1', {});
      const record2 = AuditRecordHelpers.info('test2', 'agent-1', {});

      auditLog.record(record1);
      auditLog.record(record2);

      expect(auditLog.getAll()).toHaveLength(2);
    });
  });

  describe('recordMany', () => {
    it('should store multiple records at once', () => {
      const records = [
        AuditRecordHelpers.info('test1', 'agent-1', {}),
        AuditRecordHelpers.info('test2', 'agent-1', {}),
        AuditRecordHelpers.info('test3', 'agent-1', {}),
      ];

      auditLog.recordMany(records);

      expect(auditLog.getAll()).toHaveLength(3);
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      // Add diverse records with delays to ensure different timestamps
      auditLog.record(
        AuditRecordHelpers.create({
          eventType: 'agent.executed',
          agentId: 'agent-1',
          sessionId: 'session-1',
          data: {},
          severity: AuditSeverity.INFO,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      auditLog.record(
        AuditRecordHelpers.create({
          eventType: 'tool.slow',
          agentId: 'agent-1',
          sessionId: 'session-1',
          data: {},
          severity: AuditSeverity.WARNING,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      auditLog.record(
        AuditRecordHelpers.create({
          eventType: 'llm.failed',
          agentId: 'agent-2',
          sessionId: 'session-2',
          data: {},
          severity: AuditSeverity.ERROR,
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      auditLog.record(
        AuditRecordHelpers.create({
          eventType: 'security.breach',
          agentId: 'agent-2',
          sessionId: 'session-2',
          data: {},
          severity: AuditSeverity.CRITICAL,
        })
      );
    });

    it('should return all records when no query is provided', () => {
      const results = auditLog.query();
      expect(results).toHaveLength(4);
    });

    it('should filter by agent ID', () => {
      const results = auditLog.query({ agentId: 'agent-1' });
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.agentId === 'agent-1')).toBe(true);
    });

    it('should filter by session ID', () => {
      const results = auditLog.query({ sessionId: 'session-1' });
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.sessionId === 'session-1')).toBe(true);
    });

    it('should filter by event type', () => {
      const results = auditLog.query({ eventType: 'llm.failed' });
      expect(results).toHaveLength(1);
      expect(results[0]!.eventType).toBe('llm.failed');
    });

    it('should filter by minimum severity', () => {
      const results = auditLog.query({
        minSeverity: AuditSeverity.ERROR,
      });
      expect(results).toHaveLength(2); // ERROR and CRITICAL
      expect(
        results.every(
          (r) =>
            r.severity === AuditSeverity.ERROR ||
            r.severity === AuditSeverity.CRITICAL
        )
      ).toBe(true);
    });

    it('should filter by time range (start)', () => {
      const allRecords = auditLog.getAll();
      const midpoint = allRecords[1]!.timestamp;

      const results = auditLog.query({
        startTime: midpoint,
      });

      // Should include records from midpoint onwards
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by time range (end)', () => {
      const allRecords = auditLog.getAll();
      const midpoint = allRecords[1]!.timestamp;

      const results = auditLog.query({
        endTime: midpoint,
      });

      // Should include records up to midpoint
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('should apply limit', () => {
      const results = auditLog.query({ limit: 2 });
      expect(results).toHaveLength(2);
    });

    it('should apply offset', () => {
      const results = auditLog.query({ offset: 2 });
      expect(results).toHaveLength(2);
    });

    it('should combine multiple filters', () => {
      const results = auditLog.query({
        agentId: 'agent-2',
        minSeverity: AuditSeverity.ERROR,
      });

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.agentId === 'agent-2')).toBe(true);
      expect(
        results.every(
          (r) =>
            r.severity === AuditSeverity.ERROR ||
            r.severity === AuditSeverity.CRITICAL
        )
      ).toBe(true);
    });

    it('should return records sorted by timestamp (newest first)', () => {
      const results = auditLog.query();

      for (let i = 0; i < results.length - 1; i++) {
        const current = results[i]!.timestamp.getTime();
        const next = results[i + 1]!.timestamp.getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });
  });

  describe('getById', () => {
    it('should return a record by ID', () => {
      const record = AuditRecordHelpers.info('test', 'agent-1', {});
      auditLog.record(record);

      const retrieved = auditLog.getById(record.id);
      expect(retrieved).toEqual(record);
    });

    it('should return undefined for non-existent ID', () => {
      const retrieved = auditLog.getById('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all records', () => {
      const records = [
        AuditRecordHelpers.info('test1', 'agent-1', {}),
        AuditRecordHelpers.info('test2', 'agent-1', {}),
      ];

      auditLog.recordMany(records);

      const all = auditLog.getAll();
      expect(all).toHaveLength(2);
    });

    it('should return empty array when no records', () => {
      const all = auditLog.getAll();
      expect(all).toEqual([]);
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      auditLog.recordMany([
        AuditRecordHelpers.create({
          eventType: 'event1',
          agentId: 'agent-1',
          sessionId: 'session-1',
          data: {},
          severity: AuditSeverity.INFO,
        }),
        AuditRecordHelpers.create({
          eventType: 'event2',
          agentId: 'agent-1',
          sessionId: 'session-1',
          data: {},
          severity: AuditSeverity.INFO,
        }),
        AuditRecordHelpers.create({
          eventType: 'event3',
          agentId: 'agent-2',
          sessionId: 'session-2',
          data: {},
          severity: AuditSeverity.WARNING,
        }),
        AuditRecordHelpers.create({
          eventType: 'event1',
          agentId: 'agent-2',
          sessionId: 'session-2',
          data: {},
          severity: AuditSeverity.ERROR,
        }),
        AuditRecordHelpers.create({
          eventType: 'event4',
          agentId: 'agent-3',
          sessionId: 'session-3',
          data: {},
          severity: AuditSeverity.CRITICAL,
        }),
      ]);
    });

    it('should count total records', () => {
      const stats = auditLog.getStats();
      expect(stats.totalRecords).toBe(5);
    });

    it('should count records by severity', () => {
      const stats = auditLog.getStats();
      expect(stats.bySeverity.info).toBe(2);
      expect(stats.bySeverity.warning).toBe(1);
      expect(stats.bySeverity.error).toBe(1);
      expect(stats.bySeverity.critical).toBe(1);
    });

    it('should count records by event type', () => {
      const stats = auditLog.getStats();
      expect(stats.byEventType.event1).toBe(2);
      expect(stats.byEventType.event2).toBe(1);
      expect(stats.byEventType.event3).toBe(1);
      expect(stats.byEventType.event4).toBe(1);
    });

    it('should count unique agents', () => {
      const stats = auditLog.getStats();
      expect(stats.uniqueAgents).toBe(3);
    });

    it('should count unique sessions', () => {
      const stats = auditLog.getStats();
      expect(stats.uniqueSessions).toBe(3);
    });

    it('should calculate time range', () => {
      const stats = auditLog.getStats();
      expect(stats.timeRange).toBeDefined();
      expect(stats.timeRange!.earliest).toBeInstanceOf(Date);
      expect(stats.timeRange!.latest).toBeInstanceOf(Date);
      expect(
        stats.timeRange!.latest.getTime() >=
          stats.timeRange!.earliest.getTime()
      ).toBe(true);
    });

    it('should handle empty log', () => {
      const emptyLog = new InMemoryExecutionAuditLog();
      const stats = emptyLog.getStats();

      expect(stats.totalRecords).toBe(0);
      expect(stats.uniqueAgents).toBe(0);
      expect(stats.uniqueSessions).toBe(0);
      expect(stats.timeRange).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should remove all records', () => {
      auditLog.recordMany([
        AuditRecordHelpers.info('test1', 'agent-1', {}),
        AuditRecordHelpers.info('test2', 'agent-1', {}),
      ]);

      expect(auditLog.getAll()).toHaveLength(2);

      auditLog.clear();

      expect(auditLog.getAll()).toHaveLength(0);
    });
  });

  describe('clearBefore', () => {
    it('should remove records older than threshold', async () => {
      const old1 = AuditRecordHelpers.info('old1', 'agent-1', {});
      auditLog.record(old1);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const threshold = new Date();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const new1 = AuditRecordHelpers.info('new1', 'agent-1', {});
      const new2 = AuditRecordHelpers.info('new2', 'agent-1', {});
      auditLog.record(new1);
      auditLog.record(new2);

      expect(auditLog.getAll()).toHaveLength(3);

      auditLog.clearBefore(threshold);

      const remaining = auditLog.getAll();
      expect(remaining).toHaveLength(2);
      expect(remaining.map((r) => r.id)).toContain(new1.id);
      expect(remaining.map((r) => r.id)).toContain(new2.id);
    });

    it('should keep all records if threshold is before earliest', () => {
      auditLog.recordMany([
        AuditRecordHelpers.info('test1', 'agent-1', {}),
        AuditRecordHelpers.info('test2', 'agent-1', {}),
      ]);

      const veryOld = new Date('2000-01-01');
      auditLog.clearBefore(veryOld);

      expect(auditLog.getAll()).toHaveLength(2);
    });

    it('should remove all records if threshold is after latest', () => {
      auditLog.recordMany([
        AuditRecordHelpers.info('test1', 'agent-1', {}),
        AuditRecordHelpers.info('test2', 'agent-1', {}),
      ]);

      const future = new Date(Date.now() + 10000);
      auditLog.clearBefore(future);

      expect(auditLog.getAll()).toHaveLength(0);
    });
  });

  describe('integration scenarios', () => {
    it('should track an agent execution lifecycle', () => {
      const sessionId = 'session-123';
      const agentId = 'customer-support';

      // Agent started
      auditLog.record(
        AuditRecordHelpers.create({
          eventType: 'agent.started',
          agentId,
          sessionId,
          data: { input: 'Help me reset password' },
          severity: AuditSeverity.INFO,
        })
      );

      // Tool called
      auditLog.record(
        AuditRecordHelpers.create({
          eventType: 'tool.called',
          agentId,
          sessionId,
          data: { tool: 'database_query', params: {} },
          severity: AuditSeverity.INFO,
        })
      );

      // Warning
      auditLog.record(
        AuditRecordHelpers.create({
          eventType: 'tool.slow',
          agentId,
          sessionId,
          data: { tool: 'database_query', duration: 3000 },
          severity: AuditSeverity.WARNING,
        })
      );

      // Completed
      auditLog.record(
        AuditRecordHelpers.create({
          eventType: 'agent.completed',
          agentId,
          sessionId,
          data: { output: 'Password reset email sent', duration: 3500 },
          severity: AuditSeverity.INFO,
        })
      );

      const sessionRecords = auditLog.query({ sessionId });
      expect(sessionRecords).toHaveLength(4);

      const warnings = auditLog.query({
        sessionId,
        minSeverity: AuditSeverity.WARNING,
      });
      expect(warnings).toHaveLength(1);
      expect(warnings[0]!.eventType).toBe('tool.slow');
    });

    it('should identify problematic agents', () => {
      // Agent 1: mostly successful
      auditLog.recordMany([
        AuditRecordHelpers.info('agent.executed', 'agent-1', {}),
        AuditRecordHelpers.info('agent.executed', 'agent-1', {}),
      ]);

      // Agent 2: many errors
      auditLog.recordMany([
        AuditRecordHelpers.error('llm.failed', 'agent-2', {}),
        AuditRecordHelpers.error('tool.failed', 'agent-2', {}),
        AuditRecordHelpers.critical('security.breach', 'agent-2', {}),
      ]);

      const agent2Errors = auditLog.query({
        agentId: 'agent-2',
        minSeverity: AuditSeverity.ERROR,
      });

      expect(agent2Errors).toHaveLength(3);

      const stats = auditLog.getStats();
      expect(stats.bySeverity.error).toBe(2);
      expect(stats.bySeverity.critical).toBe(1);
    });
  });
});
