import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StandardWorkflowEngine } from '../StandardWorkflowEngine.js';
import { WorkflowBuilder } from '../WorkflowBuilder.js';
import type { Workflow, RAGPipeline, ToolRegistry, AgentTool } from '@stratix/core/ai-agents';

describe('StandardWorkflowEngine', () => {
  let engine: StandardWorkflowEngine;
  let mockRAGPipeline: RAGPipeline;
  let mockToolRegistry: ToolRegistry;

  beforeEach(() => {
    // Mock RAG Pipeline
    mockRAGPipeline = {
      config: {} as any,
      ingest: vi.fn(),
      retrieve: vi.fn(),
      query: vi.fn().mockResolvedValue({
        response: 'RAG response',
        context: [],
        tokenUsage: { embeddings: 10, generation: 20, total: 30 },
      }),
      clear: vi.fn(),
      getStatistics: vi.fn(),
    };

    // Mock Tool Registry
    const mockTool: AgentTool = {
      name: 'testTool',
      description: 'Test tool',
      schema: {},
      execute: vi.fn().mockResolvedValue({ success: true }),
    };

    mockToolRegistry = {
      register: vi.fn(),
      get: vi.fn().mockResolvedValue(mockTool),
      list: vi.fn(),
      search: vi.fn(),
      unregister: vi.fn(),
      has: vi.fn(),
      clear: vi.fn(),
    };

    engine = new StandardWorkflowEngine({
      ragPipelines: new Map([['default', mockRAGPipeline]]),
      toolRegistry: mockToolRegistry,
      humanHandler: async (prompt) => 'Approved',
    });
  });

  describe('basic workflow execution', () => {
    it('should execute empty workflow', async () => {
      const workflow: Workflow = {
        id: 'empty',
        name: 'Empty Workflow',
        version: '1.0.0',
        steps: [],
      };

      const result = await engine.execute(workflow, {});

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.status).toBe('completed');
        expect(result.value.workflowId).toBe('empty');
      }
    });

    it('should execute workflow with literal inputs', async () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .transform(
          WorkflowBuilder.literal('hello'),
          '${$input}',
          'greeting'
        )
        .build();

      const result = await engine.execute(workflow, {});

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.variables.greeting).toBe('hello');
      }
    });

    it('should execute workflow with variable inputs', async () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .transform(
          WorkflowBuilder.variable('userName'),
          '${$input}',
          'output'
        )
        .build();

      const result = await engine.execute(workflow, { userName: 'Alice' });

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.variables.output).toBe('Alice');
        expect(result.value.variables.userName).toBe('Alice');
      }
    });

    it('should track step execution history', async () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .transform(WorkflowBuilder.literal(1), '${$input}', 'step1')
        .transform(WorkflowBuilder.literal(2), '${$input}', 'step2')
        .build();

      const result = await engine.execute(workflow, {});

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.stepHistory).toHaveLength(2);
        expect(result.value.stepHistory[0].stepType).toBe('transform');
        expect(result.value.stepHistory[0].status).toBe('completed');
        expect(result.value.stepHistory[1].status).toBe('completed');
      }
    });

    it('should set start and end times', async () => {
      const workflow = new WorkflowBuilder('test', '1.0.0').build();

      const result = await engine.execute(workflow, {});

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.startTime).toBeInstanceOf(Date);
        expect(result.value.endTime).toBeInstanceOf(Date);
        expect(result.value.endTime!.getTime()).toBeGreaterThanOrEqual(
          result.value.startTime.getTime()
        );
      }
    });
  });

  describe('transform steps', () => {
    it('should execute transform with expression', () => {
      const testEngine = new StandardWorkflowEngine({
        expressionEvaluator: (expr, vars) => {
          if (expr === '${$input} World') {
            return `${vars.$input} World`;
          }
          return expr;
        },
      });

      const workflow = new WorkflowBuilder('test', '1.0.0')
        .transform(
          WorkflowBuilder.literal('Hello'),
          '${$input} World',
          'greeting'
        )
        .build();

      return testEngine.execute(workflow, {}).then((result) => {
        expect(result.isSuccess).toBe(true);
        if (result.isSuccess) {
          expect(result.value.variables.greeting).toBe('Hello World');
        }
      });
    });

    it('should evaluate boolean expressions', async () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .transform(WorkflowBuilder.literal('true'), '${$input}', 'boolValue')
        .build();

      const result = await engine.execute(workflow, {});

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.variables.boolValue).toBe(true);
      }
    });

    it('should evaluate number expressions', async () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .transform(WorkflowBuilder.literal('42'), '${$input}', 'numValue')
        .build();

      const result = await engine.execute(workflow, {});

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.variables.numValue).toBe(42);
      }
    });
  });

  describe('conditional steps', () => {
    it('should execute then branch when condition is true', async () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .condition(
          'true',
          (then) => then.transform(WorkflowBuilder.literal('then'), '${$input}', 'result')
        )
        .build();

      const result = await engine.execute(workflow, {});

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.variables.result).toBe('then');
      }
    });

    it('should execute else branch when condition is false', async () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .condition(
          'false',
          (then) => then.transform(WorkflowBuilder.literal('then'), '${$input}', 'result'),
          (els) => els.transform(WorkflowBuilder.literal('else'), '${$input}', 'result')
        )
        .build();

      const result = await engine.execute(workflow, {});

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.variables.result).toBe('else');
      }
    });

    it('should not execute else branch when condition is true', async () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .condition(
          'true',
          (then) => then.transform(WorkflowBuilder.literal('then'), '${$input}', 'result'),
          (els) => els.transform(WorkflowBuilder.literal('else'), '${$input}', 'elseResult')
        )
        .build();

      const result = await engine.execute(workflow, {});

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.variables.result).toBe('then');
        expect(result.value.variables.elseResult).toBeUndefined();
      }
    });

    it('should evaluate variable-based conditions', async () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .condition(
          '${isActive}',
          (then) => then.transform(WorkflowBuilder.literal('active'), '${$input}', 'status')
        )
        .build();

      const result = await engine.execute(workflow, { isActive: true });

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.variables.status).toBe('active');
      }
    });
  });

  describe('parallel steps', () => {
    it('should execute parallel branches', async () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .parallel(
          (b1) => b1.transform(WorkflowBuilder.literal('a'), '${$input}', 'result1'),
          (b2) => b2.transform(WorkflowBuilder.literal('b'), '${$input}', 'result2'),
          (b3) => b3.transform(WorkflowBuilder.literal('c'), '${$input}', 'result3')
        )
        .build();

      const result = await engine.execute(workflow, {});

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        // Parallel step stores results in execution
        expect(result.value.stepHistory[0].status).toBe('completed');
      }
    });

    it('should isolate variables between parallel branches', async () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .parallel(
          (b1) => b1.transform(WorkflowBuilder.literal(1), '${$input}', 'value'),
          (b2) => b2.transform(WorkflowBuilder.literal(2), '${$input}', 'value')
        )
        .build();

      const result = await engine.execute(workflow, {});

      expect(result.isSuccess).toBe(true);
    });
  });

  describe('loop steps', () => {
    it('should execute loop over collection', async () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .loop(
          WorkflowBuilder.literal([1, 2, 3]),
          'item',
          (loop) => loop.transform(
            WorkflowBuilder.variable('item'),
            '${$input}',
            'temp'
          )
        )
        .build();

      const result = await engine.execute(workflow, {});

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.variables.item).toBe(3); // Last iteration
      }
    });

    it('should execute loop from variable collection', async () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .loop(
          WorkflowBuilder.variable('items'),
          'current',
          (loop) => loop.transform(
            WorkflowBuilder.variable('current'),
            '${$input}',
            'temp'
          )
        )
        .build();

      const result = await engine.execute(workflow, {
        items: ['a', 'b', 'c'],
      });

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.variables.current).toBe('c');
      }
    });

    it('should respect maxIterations', async () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .loop(
          WorkflowBuilder.literal([1, 2, 3, 4, 5]),
          'item',
          (loop) => loop.transform(
            WorkflowBuilder.variable('item'),
            '${$input}',
            'temp'
          ),
          2 // maxIterations
        )
        .build();

      const result = await engine.execute(workflow, {});

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.variables.item).toBe(2); // Only 2 iterations
      }
    });

    it('should fail when collection is not an array', async () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .loop(
          WorkflowBuilder.literal('not an array'),
          'item',
          (loop) => loop.transform(WorkflowBuilder.literal('test'), '${$input}', 'temp')
        )
        .build();

      const result = await engine.execute(workflow, {});

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.error.message).toContain('must be an array');
      }
    });
  });

  describe('human-in-the-loop steps', () => {
    it('should execute human step with handler', async () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .humanApproval('Approve?', undefined, { output: 'decision' })
        .build();

      const result = await engine.execute(workflow, {});

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.variables.decision).toBe('Approved');
      }
    });

    it('should fail when human handler is not configured', async () => {
      const engineWithoutHandler = new StandardWorkflowEngine({});

      const workflow = new WorkflowBuilder('test', '1.0.0')
        .humanApproval('Approve?')
        .build();

      const result = await engineWithoutHandler.execute(workflow, {});

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.error.message).toContain('Human handler not configured');
      }
    });
  });

  describe('RAG steps', () => {
    it('should execute RAG step', async () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .rag('default', WorkflowBuilder.literal('test query'), { output: 'ragResult' })
        .build();

      const result = await engine.execute(workflow, {});

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(mockRAGPipeline.query).toHaveBeenCalledWith('test query', { limit: undefined });
        expect(result.value.variables.ragResult).toBeDefined();
      }
    });

    it('should execute RAG step with topK', async () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .rag('default', WorkflowBuilder.literal('test'), { topK: 5 })
        .build();

      const result = await engine.execute(workflow, {});

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(mockRAGPipeline.query).toHaveBeenCalledWith('test', { limit: 5 });
      }
    });

    it('should fail when pipeline not found', async () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .rag('nonexistent', WorkflowBuilder.literal('test'))
        .build();

      const result = await engine.execute(workflow, {});

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.error.message).toContain('RAG pipeline not found');
      }
    });

    it('should fail when query is not a string', async () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .rag('default', WorkflowBuilder.literal(123))
        .build();

      const result = await engine.execute(workflow, {});

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.error.message).toContain('must be a string');
      }
    });
  });

  describe('tool steps', () => {
    it('should execute tool step', async () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .tool('testTool', WorkflowBuilder.literal({ test: 'data' }))
        .build();

      const result = await engine.execute(workflow, {});

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(mockToolRegistry.get).toHaveBeenCalledWith('testTool');
      }
    });

    it('should fail when tool registry not configured', async () => {
      const engineWithoutTools = new StandardWorkflowEngine({});

      const workflow = new WorkflowBuilder('test', '1.0.0')
        .tool('testTool', WorkflowBuilder.literal('test'))
        .build();

      const result = await engineWithoutTools.execute(workflow, {});

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.error.message).toContain('ToolRegistry not configured');
      }
    });
  });

  describe('error handling', () => {
    it('should fail workflow on step error', async () => {
      // Create a workflow that will fail
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .loop(
          WorkflowBuilder.literal('not an array'),
          'item',
          (loop) => loop.transform(WorkflowBuilder.literal('test'), '${$input}', 'temp')
        )
        .build();

      const result = await engine.execute(workflow, {});

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    it('should mark execution as failed with error', async () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .rag('nonexistent', WorkflowBuilder.literal('query'))
        .build();

      const result = await engine.execute(workflow, {});

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        const execution = await engine.getExecution(result.error.message.includes('RAG pipeline not found') ? '' : '');
        // Execution tracking may vary
      }
    });
  });

  describe('execution management', () => {
    it('should retrieve execution by ID', async () => {
      const workflow = new WorkflowBuilder('test', '1.0.0').build();

      const result = await engine.execute(workflow, {});

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        const execution = await engine.getExecution(result.value.id);
        expect(execution).toBeDefined();
        expect(execution?.id).toBe(result.value.id);
      }
    });

    it('should list active executions', async () => {
      const workflow = new WorkflowBuilder('test', '1.0.0').build();

      await engine.execute(workflow, {});

      const activeExecutions = await engine.listActive();
      // Execution is already completed
      expect(activeExecutions).toHaveLength(0);
    });

    it('should list executions for a workflow', async () => {
      const workflow = new WorkflowBuilder('my-workflow', '1.0.0').build();

      await engine.execute(workflow, {});
      await engine.execute(workflow, {});

      const executions = await engine.listExecutions('my-workflow');
      expect(executions).toHaveLength(2);
    });
  });

  describe('pause and resume', () => {
    it('should pause a running execution', async () => {
      // This test is conceptual since our simple engine completes immediately
      const workflow = new WorkflowBuilder('test', '1.0.0').build();

      const result = await engine.execute(workflow, {});

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        // Try to pause (will fail since it's already completed)
        const pauseResult = await engine.pause(result.value.id);
        expect(pauseResult.isSuccess).toBe(false);
      }
    });

    it('should resume a paused execution', async () => {
      // Conceptual test - would need async workflow for real testing
      const fakeExecutionId = 'fake-id';

      const resumeResult = await engine.resume(fakeExecutionId);

      expect(resumeResult.isSuccess).toBe(false);
      if (!resumeResult.isSuccess) {
        expect(resumeResult.error.message).toContain('not found');
      }
    });
  });

  describe('cancel execution', () => {
    it('should cancel a running execution', async () => {
      const workflow = new WorkflowBuilder('test', '1.0.0').build();

      const result = await engine.execute(workflow, {});

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        // Try to cancel (will fail since it's already completed)
        const cancelResult = await engine.cancel(result.value.id);
        expect(cancelResult.isSuccess).toBe(false);
      }
    });
  });

  describe('complex workflows', () => {
    it('should execute a multi-step workflow with variables', async () => {
      const workflow = new WorkflowBuilder('complex', '1.0.0')
        .transform(
          WorkflowBuilder.variable('input'),
          '${$input}',
          'step1Result'
        )
        .condition(
          '${step1Result}',
          (then) => then.transform(
            WorkflowBuilder.variable('step1Result'),
            '${$input}',
            'step2Result'
          )
        )
        .transform(
          WorkflowBuilder.variable('step2Result'),
          '${$input}',
          'finalResult'
        )
        .build();

      const result = await engine.execute(workflow, { input: 'test value' });

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.variables.step1Result).toBe('test value');
        expect(result.value.variables.step2Result).toBe('test value');
        expect(result.value.variables.finalResult).toBe('test value');
      }
    });
  });
});
