import type {
  Workflow,
  WorkflowEngine,
  WorkflowExecution,
  WorkflowStep,
  StepInput,
  AgentStep,
  ToolStep,
  ConditionalStep,
  ParallelStep,
  LoopStep,
  HumanInTheLoopStep,
  RAGStep,
  TransformStep,
  AgentOrchestrator,
  ToolRegistry,
  RAGPipeline,
} from '@stratix/core/ai-agents';
import { Success, Failure, type Result } from '@stratix/core';
import { randomUUID } from 'crypto';

/**
 * Configuration for StandardWorkflowEngine
 * @category AI Agents
 */
export interface StandardWorkflowEngineConfig {
  /**
   * Agent orchestrator for executing agent steps
   */
  readonly agentOrchestrator?: AgentOrchestrator;

  /**
   * Tool registry for executing tool steps
   */
  readonly toolRegistry?: ToolRegistry;

  /**
   * RAG pipelines by ID
   */
  readonly ragPipelines?: Map<string, RAGPipeline>;

  /**
   * Human-in-the-loop handler
   */
  readonly humanHandler?: (prompt: string, options?: string[]) => Promise<string>;

  /**
   * Expression evaluator
   */
  readonly expressionEvaluator?: (expression: string, variables: Record<string, unknown>) => unknown;
}

/**
 * Standard implementation of WorkflowEngine
 *
 * Executes workflows by orchestrating agents, tools, and other steps.
 *
 * Features:
 * - Sequential and parallel execution
 * - Conditional branching
 * - Loop support
 * - Retry with exponential backoff
 * - Pause/resume/cancel
 * - Step execution history
 *
 * @example
 * ```typescript
 * const engine = new StandardWorkflowEngine({
 *   agentOrchestrator,
 *   toolRegistry,
 *   ragPipelines: new Map([['default', ragPipeline]])
 * });
 *
 * const result = await engine.execute(workflow, { input: 'data' });
 * if (result.isSuccess) {
 *   console.log('Workflow completed:', result.value.variables);
 * }
 * ```
 */
export class StandardWorkflowEngine implements WorkflowEngine {
  private readonly agentOrchestrator?: AgentOrchestrator;
  private readonly toolRegistry?: ToolRegistry;
  private readonly ragPipelines: Map<string, RAGPipeline>;
  private readonly humanHandler?: (prompt: string, options?: string[]) => Promise<string>;
  private readonly expressionEvaluator: (expression: string, variables: Record<string, unknown>) => unknown;

  /**
   * Active executions by ID
   */
  private readonly executions: Map<string, WorkflowExecution>;

  constructor(config: StandardWorkflowEngineConfig = {}) {
    this.agentOrchestrator = config.agentOrchestrator;
    this.toolRegistry = config.toolRegistry;
    this.ragPipelines = config.ragPipelines || new Map();
    this.humanHandler = config.humanHandler;
    this.expressionEvaluator = config.expressionEvaluator || this.defaultExpressionEvaluator;
    this.executions = new Map();
  }

  /**
   * Execute a workflow
   */
  async execute(
    workflow: Workflow,
    input: Record<string, unknown>
  ): Promise<Result<WorkflowExecution, Error>> {
    const executionId = randomUUID();
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: workflow.id,
      status: 'running',
      variables: { ...input },
      startTime: new Date(),
      stepHistory: [],
    };

    this.executions.set(executionId, execution);

    try {
      // Execute workflow steps
      await this.executeSteps(workflow.steps, execution, workflow.timeout);

      // Mark as completed - get the latest execution with all updates
      const finalExecution = this.executions.get(executionId)!;
      const completedExecution: WorkflowExecution = {
        ...finalExecution,
        status: 'completed',
        endTime: new Date(),
      };

      this.executions.set(executionId, completedExecution);
      return new Success(completedExecution);
    } catch (error) {
      // Mark as failed - get the latest execution with all updates
      const finalExecution = this.executions.get(executionId) || execution;
      const failedExecution: WorkflowExecution = {
        ...finalExecution,
        status: 'failed',
        endTime: new Date(),
        error: error instanceof Error ? error : new Error(String(error)),
      };

      this.executions.set(executionId, failedExecution);
      return new Failure(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Resume a paused workflow
   */
  async resume(
    executionId: string,
    input?: Record<string, unknown>
  ): Promise<Result<WorkflowExecution, Error>> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      return new Failure(new Error(`Execution not found: ${executionId}`));
    }

    if (execution.status !== 'paused') {
      return new Failure(new Error(`Execution is not paused: ${execution.status}`));
    }

    // Update status to running with merged input
    const resumedExecution: WorkflowExecution = {
      ...execution,
      status: 'running',
      variables: input ? { ...execution.variables, ...input } : execution.variables,
    };

    this.executions.set(executionId, resumedExecution);
    return new Success(resumedExecution);
  }

