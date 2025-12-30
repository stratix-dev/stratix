import { describe, it, expect, beforeEach } from 'vitest';
import {
  ExecutionTrace,
  ExecutionTraceHelpers,
  type TraceStep,
} from '../ExecutionTrace.js';
import { TraceCollector } from '../TraceCollector.js';

describe('ExecutionTrace', () => {
  describe('ExecutionTraceHelpers.create', () => {
    it('should create a trace with all fields', () => {
      const trace = ExecutionTraceHelpers.create({
        traceId: 'trace_123',
        agentId: 'agent-1',
        sessionId: 'session-1',
        userId: 'user-1',
        metadata: { version: '1.0' },
      });

      expect(trace.traceId).toBe('trace_123');
      expect(trace.agentId).toBe('agent-1');
      expect(trace.sessionId).toBe('session-1');
      expect(trace.userId).toBe('user-1');
      expect(trace.startTime).toBeInstanceOf(Date);
      expect(trace.endTime).toBeUndefined();
      expect(trace.steps).toEqual([]);
      expect(trace.metadata).toEqual({ version: '1.0' });
    });

    it('should allow optional fields to be undefined', () => {
      const trace = ExecutionTraceHelpers.create({
        traceId: 'trace_123',
        agentId: 'agent-1',
      });

      expect(trace.sessionId).toBeUndefined();
      expect(trace.userId).toBeUndefined();
      expect(trace.metadata).toBeUndefined();
    });
  });

  describe('ExecutionTraceHelpers.addStep', () => {
    it('should add a step to trace', () => {
      const trace = ExecutionTraceHelpers.create({
        traceId: 'trace_123',
        agentId: 'agent-1',
      });

      const step: TraceStep = {
        name: 'llm.request',
        type: 'llm',
        startTime: new Date(),
        endTime: new Date(),
        metadata: { model: 'gpt-4' },
      };

      const updated = ExecutionTraceHelpers.addStep(trace, step);

      expect(updated.steps).toHaveLength(1);
      expect(updated.steps[0]).toEqual(step);
    });

    it('should append multiple steps', () => {
      let trace = ExecutionTraceHelpers.create({
        traceId: 'trace_123',
        agentId: 'agent-1',
      });

      const step1: TraceStep = {
        name: 'step1',
        type: 'llm',
        startTime: new Date(),
      };

      const step2: TraceStep = {
        name: 'step2',
        type: 'tool',
        startTime: new Date(),
      };

      trace = ExecutionTraceHelpers.addStep(trace, step1);
      trace = ExecutionTraceHelpers.addStep(trace, step2);

      expect(trace.steps).toHaveLength(2);
      expect(trace.steps[0]).toEqual(step1);
      expect(trace.steps[1]).toEqual(step2);
    });
  });

  describe('ExecutionTraceHelpers.complete', () => {
    it('should mark trace as completed', () => {
      const trace = ExecutionTraceHelpers.create({
        traceId: 'trace_123',
        agentId: 'agent-1',
      });

      const completed = ExecutionTraceHelpers.complete(trace);

      expect(completed.endTime).toBeInstanceOf(Date);
    });
  });

  describe('ExecutionTraceHelpers.getDuration', () => {
    it('should calculate duration for completed trace', () => {
      const start = new Date();
      const end = new Date(start.getTime() + 1500);

      const trace: ExecutionTrace = {
        traceId: 'trace_123',
        agentId: 'agent-1',
        startTime: start,
        endTime: end,
        steps: [],
      };

      const duration = ExecutionTraceHelpers.getDuration(trace);
      expect(duration).toBe(1500);
    });

    it('should return undefined for incomplete trace', () => {
      const trace = ExecutionTraceHelpers.create({
        traceId: 'trace_123',
        agentId: 'agent-1',
      });

      const duration = ExecutionTraceHelpers.getDuration(trace);
      expect(duration).toBeUndefined();
    });
  });

  describe('ExecutionTraceHelpers.countStepsByType', () => {
    it('should count steps by type', () => {
      let trace = ExecutionTraceHelpers.create({
        traceId: 'trace_123',
        agentId: 'agent-1',
      });

      trace = ExecutionTraceHelpers.addStep(trace, {
        name: 'llm1',
        type: 'llm',
        startTime: new Date(),
      });

      trace = ExecutionTraceHelpers.addStep(trace, {
        name: 'llm2',
        type: 'llm',
        startTime: new Date(),
      });

      trace = ExecutionTraceHelpers.addStep(trace, {
        name: 'tool1',
        type: 'tool',
        startTime: new Date(),
      });

      const counts = ExecutionTraceHelpers.countStepsByType(trace);

      expect(counts.get('llm')).toBe(2);
      expect(counts.get('tool')).toBe(1);
    });
  });

  describe('ExecutionTraceHelpers.findStepsByType', () => {
    it('should find steps by type', () => {
      let trace = ExecutionTraceHelpers.create({
        traceId: 'trace_123',
        agentId: 'agent-1',
      });

      const llmStep: TraceStep = {
        name: 'llm',
        type: 'llm',
        startTime: new Date(),
      };

      const toolStep: TraceStep = {
        name: 'tool',
        type: 'tool',
        startTime: new Date(),
      };

      trace = ExecutionTraceHelpers.addStep(trace, llmStep);
      trace = ExecutionTraceHelpers.addStep(trace, toolStep);

      const llmSteps = ExecutionTraceHelpers.findStepsByType(trace, 'llm');
      expect(llmSteps).toHaveLength(1);
      expect(llmSteps[0]).toEqual(llmStep);
    });
  });

  describe('ExecutionTraceHelpers.calculateTotalCost', () => {
    it('should calculate total cost from steps', () => {
      let trace = ExecutionTraceHelpers.create({
        traceId: 'trace_123',
        agentId: 'agent-1',
      });

      trace = ExecutionTraceHelpers.addStep(trace, {
        name: 'step1',
        type: 'llm',
        startTime: new Date(),
        metadata: { cost: 0.05 },
      });

      trace = ExecutionTraceHelpers.addStep(trace, {
        name: 'step2',
        type: 'llm',
        startTime: new Date(),
        metadata: { cost: 0.03 },
      });

      const totalCost = ExecutionTraceHelpers.calculateTotalCost(trace);
      expect(totalCost).toBe(0.08);
    });

    it('should return undefined when no costs', () => {
      const trace = ExecutionTraceHelpers.create({
        traceId: 'trace_123',
        agentId: 'agent-1',
      });

      const totalCost = ExecutionTraceHelpers.calculateTotalCost(trace);
      expect(totalCost).toBeUndefined();
    });
  });

  describe('ExecutionTraceHelpers.calculateTotalTokens', () => {
    it('should calculate total tokens from LLM steps', () => {
      let trace = ExecutionTraceHelpers.create({
        traceId: 'trace_123',
        agentId: 'agent-1',
      });

      trace = ExecutionTraceHelpers.addStep(trace, {
        name: 'llm1',
        type: 'llm',
        startTime: new Date(),
        metadata: { totalTokens: 100 },
      });

      trace = ExecutionTraceHelpers.addStep(trace, {
        name: 'llm2',
        type: 'llm',
        startTime: new Date(),
        metadata: { totalTokens: 150 },
      });

      trace = ExecutionTraceHelpers.addStep(trace, {
        name: 'tool',
        type: 'tool',
        startTime: new Date(),
      });

      const totalTokens = ExecutionTraceHelpers.calculateTotalTokens(trace);
      expect(totalTokens).toBe(250);
    });

    it('should return undefined when no tokens', () => {
      const trace = ExecutionTraceHelpers.create({
        traceId: 'trace_123',
        agentId: 'agent-1',
      });

      const totalTokens = ExecutionTraceHelpers.calculateTotalTokens(trace);
      expect(totalTokens).toBeUndefined();
    });
  });

  describe('ExecutionTraceHelpers.generateTraceId', () => {
    it('should generate unique trace IDs', () => {
      const id1 = ExecutionTraceHelpers.generateTraceId();
      const id2 = ExecutionTraceHelpers.generateTraceId();

      expect(id1).toMatch(/^trace_\d+_/);
      expect(id2).toMatch(/^trace_\d+_/);
      expect(id1).not.toBe(id2);
    });
  });
});

