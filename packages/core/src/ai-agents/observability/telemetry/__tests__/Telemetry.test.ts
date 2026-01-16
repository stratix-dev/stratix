import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TelemetrySpan,
  TelemetrySpanHelpers,
  SpanKind,
  SpanStatusCode,
  type SpanAttributeValue
} from '../TelemetrySpan.js';
import { AITelemetry, InMemoryTelemetry } from '../AITelemetry.js';
import { TelemetryExporter, ConsoleExporter, BatchingExporter } from '../TelemetryExporter.js';

describe('TelemetrySpan', () => {
  describe('TelemetrySpanHelpers.create', () => {
    it('should create a span with all fields', () => {
      const span = TelemetrySpanHelpers.create({
        name: 'agent.execute',
        traceId: 'trace_123',
        attributes: {
          'agent.name': 'CustomerSupport',
          'agent.version': '1.0'
        },
        kind: SpanKind.SERVER,
        parentSpanId: 'parent_123'
      });

      expect(span.spanId).toMatch(/^span_\d+_/);
      expect(span.name).toBe('agent.execute');
      expect(span.traceId).toBe('trace_123');
      expect(span.kind).toBe(SpanKind.SERVER);
      expect(span.parentSpanId).toBe('parent_123');
      expect(span.attributes).toEqual({
        'agent.name': 'CustomerSupport',
        'agent.version': '1.0'
      });
      expect(span.events).toEqual([]);
      expect(span.status).toEqual({
        code: SpanStatusCode.UNSET
      });
      expect(span.startTime).toBeInstanceOf(Date);
      expect(span.endTime).toBeUndefined();
    });

    it('should default to INTERNAL kind', () => {
      const span = TelemetrySpanHelpers.create({
        name: 'test',
        traceId: 'trace_123'
      });

      expect(span.kind).toBe(SpanKind.INTERNAL);
    });

    it('should default to empty attributes', () => {
      const span = TelemetrySpanHelpers.create({
        name: 'test',
        traceId: 'trace_123'
      });

      expect(span.attributes).toEqual({});
    });
  });

  describe('TelemetrySpanHelpers.complete', () => {
    it('should mark span as completed', () => {
      const span = TelemetrySpanHelpers.create({
        name: 'test',
        traceId: 'trace_123'
      });

      const completed = TelemetrySpanHelpers.complete(span);

      expect(completed.endTime).toBeInstanceOf(Date);
      expect(completed.status.code).toBe(SpanStatusCode.OK);
    });

    it('should mark span as error when error provided', () => {
      const span = TelemetrySpanHelpers.create({
        name: 'test',
        traceId: 'trace_123'
      });

      const error = new Error('Test error');
      const completed = TelemetrySpanHelpers.complete(span, error);

      expect(completed.status.code).toBe(SpanStatusCode.ERROR);
      expect(completed.status.message).toBe('Test error');
    });
  });

  describe('TelemetrySpanHelpers.addEvent', () => {
    it('should add an event to span with string event name', () => {
      const span = TelemetrySpanHelpers.create({
        name: 'test',
        traceId: 'trace_123'
      });

      const withEvent = TelemetrySpanHelpers.addEvent(span, 'llm.request', {
        model: 'gpt-4'
      });

      expect(withEvent.events).toHaveLength(1);
      expect(withEvent.events[0]!.name).toBe('llm.request');
      expect(withEvent.events[0]!.attributes).toEqual({ model: 'gpt-4' });
      expect(withEvent.events[0]!.timestamp).toBeInstanceOf(Date);
    });

    it('should add an event to span with full event object', () => {
      const span = TelemetrySpanHelpers.create({
        name: 'test',
        traceId: 'trace_123'
      });

      const timestamp = new Date();
      const withEvent = TelemetrySpanHelpers.addEvent(span, {
        name: 'llm.request',
        timestamp,
        attributes: { model: 'gpt-4' }
      });

      expect(withEvent.events).toHaveLength(1);
      expect(withEvent.events[0]!.name).toBe('llm.request');
      expect(withEvent.events[0]!.attributes).toEqual({ model: 'gpt-4' });
      expect(withEvent.events[0]!.timestamp).toBe(timestamp);
    });

    it('should append events', () => {
      let span = TelemetrySpanHelpers.create({
        name: 'test',
        traceId: 'trace_123'
      });

      span = TelemetrySpanHelpers.addEvent(span, 'event1');
      span = TelemetrySpanHelpers.addEvent(span, 'event2');

      expect(span.events).toHaveLength(2);
      expect(span.events[0]!.name).toBe('event1');
      expect(span.events[1]!.name).toBe('event2');
    });
  });

  describe('TelemetrySpanHelpers.setAttributes', () => {
    it('should set attributes on span', () => {
      const span = TelemetrySpanHelpers.create({
        name: 'test',
        traceId: 'trace_123',
        attributes: { key1: 'value1' }
      });

      const withAttrs = TelemetrySpanHelpers.setAttributes(span, {
        key2: 'value2',
        key3: 123
      });

      expect(withAttrs.attributes).toEqual({
        key1: 'value1',
        key2: 'value2',
        key3: 123
      });
    });

    it('should merge attributes', () => {
      const span = TelemetrySpanHelpers.create({
        name: 'test',
        traceId: 'trace_123',
        attributes: { existing: 'value' }
      });

      const updated = TelemetrySpanHelpers.setAttributes(span, {
        existing: 'updated',
        new: 'value'
      });

      expect(updated.attributes).toEqual({
        existing: 'updated',
        new: 'value'
      });
    });
  });

  describe('TelemetrySpanHelpers.getDuration', () => {
    it('should calculate duration for completed span', () => {
      const start = new Date();
      const end = new Date(start.getTime() + 1000);

      const span: TelemetrySpan = {
        spanId: 'span_123',
        traceId: 'trace_123',
        name: 'test',
        kind: SpanKind.INTERNAL,
        startTime: start,
        endTime: end,
        attributes: {},
        events: [],
        status: { code: SpanStatusCode.OK }
      };

      const duration = TelemetrySpanHelpers.getDuration(span);
      expect(duration).toBe(1000);
    });

    it('should return undefined for incomplete span', () => {
      const span = TelemetrySpanHelpers.create({
        name: 'test',
        traceId: 'trace_123'
      });

      const duration = TelemetrySpanHelpers.getDuration(span);
      expect(duration).toBeUndefined();
    });
  });

  describe('TelemetrySpanHelpers.generateSpanId', () => {
    it('should generate unique span IDs', () => {
      const id1 = TelemetrySpanHelpers.generateSpanId();
      const id2 = TelemetrySpanHelpers.generateSpanId();

      expect(id1).toMatch(/^span_\d+_/);
      expect(id2).toMatch(/^span_\d+_/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('TelemetrySpanHelpers.generateTraceId', () => {
    it('should generate unique trace IDs', () => {
      const id1 = TelemetrySpanHelpers.generateTraceId();
      const id2 = TelemetrySpanHelpers.generateTraceId();

      expect(id1).toMatch(/^trace_\d+_/);
      expect(id2).toMatch(/^trace_\d+_/);
      expect(id1).not.toBe(id2);
    });
  });
});

describe('InMemoryTelemetry', () => {
  let telemetry: InMemoryTelemetry;

  beforeEach(() => {
    telemetry = new InMemoryTelemetry();
  });

  describe('startSpan', () => {
    it('should create and store a span', () => {
      const span = telemetry.startSpan('agent.execute', {
        'agent.name': 'CustomerSupport'
      });

      expect(span.name).toBe('agent.execute');
      expect(span.attributes['agent.name']).toBe('CustomerSupport');
      expect(span.kind).toBe(SpanKind.INTERNAL);

      const retrieved = telemetry.getSpan(span.spanId);
      expect(retrieved).toEqual(span);
    });

    it('should use provided span kind', () => {
      const span = telemetry.startSpan('http.request', {}, SpanKind.CLIENT);

      expect(span.kind).toBe(SpanKind.CLIENT);
    });

    it('should set parent span ID', () => {
      const parent = telemetry.startSpan('parent');
      const child = telemetry.startSpan('child', {}, SpanKind.INTERNAL, parent.spanId);

      expect(child.parentSpanId).toBe(parent.spanId);
    });

    it('should generate trace ID for root spans', () => {
      const span = telemetry.startSpan('root');
      expect(span.traceId).toMatch(/^trace_\d+_/);
    });

    it('should inherit trace ID from parent', () => {
      const parent = telemetry.startSpan('parent');
      const child = telemetry.startSpan('child', {}, SpanKind.INTERNAL, parent.spanId);

      expect(child.traceId).toBe(parent.traceId);
    });
  });

  describe('endSpan', () => {
    it('should mark span as completed', () => {
      const span = telemetry.startSpan('test');
      telemetry.endSpan(span.spanId);

      const completed = telemetry.getSpan(span.spanId);
      expect(completed!.endTime).toBeInstanceOf(Date);
      expect(completed!.status.code).toBe(SpanStatusCode.OK);
    });

    it('should mark span as error when error provided', () => {
      const span = telemetry.startSpan('test');
      const error = new Error('Test error');
      telemetry.endSpan(span.spanId, error);

      const completed = telemetry.getSpan(span.spanId);
      expect(completed!.status.code).toBe(SpanStatusCode.ERROR);
      expect(completed!.status.message).toBe('Test error');
    });

    it('should do nothing for non-existent span', () => {
      expect(() => telemetry.endSpan('non-existent')).not.toThrow();
    });
  });

  describe('addSpanEvent', () => {
    it('should add event to existing span', () => {
      const span = telemetry.startSpan('test');
      telemetry.addSpanEvent(span.spanId, 'llm.request', {
        model: 'gpt-4'
      });

      const updated = telemetry.getSpan(span.spanId);
      expect(updated!.events).toHaveLength(1);
      expect(updated!.events[0]!.name).toBe('llm.request');
      expect(updated!.events[0]!.attributes).toEqual({ model: 'gpt-4' });
    });

    it('should do nothing for non-existent span', () => {
      expect(() => telemetry.addSpanEvent('non-existent', 'event')).not.toThrow();
    });
  });

  describe('setSpanAttributes', () => {
    it('should set attributes on existing span', () => {
      const span = telemetry.startSpan('test', { key1: 'value1' });
      telemetry.setSpanAttributes(span.spanId, { key2: 'value2' });

      const updated = telemetry.getSpan(span.spanId);
      expect(updated!.attributes).toEqual({
        key1: 'value1',
        key2: 'value2'
      });
    });

    it('should do nothing for non-existent span', () => {
      expect(() => telemetry.setSpanAttributes('non-existent', {})).not.toThrow();
    });
  });

  describe('getSpan', () => {
    it('should return span by ID', () => {
      const span = telemetry.startSpan('test');
      const retrieved = telemetry.getSpan(span.spanId);
      expect(retrieved).toEqual(span);
    });

    it('should return undefined for non-existent span', () => {
      const span = telemetry.getSpan('non-existent');
      expect(span).toBeUndefined();
    });
  });

  describe('getAllSpans', () => {
    it('should return all spans', () => {
      telemetry.startSpan('span1');
      telemetry.startSpan('span2');
      telemetry.startSpan('span3');

      const all = telemetry.getAllSpans();
      expect(all).toHaveLength(3);
    });

    it('should return empty array when no spans', () => {
      const all = telemetry.getAllSpans();
      expect(all).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should remove all spans', () => {
      telemetry.startSpan('span1');
      telemetry.startSpan('span2');

      expect(telemetry.getAllSpans()).toHaveLength(2);

      telemetry.clear();

      expect(telemetry.getAllSpans()).toHaveLength(0);
    });
  });

  describe('integration scenario', () => {
    it('should track agent execution with nested spans', () => {
      // Start agent execution
      const agentSpan = telemetry.startSpan(
        'agent.execute',
        {
          'agent.name': 'CustomerSupport'
        },
        SpanKind.SERVER
      );

      // Track LLM call
      const llmSpan = telemetry.startSpan(
        'llm.chat',
        { model: 'gpt-4' },
        SpanKind.CLIENT,
        agentSpan.spanId
      );
      telemetry.addSpanEvent(llmSpan.spanId, 'request.sent');
      telemetry.setSpanAttributes(llmSpan.spanId, { tokens: 150 });
      telemetry.endSpan(llmSpan.spanId);

      // Track tool call
      const toolSpan = telemetry.startSpan(
        'tool.execute',
        { tool: 'database_query' },
        SpanKind.INTERNAL,
        agentSpan.spanId
      );
      telemetry.endSpan(toolSpan.spanId);

      // Complete agent execution
      telemetry.endSpan(agentSpan.spanId);

      // Verify structure
      const allSpans = telemetry.getAllSpans();
      expect(allSpans).toHaveLength(3);

      // All child spans should have same trace ID
      expect(llmSpan.traceId).toBe(agentSpan.traceId);
      expect(toolSpan.traceId).toBe(agentSpan.traceId);

      // All spans should be completed
      expect(allSpans.every((s) => s.endTime !== undefined)).toBe(true);
    });
  });
});

describe('ConsoleExporter', () => {
  let exporter: ConsoleExporter;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exporter = new ConsoleExporter();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('export', () => {
    it('should export spans to console', async () => {
      const spans: TelemetrySpan[] = [
        TelemetrySpanHelpers.complete(
          TelemetrySpanHelpers.create({
            name: 'test',
            traceId: 'trace_123'
          })
        )
      ];

      await exporter.export(spans);

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle multiple spans', async () => {
      const spans: TelemetrySpan[] = [
        TelemetrySpanHelpers.create({ name: 'span1', traceId: 'trace_1' }),
        TelemetrySpanHelpers.create({ name: 'span2', traceId: 'trace_1' })
      ];

      await exporter.export(spans);

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle empty spans array', async () => {
      await exporter.export([]);
      // ConsoleExporter doesn't log anything for empty array
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('shutdown', () => {
    it('should resolve without error', async () => {
      await expect(exporter.shutdown()).resolves.toBeUndefined();
    });
  });
});

describe('BatchingExporter', () => {
  let mockExporter: TelemetryExporter;
  let batchingExporter: BatchingExporter;

  beforeEach(() => {
    mockExporter = {
      export: vi.fn().mockResolvedValue(undefined),
      flush: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn().mockResolvedValue(undefined)
    };
    batchingExporter = new BatchingExporter(mockExporter, {
      batchSize: 3,
      flushInterval: 100
    });
  });

  afterEach(async () => {
    await batchingExporter.shutdown();
  });

  describe('export', () => {
    it('should batch spans until batchSize', async () => {
      const span1 = TelemetrySpanHelpers.create({
        name: 'span1',
        traceId: 'trace_1'
      });
      const span2 = TelemetrySpanHelpers.create({
        name: 'span2',
        traceId: 'trace_1'
      });
      const span3 = TelemetrySpanHelpers.create({
        name: 'span3',
        traceId: 'trace_1'
      });

      await batchingExporter.export([span1]);
      await batchingExporter.export([span2]);

      // Should not have exported yet
      expect(mockExporter.export).not.toHaveBeenCalled();

      await batchingExporter.export([span3]);

      // Should export when batch is full
      expect(mockExporter.export).toHaveBeenCalledWith([span1, span2, span3]);
    });

    it('should flush on flushInterval', async () => {
      const span = TelemetrySpanHelpers.create({
        name: 'span',
        traceId: 'trace_1'
      });

      await batchingExporter.export([span]);

      // Wait for flush interval
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(mockExporter.export).toHaveBeenCalledWith([span]);
    });

    it('should handle multiple batches', async () => {
      const spans = Array.from({ length: 6 }, (_, i) =>
        TelemetrySpanHelpers.create({
          name: `span${i}`,
          traceId: 'trace_1'
        })
      );

      for (const span of spans) {
        await batchingExporter.export([span]);
      }

      // Should have exported 2 batches
      expect(mockExporter.export).toHaveBeenCalledTimes(2);
    });
  });

  describe('shutdown', () => {
    it('should flush remaining spans', async () => {
      const span = TelemetrySpanHelpers.create({
        name: 'span',
        traceId: 'trace_1'
      });

      await batchingExporter.export([span]);
      await batchingExporter.shutdown();

      expect(mockExporter.export).toHaveBeenCalledWith([span]);
      expect(mockExporter.shutdown).toHaveBeenCalled();
    });

    it('should handle empty batch', async () => {
      await batchingExporter.shutdown();

      expect(mockExporter.shutdown).toHaveBeenCalled();
    });
  });
});