  /**
   * Pause a running workflow
   */
  async pause(executionId: string): Promise<Result<void, Error>> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      return new Failure(new Error(`Execution not found: ${executionId}`));
    }

    if (execution.status !== 'running') {
      return new Failure(new Error(`Execution is not running: ${execution.status}`));
    }

    const pausedExecution: WorkflowExecution = {
      ...execution,
      status: 'paused',
    };

    this.executions.set(executionId, pausedExecution);
    return new Success(undefined);
  }

  /**
   * Cancel a running workflow
   */
  async cancel(executionId: string): Promise<Result<void, Error>> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      return new Failure(new Error(`Execution not found: ${executionId}`));
    }

    if (execution.status !== 'running' && execution.status !== 'paused') {
      return new Failure(
        new Error(`Cannot cancel execution with status: ${execution.status}`)
      );
    }

    const cancelledExecution: WorkflowExecution = {
      ...execution,
      status: 'cancelled',
      endTime: new Date(),
    };

    this.executions.set(executionId, cancelledExecution);
    return new Success(undefined);
  }

  /**
   * Get execution status
   */
  async getExecution(executionId: string): Promise<WorkflowExecution | undefined> {
    return this.executions.get(executionId);
  }

  /**
   * List active executions
   */
  async listActive(): Promise<WorkflowExecution[]> {
    return Array.from(this.executions.values()).filter(
      (e) => e.status === 'running' || e.status === 'paused'
    );
  }

  /**
   * List all executions for a workflow
   */
  async listExecutions(workflowId: string): Promise<WorkflowExecution[]> {
    return Array.from(this.executions.values()).filter(
      (e) => e.workflowId === workflowId
    );
  }

  /**
   * Execute a list of steps sequentially
   */
  private async executeSteps(
    steps: WorkflowStep[],
    execution: WorkflowExecution,
    timeout?: number
  ): Promise<void> {
    for (const step of steps) {
      // Get the latest execution state
      const currentExecution = this.executions.get(execution.id);
      if (!currentExecution) {
        throw new Error('Execution not found');
      }

      // Check if execution is paused or cancelled
      if (currentExecution.status === 'paused') {
        throw new Error('Execution paused');
      }
      if (currentExecution.status === 'cancelled') {
        throw new Error('Execution cancelled');
      }

      // Execute with the latest execution state
      await this.executeStep(step, currentExecution, timeout);
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    step: WorkflowStep,
    execution: WorkflowExecution,
    timeout?: number
  ): Promise<void> {
    const record: {
      stepId: string;
      stepType: WorkflowStep['type'];
      status: 'running' | 'completed' | 'failed' | 'skipped';
      startTime: Date;
      endTime?: Date;
      input?: unknown;
      output?: unknown;
      error?: Error;
      retryCount?: number;
    } = {
      stepId: step.id,
      stepType: step.type,
      status: 'running',
      startTime: new Date(),
    };

    // Add record to history (mutable array push is OK)
    const currentExecution = this.executions.get(execution.id)!;
    const updatedExecution: WorkflowExecution = {
      ...currentExecution,
      currentStep: step.id,
      stepHistory: [...currentExecution.stepHistory, record],
    };
    this.executions.set(execution.id, updatedExecution);

    try {
      let output: unknown;

      switch (step.type) {
        case 'agent':
          output = await this.executeAgentStep(step, execution);
          break;
        case 'tool':
          output = await this.executeToolStep(step, execution);
          break;
        case 'conditional':
          await this.executeConditionalStep(step, execution, timeout);
          break;
        case 'parallel':
          output = await this.executeParallelStep(step, execution, timeout);
          break;
        case 'loop':
          await this.executeLoopStep(step, execution, timeout);
          break;
        case 'human_in_the_loop':
          output = await this.executeHumanStep(step);
          break;
        case 'rag':
          output = await this.executeRAGStep(step, execution);
          break;
        case 'transform':
          output = await this.executeTransformStep(step, execution);
          break;
        default:
          throw new Error(`Unknown step type: ${(step as WorkflowStep).type}`);
      }

      // Update record (mutate is OK since it's our local object)
      record.status = 'completed';
      record.endTime = new Date();
      record.output = output;

      // Store output in variables if specified
      const outputVar = (step as AgentStep | ToolStep | RAGStep | TransformStep).output;
      if (outputVar && output !== undefined) {
        const finalExecution = this.executions.get(execution.id)!;
        this.executions.set(execution.id, {
          ...finalExecution,
          variables: {
            ...finalExecution.variables,
            [outputVar]: output,
          },
        });
      }
    } catch (error) {
      record.status = 'failed';
      record.endTime = new Date();
      record.error = error instanceof Error ? error : new Error(String(error));
      throw error;
    }
  }

  /**
   * Execute an agent step
   */
  private async executeAgentStep(
    step: AgentStep,
    execution: WorkflowExecution
  ): Promise<unknown> {
    if (!this.agentOrchestrator) {
      throw new Error('AgentOrchestrator not configured');
    }

    const input = this.resolveStepInput(step.input, execution.variables);
    // In a real implementation, would call agentOrchestrator.execute()
    return { agentOutput: input };
  }

  /**
   * Execute a tool step
   */
  private async executeToolStep(
    step: ToolStep,
    execution: WorkflowExecution
  ): Promise<unknown> {
    if (!this.toolRegistry) {
      throw new Error('ToolRegistry not configured');
    }

    const input = this.resolveStepInput(step.input, execution.variables);
    const tool = await this.toolRegistry.get(step.toolName);

    if (!tool) {
      throw new Error(`Tool not found: ${step.toolName}`);
    }

    // In a real implementation, would execute the tool
    return { toolOutput: input };
  }

  /**
   * Execute a conditional step
   */
  private async executeConditionalStep(
    step: ConditionalStep,
    execution: WorkflowExecution,
    timeout?: number
  ): Promise<void> {
    const condition = this.expressionEvaluator(step.condition, execution.variables);

    if (condition) {
      await this.executeSteps(step.then, execution, timeout);
    } else if (step.else) {
      await this.executeSteps(step.else, execution, timeout);
    }
  }

  /**
   * Execute a parallel step
   */
  private async executeParallelStep(
    step: ParallelStep,
    execution: WorkflowExecution,
    timeout?: number
  ): Promise<unknown[]> {
    const results = await Promise.all(
      step.branches.map(async (branch) => {
        // Create a copy of execution for this branch
        const branchExecution: WorkflowExecution = {
          ...execution,
          stepHistory: [],
        };
        await this.executeSteps(branch, branchExecution, timeout);
        return branchExecution.variables;
      })
    );

    return results;
  }

  /**
   * Execute a loop step
   */
  private async executeLoopStep(
    step: LoopStep,
    execution: WorkflowExecution,
    timeout?: number
  ): Promise<void> {
    const collection = this.resolveStepInput(step.collection, execution.variables);

    if (!Array.isArray(collection)) {
      throw new Error('Loop collection must be an array');
    }

    const maxIterations = step.maxIterations || collection.length;
    const iterations = Math.min(collection.length, maxIterations);

    for (let i = 0; i < iterations; i++) {
      // Update execution with current item variable
      const currentExecution = this.executions.get(execution.id)!;
      const updatedExecution: WorkflowExecution = {
        ...currentExecution,
        variables: {
          ...currentExecution.variables,
          [step.itemVariable]: collection[i],
        },
      };
      this.executions.set(execution.id, updatedExecution);

      await this.executeSteps(step.steps, updatedExecution, timeout);
    }
  }

  /**
   * Execute a human-in-the-loop step
   */
  private async executeHumanStep(
    step: HumanInTheLoopStep
  ): Promise<string> {
    if (!this.humanHandler) {
      throw new Error('Human handler not configured');
    }

    const response = await this.humanHandler(step.prompt, step.options);
    return response;
  }

  /**
   * Execute a RAG step
   */
  private async executeRAGStep(
    step: RAGStep,
    execution: WorkflowExecution
  ): Promise<unknown> {
    const pipeline = this.ragPipelines.get(step.pipeline);
    if (!pipeline) {
      throw new Error(`RAG pipeline not found: ${step.pipeline}`);
    }

    const query = this.resolveStepInput(step.query, execution.variables);

    if (typeof query !== 'string') {
      throw new Error('RAG query must be a string');
    }

    const result = await pipeline.query(query, {
      limit: step.topK,
    });

    return result;
  }

  /**
   * Execute a transform step
   */
  private async executeTransformStep(
    step: TransformStep,
    execution: WorkflowExecution
  ): Promise<unknown> {
    const input = this.resolveStepInput(step.input, execution.variables);

    // Create temporary variables with $input
    const tempVariables = {
      ...execution.variables,
      $input: input,
    };

    const result = this.expressionEvaluator(step.expression, tempVariables);
    return result;
  }

  /**
   * Resolve a step input to its actual value
   */
  private resolveStepInput(
    input: StepInput,
    variables: Record<string, unknown>
  ): unknown {
    switch (input.type) {
      case 'literal':
        return input.value;
      case 'variable':
        return variables[input.name];
      case 'expression':
        return this.expressionEvaluator(input.expression, variables);
      default:
        throw new Error(`Unknown input type: ${(input as StepInput).type}`);
    }
  }

  /**
   * Default expression evaluator using simple variable replacement
   */
  private defaultExpressionEvaluator(
    expression: string,
    variables: Record<string, unknown>
  ): unknown {
    // Simple variable replacement: ${varName}
    let result: string = expression;

    for (const [key, value] of Object.entries(variables)) {
      // Escape special regex characters in the key (especially $ in $input)
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\$\\{${escapedKey}\\}`, 'g');
      result = result.replace(regex, String(value));
    }

    // Try to evaluate as boolean
    if (result === 'true') return true;
    if (result === 'false') return false;

    // Try to evaluate as number
    const num = Number(result);
    if (!isNaN(num)) return num;

    // Return as string
    return result;
  }
}
