import type { Result } from '../result/Result.js';

/**
 * Retry policy for workflow steps
 */
export interface RetryPolicy {
  /**
   * Maximum number of retries
   */
  readonly maxRetries: number;

  /**
   * Initial delay in milliseconds
   */
  readonly initialDelay: number;

  /**
   * Maximum delay in milliseconds
   */
  readonly maxDelay: number;

  /**
   * Backoff multiplier
   */
  readonly backoffMultiplier: number;

  /**
   * Retry on specific errors only
   */
  readonly retryableErrors?: string[];
}

/**
 * Input for workflow steps
 *
 * Can be a literal value, variable reference, or expression
 */
export type StepInput =
  | { type: 'literal'; value: unknown }
  | { type: 'variable'; name: string }
  | { type: 'expression'; expression: string };

/**
 * Agent execution step
 */
export interface AgentStep {
  readonly type: 'agent';
  readonly id: string;
  readonly agentId: string;
  readonly input: StepInput;
  readonly output?: string;
  readonly retry?: RetryPolicy;
  readonly timeout?: number;
}

/**
 * Tool execution step
 */
export interface ToolStep {
  readonly type: 'tool';
  readonly id: string;
  readonly toolName: string;
  readonly input: StepInput;
  readonly output?: string;
  readonly retry?: RetryPolicy;
  readonly timeout?: number;
}

/**
 * Conditional branching step
 */
export interface ConditionalStep {
  readonly type: 'conditional';
  readonly id: string;
  readonly condition: string;
  readonly then: WorkflowStep[];
  readonly else?: WorkflowStep[];
}

/**
 * Parallel execution step
 */
export interface ParallelStep {
  readonly type: 'parallel';
  readonly id: string;
  readonly branches: WorkflowStep[][];
  readonly waitForAll?: boolean;
}

/**
 * Loop step
 */
export interface LoopStep {
  readonly type: 'loop';
  readonly id: string;
  readonly collection: StepInput;
  readonly itemVariable: string;
  readonly steps: WorkflowStep[];
  readonly maxIterations?: number;
}

/**
 * Human-in-the-loop step
 */
export interface HumanInTheLoopStep {
  readonly type: 'human_in_the_loop';
  readonly id: string;
  readonly prompt: string;
  readonly timeout: number;
  readonly assignee?: string;
  readonly options?: string[];
  readonly output?: string;
}

/**
 * RAG query step
 */
export interface RAGStep {
  readonly type: 'rag';
  readonly id: string;
  readonly query: StepInput;
  readonly pipeline: string;
  readonly topK?: number;
  readonly output?: string;
}

/**
 * Data transformation step
 */
export interface TransformStep {
  readonly type: 'transform';
  readonly id: string;
  readonly input: StepInput;
  readonly expression: string;
  readonly output: string;
}

/**
 * Workflow step union type
 */
export type WorkflowStep =
  | AgentStep
  | ToolStep
  | ConditionalStep
  | ParallelStep
  | LoopStep
  | HumanInTheLoopStep
  | RAGStep
  | TransformStep;

/**
 * Workflow trigger configuration
 */
export interface WorkflowTrigger {
  /**
   * Trigger type
   */
  readonly type: 'manual' | 'scheduled' | 'event' | 'webhook';

  /**
   * Trigger configuration
   */
  readonly config?: Record<string, unknown>;
}

/**
 * Workflow definition
 *
 * Defines a multi-step process that orchestrates agents, tools, and other operations.
 *
 * @example
 * ```typescript
 * const workflow: Workflow = {
 *   id: 'customer-onboarding',
 *   name: 'Customer Onboarding',
 *   version: '1.0.0',
 *   steps: [
 *     {
 *       type: 'agent',
 *       id: 'step-1',
 *       agentId: 'welcome-agent',
 *       input: { type: 'variable', name: 'customerData' },
 *       output: 'welcomeMessage'
 *     },
 *     {
 *       type: 'tool',
 *       id: 'step-2',
 *       toolName: 'sendEmail',
 *       input: { type: 'variable', name: 'welcomeMessage' }
 *     }
 *   ],
 *   timeout: 300000
 * };
 * ```
 */
export interface Workflow {
  /**
   * Unique identifier
   */
  readonly id: string;

  /**
   * Human-readable name
   */
  readonly name: string;

  /**
   * Semantic version
   */
  readonly version: string;

