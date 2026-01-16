import { describe, it, expect, beforeEach } from 'vitest';
import { Workflow, WorkflowStatus } from '../Workflow.js';
import { WorkflowStep, WorkflowStepStatus } from '../WorkflowStep.js';
import type { WorkflowStepContext, WorkflowStepResult } from '../WorkflowStep.js';
import { WorkflowEngine } from '../WorkflowEngine.js';
import { InMemoryWorkflowRepository } from '../WorkflowRepository.js';
import { TransformStep } from '../steps/TransformStep.js';
import { ConditionalStep } from '../steps/ConditionalStep.js';

// Test step implementations
class AddNumberStep extends WorkflowStep<number, number> {
  constructor(private readonly amount: number) {
    super();
  }

  get id() {
    return `add-${this.amount}`;
  }

  get name() {
    return `Add ${this.amount}`;
  }

  async execute(input: number, _context: WorkflowStepContext): Promise<WorkflowStepResult<number>> {
    return this.success(input + this.amount);
  }
}

class FailingStep extends WorkflowStep<unknown, unknown> {
  get id() {
    return 'failing-step';
  }

  get name() {
    return 'Failing Step';
  }

  async execute(): Promise<WorkflowStepResult<unknown>> {
    return this.failure(new Error('Step failed intentionally'));
  }
}

describe('WorkflowStep', () => {
  it('should execute successfully', async () => {
    const step = new AddNumberStep(5);
    const context: WorkflowStepContext = {
      executionId: 'test',
      variables: {},
      stepResults: new Map()
    };

    const result = await step.execute(10, context);

    expect(result.status).toBe(WorkflowStepStatus.COMPLETED);
    expect(result.output).toBe(15);
  });

  it('should handle failures', async () => {
    const step = new FailingStep();
    const context: WorkflowStepContext = {
      executionId: 'test',
      variables: {},
      stepResults: new Map()
    };

    const result = await step.execute(null, context);

    expect(result.status).toBe(WorkflowStepStatus.FAILED);
    expect(result.error).toBeDefined();
  });
});

describe('TransformStep', () => {
  it('should transform data', async () => {
    const step = new TransformStep('uppercase', 'To Uppercase', (text: string) =>
      text.toUpperCase()
    );

    const context: WorkflowStepContext = {
      executionId: 'test',
      variables: {},
      stepResults: new Map()
    };

    const result = await step.execute('hello', context);

    expect(result.status).toBe(WorkflowStepStatus.COMPLETED);
    expect(result.output).toBe('HELLO');
  });

  it('should handle async transforms', async () => {
    const step = new TransformStep('async-transform', 'Async Transform', async (num: number) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return num * 2;
    });

    const context: WorkflowStepContext = {
      executionId: 'test',
      variables: {},
      stepResults: new Map()
    };

    const result = await step.execute(5, context);

    expect(result.status).toBe(WorkflowStepStatus.COMPLETED);
    expect(result.output).toBe(10);
  });
});

describe('ConditionalStep', () => {
  it('should execute whenTrue branch when condition is met', async () => {
    const whenTrue = new TransformStep('true-branch', 'True', (x: number) => x * 2);
    const whenFalse = new TransformStep('false-branch', 'False', (x: number) => x * 3);

    const step = new ConditionalStep(
      'conditional',
      'Conditional',
      (input: number) => input > 5,
      whenTrue,
      whenFalse
    );

    const context: WorkflowStepContext = {
      executionId: 'test',
      variables: {},
      stepResults: new Map()
    };

    const result = await step.execute(10, context);

    expect(result.status).toBe(WorkflowStepStatus.COMPLETED);
    expect(result.output).toBe(20); // 10 * 2
  });

  it('should execute whenFalse branch when condition is not met', async () => {
    const whenTrue = new TransformStep('true-branch', 'True', (x: number) => x * 2);
    const whenFalse = new TransformStep('false-branch', 'False', (x: number) => x * 3);

    const step = new ConditionalStep(
      'conditional',
      'Conditional',
      (input: number) => input > 5,
      whenTrue,
      whenFalse
    );

    const context: WorkflowStepContext = {
      executionId: 'test',
      variables: {},
      stepResults: new Map()
    };

    const result = await step.execute(3, context);

    expect(result.status).toBe(WorkflowStepStatus.COMPLETED);
    expect(result.output).toBe(9); // 3 * 3
  });

  it('should skip when condition is false and no whenFalse branch', async () => {
    const whenTrue = new TransformStep('true-branch', 'True', (x: number) => x * 2);

    const step = new ConditionalStep(
      'conditional',
      'Conditional',
      (input: number) => input > 5,
      whenTrue
    );

    const context: WorkflowStepContext = {
      executionId: 'test',
      variables: {},
      stepResults: new Map()
    };

    const result = await step.execute(3, context);

    expect(result.status).toBe(WorkflowStepStatus.SKIPPED);
  });
});

describe('Workflow', () => {
  it('should create a workflow', () => {
    const workflow = new Workflow({
      metadata: {
        name: 'test-workflow',
        description: 'A test workflow',
        version: '1.0'
      },
      steps: [new AddNumberStep(1), new AddNumberStep(2)],
      variables: { x: 10 }
    });

    expect(workflow.metadata.name).toBe('test-workflow');
    expect(workflow.steps.length).toBe(2);
    expect(workflow.variables.x).toBe(10);
  });

  it('should validate workflows', () => {
    const emptyWorkflow = new Workflow({
      metadata: { name: 'empty' },
      steps: []
    });

    const errors = emptyWorkflow.validate();

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('at least one step');
  });

  it('should detect duplicate step IDs', () => {
    const workflow = new Workflow({
      metadata: { name: 'duplicate' },
      steps: [new AddNumberStep(1), new AddNumberStep(1)]
    });

    const errors = workflow.validate();

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('Duplicate'))).toBe(true);
  });

  it('should get step by ID', () => {
    const step1 = new AddNumberStep(1);
    const step2 = new AddNumberStep(2);

    const workflow = new Workflow({
      metadata: { name: 'test' },
      steps: [step1, step2]
    });

    const retrieved = workflow.getStep('add-1');

    expect(retrieved).toBe(step1);
  });
});

