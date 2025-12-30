import type { LLMCost } from '../../shared/TokenUsage.js';

/**
 * Message in agent conversation.
 */
export interface Message {
  /**
   * Message role
   */
  readonly role: 'system' | 'user' | 'assistant' | 'tool';

  /**
   * Message content
   */
  readonly content: string;

  /**
   * When the message was created
   */
  readonly timestamp: Date;

  /**
   * Optional tool call ID (for tool messages)
   */
  readonly toolCallId?: string;

  /**
   * Optional name (for tool/function messages)
   */
  readonly name?: string;
}

/**
 * Immutable execution context for AI agents.
 *
 * Tracks conversation history, costs, budget, and metadata for
 * an agent execution session. All mutations return new instances.
 *
 * @example
 * ```typescript
 * // Create context
 * let context = ExecutionContext.create({
 *   sessionId: 'session-123',
 *   userId: 'user-456',
 *   environment: 'production'
 * });
 *
 * // Add message (returns new context)
 * context = context.addMessage({
 *   role: 'user',
 *   content: 'Hello',
 *   timestamp: new Date()
 * });
 *
 * // Record cost (returns new context)
 * context = context.recordCost({
 *   provider: 'openai',
 *   model: 'gpt-4',
 *   usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
 *   costUSD: 0.001,
 *   timestamp: new Date()
 * });
 *
 * // Check budget
 * if (context.isBudgetExceeded()) {
 *   throw new Error('Budget exceeded');
 * }
 * ```
 */
export class ExecutionContext {
  /**
   * Private constructor - use static factory methods.
   */
  private constructor(
    public readonly sessionId: string,
    public readonly userId: string | undefined,
    public readonly environment: 'development' | 'staging' | 'production',
    public readonly metadata: Readonly<Record<string, unknown>>,
    private readonly _messages: readonly Message[],
    private readonly _costs: readonly LLMCost[],
    private readonly _budget: number | undefined,
    private readonly _startTime: Date
  ) {}

  /**
   * Create a new execution context.
   *
   * @param options - Context creation options
   * @returns New ExecutionContext instance
   */
  static create(options: {
    sessionId: string;
    userId?: string;
    environment: 'development' | 'staging' | 'production';
    metadata?: Record<string, unknown>;
    budget?: number;
  }): ExecutionContext {
    if (options.budget !== undefined && options.budget <= 0) {
      throw new Error('Budget must be positive');
    }

    return new ExecutionContext(
      options.sessionId,
      options.userId,
      options.environment,
      Object.freeze(options.metadata ?? {}),
      [],
      [],
      options.budget,
      new Date()
    );
  }

  /**
   * Add a message to the conversation history.
   * Returns a new context with the message added.
   *
   * @param message - Message to add
   * @returns New ExecutionContext with message added
   */
  addMessage(message: Message): ExecutionContext {
    return new ExecutionContext(
      this.sessionId,
      this.userId,
      this.environment,
      this.metadata,
      [...this._messages, message],
      this._costs,
      this._budget,
      this._startTime
    );
  }

  /**
   * Add multiple messages to the conversation history.
   * Returns a new context with all messages added.
   *
   * @param messages - Messages to add
   * @returns New ExecutionContext with messages added
   */
  addMessages(messages: Message[]): ExecutionContext {
    return new ExecutionContext(
      this.sessionId,
      this.userId,
      this.environment,
      this.metadata,
      [...this._messages, ...messages],
      this._costs,
      this._budget,
      this._startTime
    );
  }

  /**
   * Record a cost incurred during execution.
   * Returns a new context with the cost recorded.
   *
   * @param cost - Cost to record
   * @returns New ExecutionContext with cost recorded
   * @throws {Error} If recording this cost would exceed the budget
   */
  recordCost(cost: LLMCost): ExecutionContext {
    const newCosts = [...this._costs, cost];
    const totalCost = newCosts.reduce((sum, c) => sum + c.costUSD, 0);

    // Check budget if set
    if (this._budget !== undefined && totalCost > this._budget) {
      throw new Error(
        `Recording cost would exceed budget: $${totalCost.toFixed(4)} > $${this._budget.toFixed(4)}`
      );
    }

    return new ExecutionContext(
      this.sessionId,
      this.userId,
      this.environment,
      this.metadata,
      this._messages,
      newCosts,
      this._budget,
      this._startTime
    );
  }

