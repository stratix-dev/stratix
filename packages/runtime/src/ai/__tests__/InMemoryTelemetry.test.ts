import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryTelemetry, InMemorySpan, ConsoleExporter } from '../InMemoryTelemetry.js';
import type {
  LLMMetrics,
  AgentMetrics,
  RetrievalMetrics,
  WorkflowMetrics,
  GuardrailMetrics,
  ToolMetrics,
  TelemetryExporter,
} from '@stratix/core/ai-agents';

describe('InMemorySpan', () => {
  it('should create span with basic properties', () => {
    const span = new InMemorySpan('test-span', 'llm.call');

    expect(span.id).toBeDefined();
    expect(span.name).toBe('test-span');
    expect(span.type).toBe('llm.call');
    expect(span.startTime).toBeInstanceOf(Date);
    expect(span.status).toBe('unset');
  });

  it('should set attributes', () => {
    const span = new InMemorySpan('test-span', 'agent.execute');

    span.setAttribute('model', 'gpt-4');
    span.setAttribute('temperature', 0.7);
    span.setAttribute('streaming', true);

    expect(span.attributes.model).toBe('gpt-4');
    expect(span.attributes.temperature).toBe(0.7);
    expect(span.attributes.streaming).toBe(true);
  });

  it('should set multiple attributes at once', () => {
    const span = new InMemorySpan('test-span', 'rag.retrieve');

    span.setAttributes({
      pipeline: 'default',
      topK: 5,
      enabled: true,
    });

    expect(span.attributes.pipeline).toBe('default');
    expect(span.attributes.topK).toBe(5);
    expect(span.attributes.enabled).toBe(true);
  });

  it('should record exceptions', () => {
    const span = new InMemorySpan('test-span', 'tool.execute');
    const error = new Error('Tool failed');

    span.recordException(error);

    expect(span.error).toBe(error);
    expect(span.status).toBe('error');
    expect(span.attributes['status.message']).toBe('Tool failed');
  });

  it('should set span status', () => {
    const span = new InMemorySpan('test-span', 'llm.call');

    span.setStatus('ok', 'Success');

    expect(span.status).toBe('ok');
    expect(span.attributes['status.message']).toBe('Success');
  });

  it('should end span and calculate duration', async () => {
    const span = new InMemorySpan('test-span', 'agent.execute');

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 10));

    span.end();

    expect(span.endTime).toBeInstanceOf(Date);
    expect(span.durationMs).toBeGreaterThan(0);
    expect(span.status).toBe('ok'); // Default to ok if not set
  });

  it('should call onEnd callback when span ends', () => {
    const onEnd = vi.fn();
    const span = new InMemorySpan('test-span', 'llm.call', undefined, onEnd);

    span.end();

    expect(onEnd).toHaveBeenCalledWith(span);
  });

  it('should not allow modifications after span ends', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const span = new InMemorySpan('test-span', 'llm.call');

    span.end();

    span.setAttribute('key', 'value');
    span.setStatus('error');
    span.recordException(new Error('test'));

    expect(consoleSpy).toHaveBeenCalledTimes(3);
    consoleSpy.mockRestore();
  });

  it('should warn when ending span twice', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const span = new InMemorySpan('test-span', 'llm.call');

    span.end();
    span.end();

    expect(consoleSpy).toHaveBeenCalledWith('Span already ended');
    consoleSpy.mockRestore();
  });
});