describe('TraceCollector', () => {
  let collector: TraceCollector;

  beforeEach(() => {
    collector = new TraceCollector();
  });

  describe('startTrace', () => {
    it('should create and store a trace', () => {
      const trace = collector.startTrace({
        agentId: 'agent-1',
        sessionId: 'session-1',
        userId: 'user-1',
        metadata: { version: '1.0' },
      });

      expect(trace.traceId).toMatch(/^trace_\d+_/);
      expect(trace.agentId).toBe('agent-1');
      expect(trace.sessionId).toBe('session-1');
      expect(trace.userId).toBe('user-1');
      expect(trace.metadata).toEqual({ version: '1.0' });

      const retrieved = collector.getTrace(trace.traceId);
      expect(retrieved).toEqual(trace);
    });

    it('should mark trace as active', () => {
      const trace = collector.startTrace({ agentId: 'agent-1' });

      const activeTraces = collector.getActiveTraces();
      expect(activeTraces).toHaveLength(1);
      expect(activeTraces[0]).toEqual(trace);
    });
  });

  describe('addStep', () => {
    it('should add step to existing trace', () => {
      const trace = collector.startTrace({ agentId: 'agent-1' });

      const step: TraceStep = {
        name: 'llm.request',
        type: 'llm',
        startTime: new Date(),
        endTime: new Date(),
        metadata: { model: 'gpt-4' },
      };

      collector.addStep(trace.traceId, step);

      const updated = collector.getTrace(trace.traceId);
      expect(updated!.steps).toHaveLength(1);
      expect(updated!.steps[0]).toEqual(step);
    });

    it('should do nothing for non-existent trace', () => {
      const step: TraceStep = {
        name: 'test',
        type: 'llm',
        startTime: new Date(),
      };

      expect(() => collector.addStep('non-existent', step)).not.toThrow();
    });
  });

  describe('endTrace', () => {
    it('should complete trace and calculate totals', () => {
      const trace = collector.startTrace({ agentId: 'agent-1' });

      collector.addStep(trace.traceId, {
        name: 'llm1',
        type: 'llm',
        startTime: new Date(),
        endTime: new Date(),
        metadata: { cost: 0.05, totalTokens: 100 },
      });

      collector.addStep(trace.traceId, {
        name: 'llm2',
        type: 'llm',
        startTime: new Date(),
        endTime: new Date(),
        metadata: { cost: 0.03, totalTokens: 50 },
      });

      collector.endTrace(trace.traceId);

      const completed = collector.getTrace(trace.traceId);
      expect(completed!.endTime).toBeInstanceOf(Date);
      expect(completed!.totalCost).toBe(0.08);
      expect(completed!.totalTokens).toBe(150);
    });

    it('should remove trace from active traces', () => {
      const trace = collector.startTrace({ agentId: 'agent-1' });

      expect(collector.getActiveTraces()).toHaveLength(1);

      collector.endTrace(trace.traceId);

      expect(collector.getActiveTraces()).toHaveLength(0);
    });

    it('should do nothing for non-existent trace', () => {
      expect(() => collector.endTrace('non-existent')).not.toThrow();
    });
  });

  describe('getTrace', () => {
    it('should return trace by ID', () => {
      const trace = collector.startTrace({ agentId: 'agent-1' });

      const retrieved = collector.getTrace(trace.traceId);
      expect(retrieved).toEqual(trace);
    });

    it('should return undefined for non-existent trace', () => {
      const trace = collector.getTrace('non-existent');
      expect(trace).toBeUndefined();
    });
  });

  describe('getAllTraces', () => {
    it('should return all traces', () => {
      collector.startTrace({ agentId: 'agent-1' });
      collector.startTrace({ agentId: 'agent-2' });
      collector.startTrace({ agentId: 'agent-3' });

      const all = collector.getAllTraces();
      expect(all).toHaveLength(3);
    });

    it('should return empty array when no traces', () => {
      const all = collector.getAllTraces();
      expect(all).toEqual([]);
    });
  });

  describe('getTracesBySession', () => {
    it('should filter traces by session ID', () => {
      collector.startTrace({ agentId: 'agent-1', sessionId: 'session-1' });
      collector.startTrace({ agentId: 'agent-2', sessionId: 'session-1' });
      collector.startTrace({ agentId: 'agent-3', sessionId: 'session-2' });

      const session1Traces = collector.getTracesBySession('session-1');
      expect(session1Traces).toHaveLength(2);
      expect(session1Traces.every((t) => t.sessionId === 'session-1')).toBe(true);
    });
  });

  describe('getTracesByAgent', () => {
    it('should filter traces by agent ID', () => {
      collector.startTrace({ agentId: 'agent-1' });
      collector.startTrace({ agentId: 'agent-1' });
      collector.startTrace({ agentId: 'agent-2' });

      const agent1Traces = collector.getTracesByAgent('agent-1');
      expect(agent1Traces).toHaveLength(2);
      expect(agent1Traces.every((t) => t.agentId === 'agent-1')).toBe(true);
    });
  });

  describe('getActiveTraces', () => {
    it('should return only active traces', () => {
      const trace1 = collector.startTrace({ agentId: 'agent-1' });
      const trace2 = collector.startTrace({ agentId: 'agent-2' });

      expect(collector.getActiveTraces()).toHaveLength(2);

      collector.endTrace(trace1.traceId);

      const active = collector.getActiveTraces();
      expect(active).toHaveLength(1);
      expect(active[0]!.traceId).toBe(trace2.traceId);
    });
  });

  describe('getCompletedTraces', () => {
    it('should return only completed traces', () => {
      const trace1 = collector.startTrace({ agentId: 'agent-1' });
      collector.startTrace({ agentId: 'agent-2' });

      expect(collector.getCompletedTraces()).toHaveLength(0);

      collector.endTrace(trace1.traceId);

      const completed = collector.getCompletedTraces();
      expect(completed).toHaveLength(1);
      expect(completed[0]!.traceId).toBe(trace1.traceId);
    });
  });

  describe('clear', () => {
    it('should remove all traces', () => {
      collector.startTrace({ agentId: 'agent-1' });
      collector.startTrace({ agentId: 'agent-2' });

      expect(collector.getAllTraces()).toHaveLength(2);

      collector.clear();

      expect(collector.getAllTraces()).toHaveLength(0);
      expect(collector.getActiveTraces()).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should calculate statistics', () => {
      const trace1 = collector.startTrace({ agentId: 'agent-1' });
      const trace2 = collector.startTrace({ agentId: 'agent-2' });

      collector.addStep(trace1.traceId, {
        name: 'llm',
        type: 'llm',
        startTime: new Date(),
        endTime: new Date(),
        metadata: { cost: 0.05, totalTokens: 100 },
      });

      collector.addStep(trace2.traceId, {
        name: 'llm',
        type: 'llm',
        startTime: new Date(),
        endTime: new Date(),
        metadata: { cost: 0.03, totalTokens: 50 },
      });

      // Complete both traces with a delay to ensure different durations
      collector.endTrace(trace1.traceId);
      collector.endTrace(trace2.traceId);

      const stats = collector.getStats();

      expect(stats.total).toBe(2);
      expect(stats.active).toBe(0);
      expect(stats.completed).toBe(2);
      expect(stats.totalCost).toBe(0.08);
      expect(stats.totalTokens).toBe(150);
      expect(stats.averageDuration).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty collector', () => {
      const stats = collector.getStats();

      expect(stats.total).toBe(0);
      expect(stats.active).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.totalCost).toBe(0);
      expect(stats.totalTokens).toBe(0);
      expect(stats.averageDuration).toBe(0);
    });
  });

  describe('integration scenario', () => {
    it('should track full agent execution', () => {
      // Start tracing
      const trace = collector.startTrace({
        agentId: 'customer-support',
        sessionId: 'session_123',
      });

      // Add LLM call
      collector.addStep(trace.traceId, {
        name: 'llm.chat',
        type: 'llm',
        startTime: new Date(),
        endTime: new Date(),
        input: 'Help me reset my password',
        output: 'I can help you...',
        metadata: { model: 'gpt-4', totalTokens: 150, cost: 0.003 },
      });

      // Add tool call
      collector.addStep(trace.traceId, {
        name: 'database_query',
        type: 'tool',
        startTime: new Date(),
        endTime: new Date(),
        metadata: { duration: 50 },
      });

      // Add memory operation
      collector.addStep(trace.traceId, {
        name: 'memory.store',
        type: 'memory',
        startTime: new Date(),
        endTime: new Date(),
      });

      // Complete trace
      collector.endTrace(trace.traceId);

      // Verify
      const completed = collector.getTrace(trace.traceId);
      expect(completed!.steps).toHaveLength(3);
      expect(completed!.endTime).toBeInstanceOf(Date);
      expect(completed!.totalTokens).toBe(150);
      expect(completed!.totalCost).toBe(0.003);

      // Check step counts
      const counts = ExecutionTraceHelpers.countStepsByType(completed!);
      expect(counts.get('llm')).toBe(1);
      expect(counts.get('tool')).toBe(1);
      expect(counts.get('memory')).toBe(1);
    });
  });
});