describe('WorkflowEngine', () => {
  let engine: WorkflowEngine;

  beforeEach(() => {
    engine = new WorkflowEngine();
  });

  it('should execute a simple workflow', async () => {
    const workflow = new Workflow({
      metadata: { name: 'simple' },
      steps: [new AddNumberStep(1), new AddNumberStep(2), new AddNumberStep(3)]
    });

    const result = await engine.execute(workflow, 10);

    expect(result.status).toBe(WorkflowStatus.COMPLETED);
    expect(result.output).toBe(16); // 10 + 1 + 2 + 3
    expect(result.stepResults.size).toBe(3);
  });

  it('should stop on error when configured', async () => {
    const workflow = new Workflow({
      metadata: { name: 'failing' },
      steps: [new AddNumberStep(1), new FailingStep(), new AddNumberStep(2)]
    });

    const result = await engine.execute(workflow, 10, { stopOnError: true });

    expect(result.status).toBe(WorkflowStatus.FAILED);
    expect(result.stepResults.size).toBe(2); // Only first two steps
  });

  it('should pass variables to steps', async () => {
    class VariableStep extends WorkflowStep<number, number> {
      get id() {
        return 'variable-step';
      }
      get name() {
        return 'Variable Step';
      }

      async execute(
        input: number,
        context: WorkflowStepContext
      ): Promise<WorkflowStepResult<number>> {
        const multiplier = this.getVariable<number>(context, 'multiplier') ?? 1;
        return this.success(input * multiplier);
      }
    }

    const workflow = new Workflow({
      metadata: { name: 'variables' },
      steps: [new VariableStep()],
      variables: { multiplier: 5 }
    });

    const result = await engine.execute(workflow, 10);

    expect(result.output).toBe(50);
  });

  it('should track execution metadata', async () => {
    const workflow = new Workflow({
      metadata: { name: 'metadata' },
      steps: [new AddNumberStep(1)]
    });

    const result = await engine.execute(workflow, 10);

    expect(result.executionId).toBeDefined();
    expect(result.workflowId).toBe(workflow.id);
    expect(result.startTime).toBeInstanceOf(Date);
    expect(result.endTime).toBeInstanceOf(Date);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });
});

describe('InMemoryWorkflowRepository', () => {
  let repository: InMemoryWorkflowRepository;

  beforeEach(() => {
    repository = new InMemoryWorkflowRepository();
  });

  it('should save and retrieve workflows', async () => {
    const workflow = new Workflow({
      metadata: { name: 'test' },
      steps: [new AddNumberStep(1)]
    });

    await repository.save(workflow);
    const retrieved = await repository.get(workflow.id);

    expect(retrieved).toBe(workflow);
  });

  it('should get workflow by name', async () => {
    const workflow = new Workflow({
      metadata: { name: 'my-workflow' },
      steps: [new AddNumberStep(1)]
    });

    await repository.save(workflow);
    const retrieved = await repository.getByName('my-workflow');

    expect(retrieved).toBe(workflow);
  });

  it('should list workflows with tags', async () => {
    const workflow1 = new Workflow({
      metadata: { name: 'wf1', tags: ['production'] },
      steps: [new AddNumberStep(1)]
    });

    const workflow2 = new Workflow({
      metadata: { name: 'wf2', tags: ['development'] },
      steps: [new AddNumberStep(1)]
    });

    await repository.save(workflow1);
    await repository.save(workflow2);

    const prodWorkflows = await repository.list({ tags: ['production'] });

    expect(prodWorkflows.length).toBe(1);
    expect(prodWorkflows[0]).toBe(workflow1);
  });

  it('should save and retrieve executions', async () => {
    const workflow = new Workflow({
      metadata: { name: 'test' },
      steps: [new AddNumberStep(1)]
    });

    const engine = new WorkflowEngine();
    const result = await engine.execute(workflow, 10);

    await repository.saveExecution(result);
    const retrieved = await repository.getExecution(result.executionId);

    expect(retrieved).toBe(result);
  });

  it('should list executions for a workflow', async () => {
    const workflow = new Workflow({
      metadata: { name: 'test' },
      steps: [new AddNumberStep(1)]
    });

    const engine = new WorkflowEngine();
    const result1 = await engine.execute(workflow, 10);
    const result2 = await engine.execute(workflow, 20);

    await repository.saveExecution(result1);
    await repository.saveExecution(result2);

    const executions = await repository.listExecutions(workflow.id);

    expect(executions.length).toBe(2);
  });

  it('should delete executions', async () => {
    const workflow = new Workflow({
      metadata: { name: 'test' },
      steps: [new AddNumberStep(1)]
    });

    const engine = new WorkflowEngine();
    const result = await engine.execute(workflow, 10);

    await repository.saveExecution(result);
    const deleted = await repository.deleteExecution(result.executionId);

    expect(deleted).toBe(true);
    expect(await repository.getExecution(result.executionId)).toBeUndefined();
  });
});