describe('InMemoryTelemetry', () => {
  let telemetry: InMemoryTelemetry;

  beforeEach(() => {
    telemetry = new InMemoryTelemetry();
  });

  describe('span management', () => {
    it('should start and track spans', () => {
      const span = telemetry.startSpan('test-span', 'llm.call');

      expect(span).toBeDefined();
      expect(span.name).toBe('test-span');
      expect(span.type).toBe('llm.call');
    });

    it('should add service attributes to spans', () => {
      const telemetry = new InMemoryTelemetry({
        serviceName: 'my-service',
        serviceVersion: '2.0.0',
        environment: 'production',
      });

      const span = telemetry.startSpan('test-span', 'agent.execute');

      expect(span.attributes['service.name']).toBe('my-service');
      expect(span.attributes['service.version']).toBe('2.0.0');
      expect(span.attributes['environment']).toBe('production');
    });

    it('should add global attributes to spans', () => {
      const telemetry = new InMemoryTelemetry({
        attributes: {
          region: 'us-east-1',
          team: 'ai-platform',
        },
      });

      const span = telemetry.startSpan('test-span', 'llm.call');

      expect(span.attributes.region).toBe('us-east-1');
      expect(span.attributes.team).toBe('ai-platform');
    });

    it('should track ended spans', () => {
      const span = telemetry.startSpan('test-span', 'llm.call');
      span.end();

      const spans = telemetry.getSpans();
      expect(spans).toHaveLength(1);
      expect(spans[0]).toBe(span);
    });

    it('should get and set active span', () => {
      const span = telemetry.startSpan('test-span', 'agent.execute');

      telemetry.setActiveSpan(span);
      expect(telemetry.getActiveSpan()).toBe(span);

      telemetry.setActiveSpan(undefined);
      expect(telemetry.getActiveSpan()).toBeUndefined();
    });

    it('should get span by ID', () => {
      const span = telemetry.startSpan('test-span', 'llm.call');
      span.end();

      const found = telemetry.getSpanById(span.id);
      expect(found).toBe(span);
    });

    it('should get spans by type', () => {
      const span1 = telemetry.startSpan('span-1', 'llm.call');
      const span2 = telemetry.startSpan('span-2', 'agent.execute');
      const span3 = telemetry.startSpan('span-3', 'llm.call');

      span1.end();
      span2.end();
      span3.end();

      const llmSpans = telemetry.getSpansByType('llm.call');
      expect(llmSpans).toHaveLength(2);
      expect(llmSpans[0].name).toBe('span-1');
      expect(llmSpans[1].name).toBe('span-3');
    });

    it('should get failed spans', () => {
      const span1 = telemetry.startSpan('span-1', 'llm.call');
      span1.setStatus('ok');
      span1.end();

      const span2 = telemetry.startSpan('span-2', 'agent.execute');
      span2.recordException(new Error('failed'));
      span2.end();

      const failedSpans = telemetry.getFailedSpans();
      expect(failedSpans).toHaveLength(1);
      expect(failedSpans[0]).toBe(span2);
    });
  });

  describe('metrics recording', () => {
    it('should record LLM metrics', () => {
      const metrics: LLMMetrics = {
        traceId: 'trace-1',
        spanId: 'span-1',
        provider: 'openai',
        model: 'gpt-4',
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        latencyMs: 1200,
        cost: 0.015,
        success: true,
        temperature: 0.7,
        timestamp: new Date(),
      };

      telemetry.recordLLMCall(metrics);

      const allMetrics = telemetry.getMetrics();
      expect(allMetrics.llmCalls).toHaveLength(1);
      expect(allMetrics.llmCalls[0]).toEqual(metrics);
    });

    it('should record agent execution metrics', () => {
      const metrics: AgentMetrics = {
        traceId: 'trace-1',
        spanId: 'span-1',
        agentId: 'agent-1',
        agentVersion: '1.0.0',
        inputSize: 500,
        outputSize: 300,
        latencyMs: 2500,
        llmCalls: 3,
        toolCalls: 2,
        totalTokens: 500,
        totalCost: 0.05,
        success: true,
        timestamp: new Date(),
      };

      telemetry.recordAgentExecution(metrics);

      const allMetrics = telemetry.getMetrics();
      expect(allMetrics.agentExecutions).toHaveLength(1);
      expect(allMetrics.agentExecutions[0]).toEqual(metrics);
    });

    it('should record RAG retrieval metrics', () => {
      const metrics: RetrievalMetrics = {
        traceId: 'trace-1',
        spanId: 'span-1',
        pipelineId: 'default',
        query: 'test query',
        topK: 5,
        documentsRetrieved: 5,
        latencyMs: 150,
        embeddingLatencyMs: 50,
        searchLatencyMs: 100,
        success: true,
        timestamp: new Date(),
      };

      telemetry.recordRetrieval(metrics);

      const allMetrics = telemetry.getMetrics();
      expect(allMetrics.retrievals).toHaveLength(1);
      expect(allMetrics.retrievals[0]).toEqual(metrics);
    });

    it('should record workflow execution metrics', () => {
      const metrics: WorkflowMetrics = {
        traceId: 'trace-1',
        spanId: 'span-1',
        workflowId: 'workflow-1',
        workflowVersion: '1.0.0',
        totalSteps: 5,
        completedSteps: 5,
        failedSteps: 0,
        skippedSteps: 0,
        latencyMs: 3000,
        success: true,
        timestamp: new Date(),
      };

      telemetry.recordWorkflow(metrics);

      const allMetrics = telemetry.getMetrics();
      expect(allMetrics.workflows).toHaveLength(1);
      expect(allMetrics.workflows[0]).toEqual(metrics);
    });

    it('should record guardrail evaluation metrics', () => {
      const metrics: GuardrailMetrics = {
        traceId: 'trace-1',
        spanId: 'span-1',
        guardrailId: 'pii-guard',
        passed: true,
        violations: 0,
        severity: 'info',
        latencyMs: 10,
        timestamp: new Date(),
      };

      telemetry.recordGuardrail(metrics);

      const allMetrics = telemetry.getMetrics();
      expect(allMetrics.guardrails).toHaveLength(1);
      expect(allMetrics.guardrails[0]).toEqual(metrics);
    });

    it('should record tool execution metrics', () => {
      const metrics: ToolMetrics = {
        traceId: 'trace-1',
        spanId: 'span-1',
        toolName: 'calculator',
        inputSize: 20,
        outputSize: 10,
        latencyMs: 5,
        success: true,
        timestamp: new Date(),
      };

      telemetry.recordTool(metrics);

      const allMetrics = telemetry.getMetrics();
      expect(allMetrics.tools).toHaveLength(1);
      expect(allMetrics.tools[0]).toEqual(metrics);
    });

    it('should calculate aggregated metrics', () => {
      // Add LLM metrics
      telemetry.recordLLMCall({
        traceId: 'trace-1',
        spanId: 'span-1',
        provider: 'openai',
        model: 'gpt-4',
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        latencyMs: 1000,
        cost: 0.01,
        success: true,
        timestamp: new Date(),
      });

      telemetry.recordLLMCall({
        traceId: 'trace-1',
        spanId: 'span-2',
        provider: 'openai',
        model: 'gpt-3.5',
        inputTokens: 50,
        outputTokens: 25,
        totalTokens: 75,
        latencyMs: 500,
        cost: 0.005,
        success: true,
        timestamp: new Date(),
      });

      const metrics = telemetry.getMetrics();

      expect(metrics.totalCost).toBe(0.015);
      expect(metrics.totalTokens).toBe(225);
      expect(metrics.llmCalls).toHaveLength(2);
    });
  });

  describe('trace context', () => {
    it('should get trace context', () => {
      const context = telemetry.getContext();

      expect(context.traceId).toBeDefined();
      expect(context.spanId).toBeDefined();
    });

    it('should set trace context', () => {
      const customContext = {
        traceId: 'custom-trace-id',
        spanId: 'custom-span-id',
        parentSpanId: 'parent-span-id',
      };

      telemetry.setContext(customContext);

      const context = telemetry.getContext();
      expect(context.traceId).toBe('custom-trace-id');
    });
  });

  describe('statistics', () => {
    it('should calculate comprehensive statistics', () => {
      // Create some spans
      const span1 = telemetry.startSpan('span-1', 'llm.call');
      span1.end();

      const span2 = telemetry.startSpan('span-2', 'agent.execute');
      span2.end();

      const span3 = telemetry.startSpan('span-3', 'llm.call');
      span3.recordException(new Error('failed'));
      span3.end();

      // Record metrics
      telemetry.recordLLMCall({
        traceId: 'trace-1',
        spanId: 'span-1',
        provider: 'openai',
        model: 'gpt-4',
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        latencyMs: 1000,
        cost: 0.01,
        success: true,
        timestamp: new Date(),
      });

      telemetry.recordAgentExecution({
        traceId: 'trace-1',
        spanId: 'span-2',
        agentId: 'agent-1',
        agentVersion: '1.0.0',
        inputSize: 500,
        outputSize: 300,
        latencyMs: 2000,
        llmCalls: 2,
        toolCalls: 1,
        totalTokens: 300,
        totalCost: 0.03,
        success: true,
        timestamp: new Date(),
      });

      const stats = telemetry.getStatistics();

      expect(stats.totalSpans).toBe(3);
      expect(stats.spansByType['llm.call']).toBe(2);
      expect(stats.spansByType['agent.execute']).toBe(1);
      expect(stats.successRate).toBe(2 / 3);
      expect(stats.averageDuration).toBeGreaterThanOrEqual(0);
      expect(stats.totalLLMCalls).toBe(1);
      expect(stats.totalAgentExecutions).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all data', () => {
      const span = telemetry.startSpan('test-span', 'llm.call');
      span.end();

      telemetry.recordLLMCall({
        traceId: 'trace-1',
        spanId: 'span-1',
        provider: 'openai',
        model: 'gpt-4',
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        latencyMs: 1000,
        cost: 0.01,
        success: true,
        timestamp: new Date(),
      });

      telemetry.clear();

      expect(telemetry.getSpans()).toHaveLength(0);
      expect(telemetry.getMetrics().llmCalls).toHaveLength(0);
      expect(telemetry.getActiveSpan()).toBeUndefined();
    });
  });

  describe('exporters', () => {
    it('should export spans to registered exporters', async () => {
      const mockExporter: TelemetryExporter = {
        exportSpan: vi.fn().mockResolvedValue(undefined),
        exportMetrics: vi.fn().mockResolvedValue(undefined),
        flush: vi.fn().mockResolvedValue(undefined),
        shutdown: vi.fn().mockResolvedValue(undefined),
      };

      telemetry.addExporter(mockExporter);

      const span = telemetry.startSpan('test-span', 'llm.call');
      span.end();

      // Wait for async export
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockExporter.exportSpan).toHaveBeenCalledWith(span);
    });

    it('should export metrics to registered exporters', async () => {
      const mockExporter: TelemetryExporter = {
        exportSpan: vi.fn().mockResolvedValue(undefined),
        exportMetrics: vi.fn().mockResolvedValue(undefined),
        flush: vi.fn().mockResolvedValue(undefined),
        shutdown: vi.fn().mockResolvedValue(undefined),
      };

      telemetry.addExporter(mockExporter);

      const metrics: LLMMetrics = {
        traceId: 'trace-1',
        spanId: 'span-1',
        provider: 'openai',
        model: 'gpt-4',
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        latencyMs: 1000,
        cost: 0.01,
        success: true,
        timestamp: new Date(),
      };

      telemetry.recordLLMCall(metrics);

      // Wait for async export
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockExporter.exportMetrics).toHaveBeenCalledWith(metrics);
    });

    it('should flush all exporters', async () => {
      const mockExporter: TelemetryExporter = {
        exportSpan: vi.fn().mockResolvedValue(undefined),
        exportMetrics: vi.fn().mockResolvedValue(undefined),
        flush: vi.fn().mockResolvedValue(undefined),
        shutdown: vi.fn().mockResolvedValue(undefined),
      };

      telemetry.addExporter(mockExporter);

      await telemetry.flush();

      expect(mockExporter.flush).toHaveBeenCalled();
    });
  });

  describe('disabled telemetry', () => {
    it('should not record when disabled', () => {
      const telemetry = new InMemoryTelemetry({ enabled: false });

      const span = telemetry.startSpan('test-span', 'llm.call');
      span.end();

      telemetry.recordLLMCall({
        traceId: 'trace-1',
        spanId: 'span-1',
        provider: 'openai',
        model: 'gpt-4',
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        latencyMs: 1000,
        cost: 0.01,
        success: true,
        timestamp: new Date(),
      });

      expect(telemetry.getSpans()).toHaveLength(0);
      expect(telemetry.getMetrics().llmCalls).toHaveLength(0);
    });
  });
});

describe('ConsoleExporter', () => {
  it('should log spans to console', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exporter = new ConsoleExporter();

    const span = new InMemorySpan('test-span', 'llm.call');
    span.end();

    await exporter.exportSpan(span);

    expect(consoleSpy).toHaveBeenCalledWith('[Telemetry Span]', expect.any(Object));
    consoleSpy.mockRestore();
  });

  it('should log metrics to console', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exporter = new ConsoleExporter();

    const metrics: LLMMetrics = {
      traceId: 'trace-1',
      spanId: 'span-1',
      provider: 'openai',
      model: 'gpt-4',
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      latencyMs: 1000,
      cost: 0.01,
      success: true,
      timestamp: new Date(),
    };

    await exporter.exportMetrics(metrics);

    expect(consoleSpy).toHaveBeenCalledWith('[Telemetry Metrics]', metrics);
    consoleSpy.mockRestore();
  });
});
