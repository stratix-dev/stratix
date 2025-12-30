import type { Workflow } from './Workflow.js';
import { WorkflowStatus } from './Workflow.js';
import type {
  WorkflowStepContext,
  WorkflowStepResult,
} from './WorkflowStep.js';
import { WorkflowStep, WorkflowStepStatus } from './WorkflowStep.js';

/**
 * Configuration for workflow execution.
 */
export interface WorkflowExecutionConfig {
  /**
   * Timeout for entire workflow execution (ms).
   * Default: 300000 (5 minutes)
   */
  readonly timeout?: number;

  /**
   * Timeout for individual step execution (ms).
   * Default: 60000 (1 minute)
   */
  readonly stepTimeout?: number;

  /**
   * Whether to stop on first step failure.
   * Default: true
   */
  readonly stopOnError?: boolean;

  /**
   * Maximum number of retries for failed steps.
   * Default: 0 (no retries)
   */
  readonly maxRetries?: number;

  /**
   * Additional variables to merge with workflow variables.
   */
  readonly variables?: Record<string, unknown>;
}

/**
 * Result of a workflow execution.
 */
export interface WorkflowExecutionResult<TOutput = unknown> {
  /**
   * Execution ID.
   */
  readonly executionId: string;

  /**
   * Workflow ID.
   */
  readonly workflowId: string;

  /**
   * Final status.
   */
  readonly status: WorkflowStatus;

  /**
   * Final output (if successful).
   */
  readonly output?: TOutput;

  /**
   * Error (if failed).
   */
  readonly error?: Error;

  /**
   * Results from all executed steps.
   */
  readonly stepResults: ReadonlyMap<string, WorkflowStepResult>;

  /**
   * Execution start time.
   */
  readonly startTime: Date;

  /**
   * Execution end time.
   */
  readonly endTime: Date;

  /**
   * Total execution duration (ms).
   */
  readonly duration: number;

  /**
   * Execution metadata.
   */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Workflow execution engine.
 *
 * Executes workflows step by step, managing state and errors.
 *
 * @example
 * ```typescript
 * const engine = new WorkflowEngine();
 *
 * const result = await engine.execute(workflow, initialInput, {
 *   timeout: 300000,
 *   stopOnError: true
 * });
 *
 * if (result.status === WorkflowStatus.COMPLETED) {
 *   console.log('Workflow completed:', result.output);
 * } else {
 *   console.error('Workflow failed:', result.error);
 * }
 * ```
 */
export class WorkflowEngine {
  private readonly config: Required<WorkflowExecutionConfig>;

  constructor(config: WorkflowExecutionConfig = {}) {
    this.config = {
      timeout: config.timeout ?? 300000,
      stepTimeout: config.stepTimeout ?? 60000,
      stopOnError: config.stopOnError ?? true,
      maxRetries: config.maxRetries ?? 0,
      variables: config.variables ?? {},
    };
  }

  /**
   * Execute a workflow.
   *
   * @param workflow - The workflow to execute
   * @param input - Initial input data
   * @param config - Optional execution config (overrides engine config)
   * @returns Promise resolving to execution result
   *
   * @example
   * ```typescript
   * const result = await engine.execute(workflow, { userId: '123' });
   * ```
   */
  async execute<TInput, TOutput>(
    workflow: Workflow<TInput, TOutput>,
    input: TInput,
    config?: WorkflowExecutionConfig
  ): Promise<WorkflowExecutionResult<TOutput>> {
    const executionConfig = { ...this.config, ...config };
    const executionId = this.generateExecutionId();
    const startTime = new Date();

    // Validate workflow
    const errors = workflow.validate();
    if (errors.length > 0) {
      return this.createFailureResult<TOutput>(
        executionId,
        workflow.id,
        new Error(`Workflow validation failed: ${errors.join(', ')}`),
        new Map(),
        startTime
      );
    }

    // Merge variables
    const variables = {
      ...workflow.variables,
      ...executionConfig.variables,
    };

    // Execute steps
    const stepResults = new Map<string, WorkflowStepResult>();
    let currentInput: unknown = input;

    try {
      for (const step of workflow.steps) {
        const context: WorkflowStepContext = {
          executionId,
          variables,
          stepResults,
          metadata: {},
        };

        const result = await this.executeStep(
          step,
          currentInput,
          context,
          executionConfig
        );

        stepResults.set(step.id, result);

        if (result.status === WorkflowStepStatus.FAILED) {
          if (executionConfig.stopOnError) {
            const endTime = new Date();
            return {
              executionId,
              workflowId: workflow.id,
              status: WorkflowStatus.FAILED as WorkflowStatus,
              error: result.error,
              stepResults,
              startTime,
              endTime,
              duration: endTime.getTime() - startTime.getTime(),
            };
          }
        }

        if (result.status === WorkflowStepStatus.COMPLETED) {
          currentInput = result.output;
        }
      }

      const endTime = new Date();
      return {
        executionId,
        workflowId: workflow.id,
        status: WorkflowStatus.COMPLETED as WorkflowStatus,
        output: currentInput as TOutput,
        stepResults,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
      };
    } catch (error) {
      return this.createFailureResult<TOutput>(
        executionId,
        workflow.id,
        error instanceof Error ? error : new Error(String(error)),
        stepResults,
        startTime
      );
    }
  }

  /**
   * Execute a single step.
   */
  private async executeStep<TInput, TOutput>(
    step: WorkflowStep<TInput, TOutput>,
    input: TInput,
    context: WorkflowStepContext,
    config: Required<WorkflowExecutionConfig>
  ): Promise<WorkflowStepResult<TOutput>> {
    const timeoutPromise = new Promise<WorkflowStepResult<TOutput>>(
      (_, reject) => {
        setTimeout(
          () => reject(new Error(`Step ${step.id} timed out`)),
          config.stepTimeout
        );
      }
    );

    try {
      return await Promise.race([step.execute(input, context), timeoutPromise]);
    } catch (error) {
      return {
        status: WorkflowStepStatus.FAILED,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Create a failure result.
   */
  private createFailureResult<TOutput>(
    executionId: string,
    workflowId: string,
    error: Error,
    stepResults: Map<string, WorkflowStepResult>,
    startTime: Date
  ): WorkflowExecutionResult<TOutput> {
    const endTime = new Date();
    return {
      executionId,
      workflowId,
      status: WorkflowStatus.FAILED as WorkflowStatus,
      error,
      stepResults,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
    };
  }

  /**
   * Generate a unique execution ID.
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