  /**
   * Workflow steps
   */
  readonly steps: WorkflowStep[];

  /**
   * Trigger configuration
   */
  readonly triggers?: WorkflowTrigger[];

  /**
   * Overall timeout in milliseconds
   */
  readonly timeout?: number;

  /**
   * Additional metadata
   */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Workflow execution status
 */
export type WorkflowExecutionStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Workflow execution state
 *
 * Tracks the current state of a workflow execution.
 */
export interface WorkflowExecution {
  /**
   * Execution identifier
   */
  readonly id: string;

  /**
   * Workflow identifier
   */
  readonly workflowId: string;

  /**
   * Current status
   */
  readonly status: WorkflowExecutionStatus;

  /**
   * Current step being executed
   */
  readonly currentStep?: string;

  /**
   * Workflow variables
   */
  readonly variables: Record<string, unknown>;

  /**
   * Start time
   */
  readonly startTime: Date;

  /**
   * End time (if completed/failed/cancelled)
   */
  readonly endTime?: Date;

  /**
   * Error if failed
   */
  readonly error?: Error;

  /**
   * Step execution history
   */
  readonly stepHistory: StepExecutionRecord[];
}

/**
 * Record of a step execution
 */
export interface StepExecutionRecord {
  /**
   * Step identifier
   */
  readonly stepId: string;

  /**
   * Step type
   */
  readonly stepType: WorkflowStep['type'];

  /**
   * Execution status
   */
  readonly status: 'running' | 'completed' | 'failed' | 'skipped';

  /**
   * Start time
   */
  readonly startTime: Date;

  /**
   * End time
   */
  readonly endTime?: Date;

  /**
   * Input provided
   */
  readonly input?: unknown;

  /**
   * Output produced
   */
  readonly output?: unknown;

  /**
   * Error if failed
   */
  readonly error?: Error;

  /**
   * Number of retry attempts
   */
  readonly retryCount?: number;
}

/**
 * Workflow engine
 *
 * Executes workflows and manages their lifecycle.
 *
 * @example
 * ```typescript
 * const engine: WorkflowEngine = new StandardWorkflowEngine({
 *   agentOrchestrator,
 *   toolRegistry,
 *   ragPipelines
 * });
 *
 * const execution = await engine.execute(workflow, { customerData: {...} });
 *
 * if (execution.status === 'completed') {
 *   console.log('Workflow completed:', execution.variables);
 * }
 * ```
 */
export interface WorkflowEngine {
  /**
   * Execute a workflow
   *
   * @param workflow - Workflow to execute
   * @param input - Initial input variables
   * @returns Execution result
   */
  execute(
    workflow: Workflow,
    input: Record<string, unknown>
  ): Promise<Result<WorkflowExecution, Error>>;

  /**
   * Resume a paused workflow
   *
   * @param executionId - Execution to resume
   * @param input - Additional input for resumption
   * @returns Execution result
   */
  resume(
    executionId: string,
    input?: Record<string, unknown>
  ): Promise<Result<WorkflowExecution, Error>>;

  /**
   * Pause a running workflow
   *
   * @param executionId - Execution to pause
   * @returns Success or error
   */
  pause(executionId: string): Promise<Result<void, Error>>;

  /**
   * Cancel a running workflow
   *
   * @param executionId - Execution to cancel
   * @returns Success or error
   */
  cancel(executionId: string): Promise<Result<void, Error>>;

  /**
   * Get execution status
   *
   * @param executionId - Execution to query
   * @returns Execution state
   */
  getExecution(executionId: string): Promise<WorkflowExecution | undefined>;

  /**
   * List active executions
   *
   * @returns All active executions
   */
  listActive(): Promise<WorkflowExecution[]>;

  /**
   * List all executions for a workflow
   *
   * @param workflowId - Workflow identifier
   * @returns All executions
   */
  listExecutions(workflowId: string): Promise<WorkflowExecution[]>;
}

/**
 * Workflow repository
 *
 * Stores and retrieves workflow definitions.
 */
export interface WorkflowRepository {
  /**
   * Save a workflow
   */
  save(workflow: Workflow): Promise<void>;

  /**
   * Get workflow by ID
   */
  get(id: string, version?: string): Promise<Workflow | undefined>;

  /**
   * List all workflows
   */
  list(): Promise<Workflow[]>;

  /**
   * Delete a workflow
   */
  delete(id: string, version?: string): Promise<boolean>;
}
