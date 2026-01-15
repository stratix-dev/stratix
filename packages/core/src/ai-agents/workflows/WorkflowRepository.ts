import type { Workflow } from './Workflow.js';
import type { WorkflowExecutionResult } from './WorkflowEngine.js';

/**
 * Repository for persisting workflows and execution history.
 *
 * Implementations can use various storage backends:
 * - In-memory (for testing)
 * - File system
 * - Database (PostgreSQL, MongoDB, etc.)
 * - Cloud storage
 *
 * @example
 * ```typescript
 * class InMemoryWorkflowRepository implements WorkflowRepository {
 *   private workflows = new Map<string, Workflow>();
 *   private executions = new Map<string, WorkflowExecutionResult>();
 *
 *   async save(workflow: Workflow): Promise<void> {
 *     this.workflows.set(workflow.id, workflow);
 *   }
 *
 *   async get(id: string): Promise<Workflow | undefined> {
 *     return this.workflows.get(id);
 *   }
 *
 *   // ... implement other methods
 * }
 * ```
 */
export interface WorkflowRepository {
  /**
   * Save a workflow.
   *
   * @param workflow - Workflow to save
   * @returns Promise resolving when saved
   */
  save(workflow: Workflow): Promise<void>;

  /**
   * Get a workflow by ID.
   *
   * @param id - Workflow ID
   * @returns Promise resolving to workflow or undefined if not found
   */
  get(id: string): Promise<Workflow | undefined>;

  /**
   * Get a workflow by name.
   *
   * @param name - Workflow name
   * @returns Promise resolving to workflow or undefined if not found
   */
  getByName(name: string): Promise<Workflow | undefined>;

  /**
   * List all workflows.
   *
   * @param options - Listing options
   * @returns Promise resolving to array of workflows
   */
  list(options?: {
    limit?: number;
    offset?: number;
    tags?: readonly string[];
  }): Promise<readonly Workflow[]>;

  /**
   * Delete a workflow.
   *
   * @param id - Workflow ID
   * @returns Promise resolving to true if deleted
   */
  delete(id: string): Promise<boolean>;

  /**
   * Save a workflow execution result.
   *
   * @param result - Execution result
   * @returns Promise resolving when saved
   */
  saveExecution(result: WorkflowExecutionResult): Promise<void>;

  /**
   * Get an execution result by ID.
   *
   * @param executionId - Execution ID
   * @returns Promise resolving to result or undefined if not found
   */
  getExecution(
    executionId: string
  ): Promise<WorkflowExecutionResult | undefined>;

  /**
   * List executions for a workflow.
   *
   * @param workflowId - Workflow ID
   * @param options - Listing options
   * @returns Promise resolving to array of execution results
   */
  listExecutions(
    workflowId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<readonly WorkflowExecutionResult[]>;

  /**
   * Delete an execution result.
   *
   * @param executionId - Execution ID
   * @returns Promise resolving to true if deleted
   */
  deleteExecution(executionId: string): Promise<boolean>;

  /**
   * Delete all executions for a workflow.
   *
   * @param workflowId - Workflow ID
   * @returns Promise resolving to number of executions deleted
   */
  deleteAllExecutions(workflowId: string): Promise<number>;
}

/**
 * In-memory workflow repository implementation.
 *
 * Simple implementation for testing and development.
 * Not suitable for production use.
 *
 * @example
 * ```typescript
 * const repository = new InMemoryWorkflowRepository();
 *
 * await repository.save(workflow);
 * const retrieved = await repository.get(workflow.id);
 * ```
 */
export class InMemoryWorkflowRepository implements WorkflowRepository {
  private workflows = new Map<string, Workflow>();
  private executions = new Map<string, WorkflowExecutionResult>();
  private workflowExecutions = new Map<string, Set<string>>();

  async save(workflow: Workflow): Promise<void> {
    this.workflows.set(workflow.id, workflow);
    return Promise.resolve();
  }

  async get(id: string): Promise<Workflow | undefined> {
    return Promise.resolve(this.workflows.get(id));
  }

  async getByName(name: string): Promise<Workflow | undefined> {
    for (const workflow of this.workflows.values()) {
      if (workflow.metadata.name === name) {
        return Promise.resolve(workflow);
      }
    }
    return Promise.resolve(undefined);
  }

  async list(
    options: {
      limit?: number;
      offset?: number;
      tags?: readonly string[];
    } = {}
  ): Promise<readonly Workflow[]> {
    let workflows = Array.from(this.workflows.values());

    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      workflows = workflows.filter((workflow) => {
        const workflowTags = workflow.metadata.tags ?? [];
        return options.tags!.some((tag) => workflowTags.includes(tag));
      });
    }

    // Apply pagination
    const offset = options.offset ?? 0;
    const limit = options.limit ?? workflows.length;

    return Promise.resolve(workflows.slice(offset, offset + limit));
  }

  async delete(id: string): Promise<boolean> {
    return Promise.resolve(this.workflows.delete(id));
  }

  async saveExecution(result: WorkflowExecutionResult): Promise<void> {
    this.executions.set(result.executionId, result);

    // Track workflow -> executions mapping
    if (!this.workflowExecutions.has(result.workflowId)) {
      this.workflowExecutions.set(result.workflowId, new Set());
    }
    this.workflowExecutions.get(result.workflowId)!.add(result.executionId);
    return Promise.resolve();
  }

  async getExecution(
    executionId: string
  ): Promise<WorkflowExecutionResult | undefined> {
    return Promise.resolve(this.executions.get(executionId));
  }

  async listExecutions(
    workflowId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<readonly WorkflowExecutionResult[]> {
    const executionIds = this.workflowExecutions.get(workflowId);
    if (!executionIds) {
      return Promise.resolve([]);
    }

    const results = Array.from(executionIds)
      .map((id) => this.executions.get(id))
      .filter((result): result is WorkflowExecutionResult => result !== undefined);

    // Sort by start time (newest first)
    results.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    // Apply pagination
    const offset = options.offset ?? 0;
    const limit = options.limit ?? results.length;

    return Promise.resolve(results.slice(offset, offset + limit));
  }

  async deleteExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      return Promise.resolve(false);
    }

    this.executions.delete(executionId);

    // Remove from workflow mapping
    const workflowExecutionIds = this.workflowExecutions.get(
      execution.workflowId
    );
    if (workflowExecutionIds) {
      workflowExecutionIds.delete(executionId);
    }

    return Promise.resolve(true);
  }

  async deleteAllExecutions(workflowId: string): Promise<number> {
    const executionIds = this.workflowExecutions.get(workflowId);
    if (!executionIds) {
      return Promise.resolve(0);
    }

    const count = executionIds.size;

    for (const executionId of executionIds) {
      this.executions.delete(executionId);
    }

    this.workflowExecutions.delete(workflowId);

    return Promise.resolve(count);
  }
}
