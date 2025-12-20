import { describe, it, expect } from 'vitest';
import { WorkflowBuilder } from '../WorkflowBuilder.js';

describe('WorkflowBuilder', () => {
  describe('basic workflow creation', () => {
    it('should create a simple workflow', () => {
      const workflow = new WorkflowBuilder('test-workflow', '1.0.0')
        .name('Test Workflow')
        .build();

      expect(workflow.id).toBe('test-workflow');
      expect(workflow.name).toBe('Test Workflow');
      expect(workflow.version).toBe('1.0.0');
      expect(workflow.steps).toHaveLength(0);
    });

    it('should use ID as name if name not provided', () => {
      const workflow = new WorkflowBuilder('test-workflow', '1.0.0').build();

      expect(workflow.name).toBe('test-workflow');
    });

    it('should set timeout', () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .withTimeout(60000)
        .build();

      expect(workflow.timeout).toBe(60000);
    });

    it('should set metadata', () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .withMetadata({ author: 'test', tags: ['demo'] })
        .build();

      expect(workflow.metadata).toEqual({ author: 'test', tags: ['demo'] });
    });

    it('should set triggers', () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .withTriggers(
          { type: 'manual' },
          { type: 'scheduled', config: { cron: '0 0 * * *' } }
        )
        .build();

      expect(workflow.triggers).toHaveLength(2);
      expect(workflow.triggers![0].type).toBe('manual');
      expect(workflow.triggers![1].type).toBe('scheduled');
    });
  });

  describe('agent steps', () => {
    it('should add agent step', () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .agent('my-agent', {
          input: { type: 'variable', name: 'query' },
          output: 'result',
        })
        .build();

      expect(workflow.steps).toHaveLength(1);
      expect(workflow.steps[0].type).toBe('agent');
      expect(workflow.steps[0].id).toBe('step-1');

      const agentStep = workflow.steps[0] as any;
      expect(agentStep.agentId).toBe('my-agent');
      expect(agentStep.input).toEqual({ type: 'variable', name: 'query' });
      expect(agentStep.output).toBe('result');
    });

    it('should add multiple agent steps with incremental IDs', () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .agent('agent-1', { input: { type: 'literal', value: 'test' } })
        .agent('agent-2', { input: { type: 'literal', value: 'test' } })
        .build();

      expect(workflow.steps).toHaveLength(2);
      expect(workflow.steps[0].id).toBe('step-1');
      expect(workflow.steps[1].id).toBe('step-2');
    });

    it('should add agent step with retry policy', () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .agent('my-agent', {
          input: { type: 'literal', value: 'test' },
          retry: {
            maxRetries: 3,
            initialDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
          },
        })
        .build();

      const agentStep = workflow.steps[0] as any;
      expect(agentStep.retry).toBeDefined();
      expect(agentStep.retry.maxRetries).toBe(3);
    });
  });

  describe('tool steps', () => {
    it('should add tool step', () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .tool('sendEmail', { type: 'variable', name: 'emailData' })
        .build();

      expect(workflow.steps).toHaveLength(1);
      expect(workflow.steps[0].type).toBe('tool');

      const toolStep = workflow.steps[0] as any;
      expect(toolStep.toolName).toBe('sendEmail');
      expect(toolStep.input).toEqual({ type: 'variable', name: 'emailData' });
    });

    it('should add tool step with options', () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .tool('sendEmail', { type: 'literal', value: 'test' }, {
          output: 'emailResult',
          timeout: 5000,
        })
        .build();

      const toolStep = workflow.steps[0] as any;
      expect(toolStep.output).toBe('emailResult');
      expect(toolStep.timeout).toBe(5000);
    });
  });

  describe('conditional steps', () => {
    it('should add conditional step with then branch', () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .condition(
          '${isPremium}',
          (then) => then.agent('premium-agent', {
            input: { type: 'literal', value: 'test' }
          })
        )
        .build();

      expect(workflow.steps).toHaveLength(1);
      expect(workflow.steps[0].type).toBe('conditional');

      const conditionalStep = workflow.steps[0] as any;
      expect(conditionalStep.condition).toBe('${isPremium}');
      expect(conditionalStep.then).toHaveLength(1);
      expect(conditionalStep.then[0].type).toBe('agent');
      expect(conditionalStep.else).toBeUndefined();
    });

    it('should add conditional step with then and else branches', () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .condition(
          '${isPremium}',
          (then) => then.agent('premium-agent', {
            input: { type: 'literal', value: 'test' }
          }),
          (els) => els.agent('standard-agent', {
            input: { type: 'literal', value: 'test' }
          })
        )
        .build();

      const conditionalStep = workflow.steps[0] as any;
      expect(conditionalStep.then).toHaveLength(1);
      expect(conditionalStep.else).toHaveLength(1);
      expect(conditionalStep.then[0].agentId).toBe('premium-agent');
      expect(conditionalStep.else[0].agentId).toBe('standard-agent');
    });

    it('should support nested steps in branches', () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .condition(
          '${isValid}',
          (then) => then
            .agent('agent-1', { input: { type: 'literal', value: 'test' } })
            .tool('tool-1', { type: 'literal', value: 'test' })
        )
        .build();

      const conditionalStep = workflow.steps[0] as any;
      expect(conditionalStep.then).toHaveLength(2);
      expect(conditionalStep.then[0].type).toBe('agent');
      expect(conditionalStep.then[1].type).toBe('tool');
    });
  });

  describe('parallel steps', () => {
    it('should add parallel step with multiple branches', () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .parallel(
          (b1) => b1.agent('agent-1', { input: { type: 'literal', value: 'test' } }),
          (b2) => b2.agent('agent-2', { input: { type: 'literal', value: 'test' } }),
          (b3) => b3.tool('tool-1', { type: 'literal', value: 'test' })
        )
        .build();

      expect(workflow.steps).toHaveLength(1);
      expect(workflow.steps[0].type).toBe('parallel');

      const parallelStep = workflow.steps[0] as any;
      expect(parallelStep.branches).toHaveLength(3);
      expect(parallelStep.branches[0]).toHaveLength(1);
      expect(parallelStep.branches[0][0].type).toBe('agent');
      expect(parallelStep.branches[2][0].type).toBe('tool');
      expect(parallelStep.waitForAll).toBe(true);
    });

    it('should support multiple steps in each branch', () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .parallel(
          (b1) => b1
            .agent('agent-1', { input: { type: 'literal', value: 'test' } })
            .agent('agent-2', { input: { type: 'literal', value: 'test' } }),
          (b2) => b2
            .tool('tool-1', { type: 'literal', value: 'test' })
        )
        .build();

      const parallelStep = workflow.steps[0] as any;
      expect(parallelStep.branches[0]).toHaveLength(2);
      expect(parallelStep.branches[1]).toHaveLength(1);
    });
  });

  describe('loop steps', () => {
    it('should add loop step', () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .loop(
          { type: 'variable', name: 'items' },
          'item',
          (loop) => loop.agent('process-item', {
            input: { type: 'variable', name: 'item' }
          })
        )
        .build();

      expect(workflow.steps).toHaveLength(1);
      expect(workflow.steps[0].type).toBe('loop');

      const loopStep = workflow.steps[0] as any;
      expect(loopStep.collection).toEqual({ type: 'variable', name: 'items' });
      expect(loopStep.itemVariable).toBe('item');
      expect(loopStep.steps).toHaveLength(1);
      expect(loopStep.steps[0].type).toBe('agent');
    });

    it('should add loop step with maxIterations', () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .loop(
          { type: 'variable', name: 'items' },
          'item',
          (loop) => loop.agent('process-item', {
            input: { type: 'variable', name: 'item' }
          }),
          10
        )
        .build();

      const loopStep = workflow.steps[0] as any;
      expect(loopStep.maxIterations).toBe(10);
    });

    it('should support multiple steps in loop body', () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .loop(
          { type: 'variable', name: 'items' },
          'item',
          (loop) => loop
            .agent('validate-item', { input: { type: 'variable', name: 'item' } })
            .agent('process-item', { input: { type: 'variable', name: 'item' } })
        )
        .build();

      const loopStep = workflow.steps[0] as any;
      expect(loopStep.steps).toHaveLength(2);
    });
  });

  describe('human-in-the-loop steps', () => {
    it('should add human approval step', () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .humanApproval('Please approve this request')
        .build();

      expect(workflow.steps).toHaveLength(1);
      expect(workflow.steps[0].type).toBe('human_in_the_loop');

      const humanStep = workflow.steps[0] as any;
      expect(humanStep.prompt).toBe('Please approve this request');
      expect(humanStep.timeout).toBe(300000); // default 5 minutes
    });

    it('should add human approval step with options', () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .humanApproval(
          'Approve?',
          ['Approve', 'Reject', 'Defer'],
          {
            timeout: 3600000,
            assignee: 'admin@example.com',
            output: 'approvalDecision',
          }
        )
        .build();

      const humanStep = workflow.steps[0] as any;
      expect(humanStep.options).toEqual(['Approve', 'Reject', 'Defer']);
      expect(humanStep.timeout).toBe(3600000);
      expect(humanStep.assignee).toBe('admin@example.com');
      expect(humanStep.output).toBe('approvalDecision');
    });
  });

  describe('RAG steps', () => {
    it('should add RAG step', () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .rag('default-pipeline', { type: 'variable', name: 'query' })
        .build();

      expect(workflow.steps).toHaveLength(1);
      expect(workflow.steps[0].type).toBe('rag');

      const ragStep = workflow.steps[0] as any;
      expect(ragStep.pipeline).toBe('default-pipeline');
      expect(ragStep.query).toEqual({ type: 'variable', name: 'query' });
    });

    it('should add RAG step with options', () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .rag(
          'custom-pipeline',
          { type: 'variable', name: 'userQuery' },
          {
            topK: 5,
            output: 'ragResults',
          }
        )
        .build();

      const ragStep = workflow.steps[0] as any;
      expect(ragStep.topK).toBe(5);
      expect(ragStep.output).toBe('ragResults');
    });
  });

  describe('transform steps', () => {
    it('should add transform step', () => {
      const workflow = new WorkflowBuilder('test', '1.0.0')
        .transform(
          { type: 'variable', name: 'rawData' },
          '${$input.toUpperCase()}',
          'processedData'
        )
        .build();

      expect(workflow.steps).toHaveLength(1);
      expect(workflow.steps[0].type).toBe('transform');

      const transformStep = workflow.steps[0] as any;
      expect(transformStep.input).toEqual({ type: 'variable', name: 'rawData' });
      expect(transformStep.expression).toBe('${$input.toUpperCase()}');
      expect(transformStep.output).toBe('processedData');
    });
  });

  describe('static helper methods', () => {
    it('should create literal input', () => {
      const input = WorkflowBuilder.literal('test value');

      expect(input).toEqual({ type: 'literal', value: 'test value' });
    });

    it('should create variable input', () => {
      const input = WorkflowBuilder.variable('myVar');

      expect(input).toEqual({ type: 'variable', name: 'myVar' });
    });

    it('should create expression input', () => {
      const input = WorkflowBuilder.expression('${x} + ${y}');

      expect(input).toEqual({ type: 'expression', expression: '${x} + ${y}' });
    });

    it('should create retry policy', () => {
      const retry = WorkflowBuilder.retry({
        maxRetries: 3,
        initialDelay: 500,
        maxDelay: 5000,
        backoffMultiplier: 1.5,
        retryableErrors: ['TIMEOUT', 'NETWORK_ERROR'],
      });

      expect(retry.maxRetries).toBe(3);
      expect(retry.initialDelay).toBe(500);
      expect(retry.maxDelay).toBe(5000);
      expect(retry.backoffMultiplier).toBe(1.5);
      expect(retry.retryableErrors).toEqual(['TIMEOUT', 'NETWORK_ERROR']);
    });

    it('should create retry policy with defaults', () => {
      const retry = WorkflowBuilder.retry({ maxRetries: 3 });

      expect(retry.maxRetries).toBe(3);
      expect(retry.initialDelay).toBe(1000);
      expect(retry.maxDelay).toBe(30000);
      expect(retry.backoffMultiplier).toBe(2);
    });
  });

  describe('complex workflows', () => {
    it('should build a complete customer onboarding workflow', () => {
      const workflow = new WorkflowBuilder('customer-onboarding', '1.0.0')
        .name('Customer Onboarding Flow')
        .withTimeout(600000)
        .withMetadata({ team: 'customer-success' })
        .agent('welcome-agent', {
          input: WorkflowBuilder.variable('customerData'),
          output: 'welcomeMessage',
        })
        .tool('sendEmail', WorkflowBuilder.variable('welcomeMessage'))
        .condition(
          '${isPremium}',
          (then) => then
            .agent('premium-setup', {
              input: WorkflowBuilder.variable('customerData'),
              output: 'setupResult',
            })
            .tool('assignPremiumSupport', WorkflowBuilder.variable('setupResult')),
          (els) => els.agent('standard-setup', {
            input: WorkflowBuilder.variable('customerData'),
          })
        )
        .humanApproval('Review and approve setup', ['Approve', 'Reject'], {
          timeout: 7200000,
          output: 'approval',
        })
        .condition(
          '${approval}',
          (then) => then.tool('activateAccount', WorkflowBuilder.literal(true))
        )
        .build();

      expect(workflow.steps).toHaveLength(5);
      expect(workflow.name).toBe('Customer Onboarding Flow');
      expect(workflow.timeout).toBe(600000);
      expect(workflow.metadata?.team).toBe('customer-success');
    });

    it('should build a workflow with parallel data processing', () => {
      const workflow = new WorkflowBuilder('data-processing', '1.0.0')
        .parallel(
          (b1) => b1
            .agent('extract-text', {
              input: WorkflowBuilder.variable('document'),
              output: 'text',
            })
            .agent('analyze-sentiment', {
              input: WorkflowBuilder.variable('text'),
              output: 'sentiment',
            }),
          (b2) => b2
            .agent('extract-entities', {
              input: WorkflowBuilder.variable('document'),
              output: 'entities',
            }),
          (b3) => b3.rag('knowledge-base', WorkflowBuilder.variable('query'), {
            output: 'context',
          })
        )
        .agent('synthesize-results', {
          input: WorkflowBuilder.expression('${sentiment} + ${entities} + ${context}'),
          output: 'finalReport',
        })
        .build();

      expect(workflow.steps).toHaveLength(2);
      expect(workflow.steps[0].type).toBe('parallel');
      expect(workflow.steps[1].type).toBe('agent');

      const parallelStep = workflow.steps[0] as any;
      expect(parallelStep.branches).toHaveLength(3);
    });

    it('should build a workflow with loop processing', () => {
      const workflow = new WorkflowBuilder('batch-processor', '1.0.0')
        .loop(
          WorkflowBuilder.variable('items'),
          'item',
          (loop) => loop
            .agent('validate-item', {
              input: WorkflowBuilder.variable('item'),
              output: 'validationResult',
            })
            .condition(
              '${validationResult}',
              (then) => then.agent('process-item', {
                input: WorkflowBuilder.variable('item'),
              })
            ),
          100
        )
        .build();

      expect(workflow.steps).toHaveLength(1);
      const loopStep = workflow.steps[0] as any;
      expect(loopStep.maxIterations).toBe(100);
      expect(loopStep.steps).toHaveLength(2);
      expect(loopStep.steps[1].type).toBe('conditional');
    });
  });
});
