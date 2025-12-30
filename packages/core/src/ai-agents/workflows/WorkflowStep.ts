/**
 * Status of a workflow step execution.
 */
export enum WorkflowStepStatus {
  /**
   * Step has not started yet.
   */
  PENDING = 'pending',

  /**
   * Step is currently executing.
   */
  RUNNING = 'running',

  /**
   * Step completed successfully.
   */
  COMPLETED = 'completed',

  /**
   * Step failed with an error.
   */
  FAILED = 'failed',

  /**
   * Step was skipped (conditional execution).
   */
  SKIPPED = 'skipped',
}

/**
 * Context for workflow step execution.
 */
export interface WorkflowStepContext {
  /**
   * Workflow execution ID.
   */
  readonly executionId: string;

  /**
   * Shared workflow variables.
   */
  readonly variables: Record<string, unknown>;

  /**
   * Results from previous steps (keyed by step ID).
   */
  readonly stepResults: ReadonlyMap<string, unknown>;

  /**
   * Additional context metadata.
   */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Result of a workflow step execution.
 */
export interface WorkflowStepResult<T = unknown> {
  /**
   * Step execution status.
   */
  readonly status: WorkflowStepStatus;

  /**
   * Output data from the step (if successful).
   */
  readonly output?: T;

  /**
   * Error information (if failed).
   */
  readonly error?: Error;

  /**
   * Execution metadata (duration, timestamps, etc.).
   */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Base class for workflow steps.
 *
 * Workflow steps are the building blocks of workflows.
 * Each step performs a specific action and can access data from previous steps.
 *
 * @template TInput - Type of input data
 * @template TOutput - Type of output data
 *
 * @example
 * ```typescript
 * class CustomStep extends WorkflowStep<string, number> {
 *   get id() { return 'custom-step'; }
 *   get name() { return 'Custom Step'; }
 *
 *   async execute(input: string, context: WorkflowStepContext): Promise<WorkflowStepResult<number>> {
 *     const result = input.length;
 *     return this.success(result);
 *   }
 * }
 * ```
 */
export abstract class WorkflowStep<TInput = unknown, TOutput = unknown> {
  /**
   * Unique step identifier.
   */
  abstract get id(): string;

  /**
   * Human-readable step name.
   */
  abstract get name(): string;

  /**
   * Optional step description.
   */
  get description(): string | undefined {
    return undefined;
  }

  /**
   * Execute the step.
   *
   * @param input - Input data for this step
   * @param context - Execution context
   * @returns Promise resolving to step result
   */
  abstract execute(
    input: TInput,
    context: WorkflowStepContext
  ): Promise<WorkflowStepResult<TOutput>>;

  /**
   * Create a successful result.
   *
   * @param output - Step output
   * @param metadata - Optional metadata
   * @returns Success result
   */
  protected success(
    output: TOutput,
    metadata?: Record<string, unknown>
  ): WorkflowStepResult<TOutput> {
    return {
      status: WorkflowStepStatus.COMPLETED,
      output,
      metadata,
    };
  }

  /**
   * Create a failed result.
   *
   * @param error - The error
   * @param metadata - Optional metadata
   * @returns Failure result
   */
  protected failure(
    error: Error,
    metadata?: Record<string, unknown>
  ): WorkflowStepResult<TOutput> {
    return {
      status: WorkflowStepStatus.FAILED,
      error,
      metadata,
    };
  }

  /**
   * Create a skipped result.
   *
   * @param metadata - Optional metadata
   * @returns Skipped result
   */
  protected skipped(
    metadata?: Record<string, unknown>
  ): WorkflowStepResult<TOutput> {
    return {
      status: WorkflowStepStatus.SKIPPED,
      metadata,
    };
  }

  /**
   * Get a value from the workflow variables.
   *
   * @param context - Workflow context
   * @param key - Variable key
   * @returns Variable value or undefined
   */
  protected getVariable<T = unknown>(
    context: WorkflowStepContext,
    key: string
  ): T | undefined {
    return context.variables[key] as T | undefined;
  }

  /**
   * Get the result from a previous step.
   *
   * @param context - Workflow context
   * @param stepId - ID of the previous step
   * @returns Step result or undefined
   */
  protected getStepResult<T = unknown>(
    context: WorkflowStepContext,
    stepId: string
  ): T | undefined {
    return context.stepResults.get(stepId) as T | undefined;
  }
}
