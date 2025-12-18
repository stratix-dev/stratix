import type {
  Workflow,
  WorkflowStep,
  WorkflowTrigger,
  StepInput,
  RetryPolicy,
  AgentStep,
  ToolStep,
  ConditionalStep,
  ParallelStep,
  LoopStep,
  HumanInTheLoopStep,
  RAGStep,
  TransformStep,
} from '@stratix/core/ai-agents';

/**
 * Fluent API for building workflows
 *
 * Provides a chainable interface for constructing complex workflows.
 *
 * @example
 * ```typescript
 * const workflow = new WorkflowBuilder('customer-onboarding', '1.0.0')
 *   .agent('welcome-agent', {
 *     input: { type: 'variable', name: 'customerData' },
 *     output: 'welcomeMessage'
 *   })
 *   .tool('sendEmail', {
 *     type: 'variable',
 *     name: 'welcomeMessage'
 *   })
 *   .condition(
 *     '${premium}',
 *     (then) => then.agent('premium-onboarding'),
 *     (else) => else.agent('standard-onboarding')
 *   )
 *   .build();
 * ```
 */
export class WorkflowBuilder {
  private readonly workflowId: string;
  private readonly workflowVersion: string;
  private workflowName?: string;
  private readonly steps: WorkflowStep[] = [];
  private stepCounter = 0;
  private triggers?: WorkflowTrigger[];
  private timeout?: number;
  private metadata?: Record<string, unknown>;

  constructor(id: string, version: string = '1.0.0') {
    this.workflowId = id;
    this.workflowVersion = version;
  }

  /**
   * Set workflow name
   */
  name(name: string): this {
    this.workflowName = name;
    return this;
  }

  /**
   * Set workflow timeout
   */
  withTimeout(milliseconds: number): this {
    this.timeout = milliseconds;
    return this;
  }

  /**
   * Set workflow metadata
   */
  withMetadata(metadata: Record<string, unknown>): this {
    this.metadata = metadata;
    return this;
  }

  /**
   * Add workflow triggers
   */
  withTriggers(...triggers: WorkflowTrigger[]): this {
    this.triggers = triggers;
    return this;
  }

  /**
   * Add an agent execution step
   *
   * @example
   * ```typescript
   * builder.agent('my-agent', {
   *   input: { type: 'variable', name: 'query' },
   *   output: 'agentResponse',
   *   timeout: 30000
   * })
   * ```
   */
  agent(
    agentId: string,
    options: {
      input: StepInput;
      output?: string;
      retry?: RetryPolicy;
      timeout?: number;
    }
  ): this {
    const step: AgentStep = {
      type: 'agent',
      id: this.nextStepId(),
      agentId,
      ...options,
    };

    this.steps.push(step);
    return this;
  }

  /**
   * Add a tool execution step
   *
   * @example
   * ```typescript
   * builder.tool('sendEmail', {
   *   type: 'variable',
   *   name: 'emailData'
   * })
   * ```
   */
  tool(
    toolName: string,
    input: StepInput,
    options?: {
      output?: string;
      retry?: RetryPolicy;
      timeout?: number;
    }
  ): this {
    const step: ToolStep = {
      type: 'tool',
      id: this.nextStepId(),
      toolName,
      input,
      ...options,
    };

    this.steps.push(step);
    return this;
  }

  /**
   * Add a conditional branching step
   *
   * @example
   * ```typescript
   * builder.condition(
   *   '${isPremium}',
   *   (then) => then.agent('premium-agent'),
   *   (else) => else.agent('standard-agent')
   * )
   * ```
   */
  condition(
    expression: string,
    thenBuilder: (builder: WorkflowBuilder) => void,
    elseBuilder?: (builder: WorkflowBuilder) => void
  ): this {
    const thenBranch = new WorkflowBuilder(this.workflowId, this.workflowVersion);
    thenBuilder(thenBranch);

    let elseBranch: WorkflowBuilder | undefined;
    if (elseBuilder) {
      elseBranch = new WorkflowBuilder(this.workflowId, this.workflowVersion);
      elseBuilder(elseBranch);
    }

    const step: ConditionalStep = {
      type: 'conditional',
      id: this.nextStepId(),
      condition: expression,
      then: thenBranch.steps,
      else: elseBranch?.steps,
    };

    this.steps.push(step);
    return this;
  }

