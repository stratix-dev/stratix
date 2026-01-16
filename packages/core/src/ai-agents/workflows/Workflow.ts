import type { WorkflowStep } from './WorkflowStep.js';

/**
 * Workflow metadata.
 */
export interface WorkflowMetadata {
  /**
   * Workflow name.
   */
  readonly name: string;

  /**
   * Workflow description.
   */
  readonly description?: string;

  /**
   * Workflow version.
   */
  readonly version?: string;

  /**
   * Workflow author.
   */
  readonly author?: string;

  /**
   * Workflow tags.
   */
  readonly tags?: readonly string[];

  /**
   * Additional metadata.
   */
  readonly [key: string]: unknown;
}

/**
 * Workflow execution status.
 */
export enum WorkflowStatus {
  /**
   * Workflow has not started.
   */
  PENDING = 'pending',

  /**
   * Workflow is currently executing.
   */
  RUNNING = 'running',

  /**
   * Workflow completed successfully.
   */
  COMPLETED = 'completed',

  /**
   * Workflow failed.
   */
  FAILED = 'failed',

  /**
   * Workflow was cancelled.
   */
  CANCELLED = 'cancelled'
}

/**
 * A workflow definition.
 *
 * Workflows orchestrate multiple steps in sequence or parallel.
 * Each step can access data from previous steps and shared variables.
 *
 * @example
 * ```typescript
 * const workflow = new Workflow({
 *   metadata: {
 *     name: 'data-processing',
 *     description: 'Process and analyze data',
 *     version: '1.0'
 *   },
 *   steps: [
 *     new FetchDataStep(),
 *     new TransformDataStep(),
 *     new AnalyzeDataStep()
 *   ],
 *   variables: {
 *     apiUrl: 'https://api.example.com',
 *     threshold: 0.8
 *   }
 * });
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class Workflow<_TInput = unknown, _TOutput = unknown> {
  private readonly _id: string;
  private readonly _metadata: WorkflowMetadata;
  private readonly _steps: readonly WorkflowStep[];
  private readonly _variables: Record<string, unknown>;

  constructor(config: {
    id?: string;
    metadata: WorkflowMetadata;
    steps: readonly WorkflowStep[];
    variables?: Record<string, unknown>;
  }) {
    this._id = config.id ?? this.generateId();
    this._metadata = config.metadata;
    this._steps = config.steps;
    this._variables = config.variables ?? {};
  }

  /**
   * Workflow ID.
   */
  get id(): string {
    return this._id;
  }

  /**
   * Workflow metadata.
   */
  get metadata(): WorkflowMetadata {
    return this._metadata;
  }

  /**
   * Workflow steps.
   */
  get steps(): readonly WorkflowStep[] {
    return this._steps;
  }

  /**
   * Workflow variables.
   */
  get variables(): Readonly<Record<string, unknown>> {
    return this._variables;
  }

  /**
   * Get a step by ID.
   *
   * @param stepId - Step ID
   * @returns The step or undefined if not found
   */
  getStep(stepId: string): WorkflowStep | undefined {
    return this._steps.find((step) => step.id === stepId);
  }

  /**
   * Get step index.
   *
   * @param stepId - Step ID
   * @returns Step index or -1 if not found
   */
  getStepIndex(stepId: string): number {
    return this._steps.findIndex((step) => step.id === stepId);
  }

  /**
   * Validate the workflow.
   *
   * Checks for:
   * - Duplicate step IDs
   * - Empty step list
   * - Other validation rules
   *
   * @returns Array of validation errors (empty if valid)
   */
  validate(): string[] {
    const errors: string[] = [];

    if (this._steps.length === 0) {
      errors.push('Workflow must have at least one step');
    }

    // Check for duplicate step IDs
    const stepIds = new Set<string>();
    for (const step of this._steps) {
      if (stepIds.has(step.id)) {
        errors.push(`Duplicate step ID: ${step.id}`);
      }
      stepIds.add(step.id);
    }

    return errors;
  }

  /**
   * Generate a unique workflow ID.
   */
  private generateId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