  /**
   * Record multiple costs.
   * Returns a new context with all costs recorded.
   *
   * @param costs - Costs to record
   * @returns New ExecutionContext with costs recorded
   * @throws {Error} If recording these costs would exceed the budget
   */
  recordCosts(costs: LLMCost[]): ExecutionContext {
    return costs.reduce(
      (context, cost) => context.recordCost(cost),
      this as ExecutionContext
    );
  }

  /**
   * Get all messages in the conversation.
   *
   * @returns Readonly array of messages
   */
  get messages(): readonly Message[] {
    return this._messages;
  }

  /**
   * Get the N most recent messages.
   *
   * @param count - Number of messages to retrieve
   * @returns Readonly array of recent messages
   */
  getRecentMessages(count: number): readonly Message[] {
    if (count <= 0) {
      return [];
    }
    return this._messages.slice(-count);
  }

  /**
   * Get messages by role.
   *
   * @param role - Role to filter by
   * @returns Readonly array of messages with specified role
   */
  getMessagesByRole(role: Message['role']): readonly Message[] {
    return this._messages.filter((m) => m.role === role);
  }

  /**
   * Get all recorded costs.
   *
   * @returns Readonly array of costs
   */
  get costs(): readonly LLMCost[] {
    return this._costs;
  }

  /**
   * Get total cost across all recorded costs.
   *
   * @returns Total cost in USD
   */
  getTotalCost(): number {
    return this._costs.reduce((sum, cost) => sum + cost.costUSD, 0);
  }

  /**
   * Get total tokens used across all costs.
   *
   * @returns Total token count
   */
  getTotalTokens(): number {
    return this._costs.reduce((sum, cost) => sum + cost.usage.totalTokens, 0);
  }

  /**
   * Get remaining budget.
   *
   * @returns Remaining budget in USD, or undefined if no budget set
   */
  getRemainingBudget(): number | undefined {
    if (this._budget === undefined) {
      return undefined;
    }
    return Math.max(0, this._budget - this.getTotalCost());
  }

  /**
   * Check if budget has been exceeded.
   *
   * @returns true if total cost >= budget (false if no budget set)
   */
  isBudgetExceeded(): boolean {
    if (this._budget === undefined) {
      return false;
    }
    return this.getTotalCost() >= this._budget;
  }

  /**
   * Get the duration of this execution context in milliseconds.
   *
   * @returns Duration in milliseconds
   */
  getDurationMs(): number {
    return Date.now() - this._startTime.getTime();
  }

  /**
   * Get the start time of this context.
   *
   * @returns Start time
   */
  get startTime(): Date {
    return this._startTime;
  }

  /**
   * Get the budget (if set).
   *
   * @returns Budget in USD, or undefined
   */
  get budget(): number | undefined {
    return this._budget;
  }

  /**
   * Create a new context with updated metadata.
   * Existing metadata is merged with new metadata.
   *
   * @param updates - Metadata updates
   * @returns New ExecutionContext with updated metadata
   */
  updateMetadata(updates: Record<string, unknown>): ExecutionContext {
    return new ExecutionContext(
      this.sessionId,
      this.userId,
      this.environment,
      Object.freeze({ ...this.metadata, ...updates }),
      this._messages,
      this._costs,
      this._budget,
      this._startTime
    );
  }

  /**
   * Convert to plain object for serialization.
   *
   * @returns Plain object representation
   */
  toJSON(): object {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      environment: this.environment,
      metadata: this.metadata,
      messages: this._messages,
      costs: this._costs.map((c) => ({
        ...c,
        timestamp: c.timestamp.toISOString(),
      })),
      budget: this._budget,
      startTime: this._startTime.toISOString(),
      durationMs: this.getDurationMs(),
      totalCost: this.getTotalCost(),
      totalTokens: this.getTotalTokens(),
      remainingBudget: this.getRemainingBudget(),
    };
  }
}