  /**
   * Add a parallel execution step
   *
   * @example
   * ```typescript
   * builder.parallel(
   *   (branch) => branch.agent('agent-1'),
   *   (branch) => branch.agent('agent-2'),
   *   (branch) => branch.tool('tool-1', input)
   * )
   * ```
   */
  parallel(
    ...branchBuilders: Array<(builder: WorkflowBuilder) => void>
  ): this {
    const branches = branchBuilders.map((branchBuilder) => {
      const branch = new WorkflowBuilder(this.workflowId, this.workflowVersion);
      branchBuilder(branch);
      return branch.steps;
    });

    const step: ParallelStep = {
      type: 'parallel',
      id: this.nextStepId(),
      branches,
      waitForAll: true,
    };

    this.steps.push(step);
    return this;
  }

  /**
   * Add a loop step
   *
   * @example
   * ```typescript
   * builder.loop(
   *   { type: 'variable', name: 'items' },
   *   'item',
   *   (loop) => loop
   *     .agent('process-item', {
   *       input: { type: 'variable', name: 'item' }
   *     })
   * )
   * ```
   */
  loop(
    collection: StepInput,
    itemVariable: string,
    loopBuilder: (builder: WorkflowBuilder) => void,
    maxIterations?: number
  ): this {
    const loopSteps = new WorkflowBuilder(this.workflowId, this.workflowVersion);
    loopBuilder(loopSteps);

    const step: LoopStep = {
      type: 'loop',
      id: this.nextStepId(),
      collection,
      itemVariable,
      steps: loopSteps.steps,
      maxIterations,
    };

    this.steps.push(step);
    return this;
  }

  /**
   * Add a human-in-the-loop step
   *
   * @example
   * ```typescript
   * builder.humanApproval(
   *   'Please approve this request',
   *   ['Approve', 'Reject'],
   *   {
   *     timeout: 3600000, // 1 hour
   *     output: 'approvalDecision'
   *   }
   * )
   * ```
   */
  humanApproval(
    prompt: string,
    options?: string[],
    config?: {
      timeout?: number;
      assignee?: string;
      output?: string;
    }
  ): this {
    const step: HumanInTheLoopStep = {
      type: 'human_in_the_loop',
      id: this.nextStepId(),
      prompt,
      timeout: config?.timeout || 300000, // 5 minutes default
      assignee: config?.assignee,
      options,
      output: config?.output,
    };

    this.steps.push(step);
    return this;
  }

  /**
   * Add a RAG query step
   *
   * @example
   * ```typescript
   * builder.rag(
   *   'default-pipeline',
   *   { type: 'variable', name: 'userQuery' },
   *   {
   *     topK: 5,
   *     output: 'ragResults'
   *   }
   * )
   * ```
   */
  rag(
    pipelineId: string,
    query: StepInput,
    options?: {
      topK?: number;
      output?: string;
    }
  ): this {
    const step: RAGStep = {
      type: 'rag',
      id: this.nextStepId(),
      query,
      pipeline: pipelineId,
      topK: options?.topK,
      output: options?.output,
    };

    this.steps.push(step);
    return this;
  }

  /**
   * Add a data transformation step
   *
   * @example
   * ```typescript
   * builder.transform(
   *   { type: 'variable', name: 'rawData' },
   *   '${$input.toUpperCase()}',
   *   'processedData'
   * )
   * ```
   */
  transform(
    input: StepInput,
    expression: string,
    output: string
  ): this {
    const step: TransformStep = {
      type: 'transform',
      id: this.nextStepId(),
      input,
      expression,
      output,
    };

    this.steps.push(step);
    return this;
  }

  /**
   * Create a literal step input
   */
  static literal(value: unknown): StepInput {
    return { type: 'literal', value };
  }

  /**
   * Create a variable step input
   */
  static variable(name: string): StepInput {
    return { type: 'variable', name };
  }

  /**
   * Create an expression step input
   */
  static expression(expression: string): StepInput {
    return { type: 'expression', expression };
  }

  /**
   * Create a retry policy
   */
  static retry(config: {
    maxRetries: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    retryableErrors?: string[];
  }): RetryPolicy {
    return {
      maxRetries: config.maxRetries,
      initialDelay: config.initialDelay || 1000,
      maxDelay: config.maxDelay || 30000,
      backoffMultiplier: config.backoffMultiplier || 2,
      retryableErrors: config.retryableErrors,
    };
  }

  /**
   * Build the final workflow
   */
  build(): Workflow {
    return {
      id: this.workflowId,
      name: this.workflowName || this.workflowId,
      version: this.workflowVersion,
      steps: this.steps,
      triggers: this.triggers,
      timeout: this.timeout,
      metadata: this.metadata,
    };
  }

  /**
   * Generate next step ID
   */
  private nextStepId(): string {
    return `step-${++this.stepCounter}`;
  }
}
