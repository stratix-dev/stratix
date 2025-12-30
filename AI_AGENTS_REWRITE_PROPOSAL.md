# AI Agents Package Rewrite Proposal

**Package**: `@stratix/core/src/ai-agents/`
**Author**: Analysis by Claude
**Date**: 2025-12-27
**Status**: Proposal

---

## Executive Summary

This document presents a comprehensive proposal to rewrite the `@stratix/core/src/ai-agents/` package. The current implementation, while functional, suffers from architectural inconsistencies, type safety issues, duplicated code, and poor separation of concerns. This proposal addresses these issues through a complete architectural redesign based on Domain-Driven Design principles and SOLID principles.

### Key Improvements
- **Better Separation of Concerns**: Split monolithic classes into focused components
- **Type Safety**: Eliminate `unknown` types, fix generic constraints
- **Consistency**: Standardize naming, patterns, and interfaces
- **Maintainability**: Organize code into logical subdomains
- **Extensibility**: Use composition over inheritance where appropriate
- **Performance**: Optimize hot paths, reduce unnecessary allocations

---

## Current State Analysis

### Architecture Issues

#### 1. Inheritance vs Composition Problems

**Current State** (`StreamableAgent.ts:103`):
```typescript
export interface StreamableAgent<TInput, TOutput> extends AIAgent<TInput, TOutput>
```

**Problem**: An interface extending an abstract class is semantically confusing. This creates:
- Unclear contract boundaries
- Difficult testing scenarios
- Tight coupling between streaming and agent execution

**Impact**: High - Violates Interface Segregation Principle

#### 2. Duplicate Type Definitions

**Locations**:
- `AgentTool.ts:92-98` - `ToolDefinition`
- `LLMProvider.ts:15-22` - `ToolDefinition`

**Problem**: Same interface defined twice with identical structure causes:
- Type compatibility issues between modules
- Maintenance burden (changes must be made in two places)
- Potential for drift between definitions

**Impact**: Medium - Risk of breaking changes during refactoring

#### 3. Inconsistent Token Nomenclature

**Inconsistencies**:
- `AgentContext.ts` uses `AgentCost` with `inputTokens` / `outputTokens`
- `LLMProvider.ts` uses `TokenUsage` with `promptTokens` / `completionTokens`
- `AITelemetry.ts` uses `inputTokens` / `outputTokens`

**Problem**: Developers must remember which naming convention applies where. Mapping between systems requires boilerplate code.

**Impact**: Medium - Developer confusion, mapping overhead

#### 4. Monolithic AIAgent Class

**Current State** (`AIAgent.ts`): 514 lines, handles:
- Core execution logic
- Event recording (6 different event types)
- Retry mechanism
- Timeout handling
- Memory management
- Context management
- Lifecycle hooks
- Metadata extraction

**Problem**: Single Responsibility Principle violation. The class has too many reasons to change.

**Impact**: High - Difficult to test, extend, and maintain

#### 5. Type Safety Issues

**Location**: `AgentOrchestrator.ts:75-95`
```typescript
executeSequential(
  agents: AIAgent<unknown, unknown>[],
  input: unknown,
  context: AgentContext
): Promise<AgentResult<unknown>>;
```

**Problem**: Complete loss of type safety. Compiler cannot verify:
- Input/output compatibility between sequential agents
- Correct data flow through pipeline
- Type mismatches at compile time

**Impact**: High - Runtime errors, no IDE assistance

#### 6. Invalid TypeScript Syntax

**Location**: `AIAgent.ts:184, 191, 198`
```typescript
protected async beforeExecute?(input: TInput): Promise<void>;
```

**Problem**: Optional async methods with this syntax are invalid. Should be:
```typescript
protected beforeExecute?(input: TInput): Promise<void>;
```

**Impact**: Low - Works but incorrect, may break in future TS versions

#### 7. Accessibility Confusion

**Location**: `AgentOrchestrator.ts:31`
```typescript
// Example code shows:
return await agent.execute(input);
// But execute() is protected in AIAgent.ts:105
```

**Problem**: Documentation examples use inaccessible methods. Actual public method is `executeWithEvents()`.

**Impact**: Medium - Developer confusion, incorrect usage

#### 8. Missing Exports

**Location**: `AIAgent.ts:11-22`
```typescript
export interface RetryConfig {
  maxRetries: number;
  // ...
}
// But not exported in index.ts initially
```

**Problem**: Core types not accessible to users. Fixed later but shows pattern of missing exports.

**Impact**: Low - Fixed but indicates ad-hoc export management

#### 9. Duplicate Retry Configuration

**Locations**:
- `AIAgent.ts:11-22` - `RetryConfig`
- `Workflow.ts:7-32` - `RetryPolicy`

**Problem**: Two nearly identical interfaces for the same concept. Differs only in property names (`initialDelayMs` vs `initialDelay`).

**Impact**: Medium - Confusion, unnecessary type conversions

#### 10. Poor Directory Organization

**Current Structure**:
```
ai-agents/
├── AIAgent.ts
├── AITelemetry.ts
├── AgentContext.ts
├── AgentMemory.ts
├── AgentOrchestrator.ts
├── AgentRepository.ts
├── AgentResult.ts
├── AgentTool.ts
├── DocumentChunker.ts
├── ExecutionAuditLog.ts
├── ExecutionTrace.ts
├── Guardrail.ts
├── LLMProvider.ts
├── PromptTemplate.ts
├── RAGPipeline.ts
├── StreamableAgent.ts
├── ToolRegistry.ts
├── VectorStore.ts
├── Workflow.ts
├── errors.ts
├── events.ts
├── index.ts
└── types.ts
```

**Problem**: Flat structure with 23 files mixing different concerns:
- Core agent primitives
- Infrastructure (repository, audit log)
- RAG components (vector store, chunker, pipeline)
- Observability (telemetry, trace)
- Workflow engine
- Guardrails
- Prompts

**Impact**: High - Hard to navigate, unclear boundaries

---

## Proposed Architecture

### Design Principles

1. **Single Responsibility**: Each class/interface has one reason to change
2. **Dependency Inversion**: Depend on abstractions, not concretions
3. **Interface Segregation**: Many specific interfaces over one general
4. **Composition over Inheritance**: Use traits/mixins for behavior
5. **Domain-Driven Design**: Organize by subdomain, not technical layers
6. **Type Safety First**: No `unknown` unless absolutely necessary
7. **Immutability by Default**: Prefer readonly, return new instances

### New Directory Structure

```
ai-agents/
├── core/                           # Core agent primitives
│   ├── agent/
│   │   ├── AIAgent.ts             # Base agent class (simplified)
│   │   ├── AgentId.ts             # Type-safe agent identifiers
│   │   ├── AgentMetadata.ts       # Agent descriptive data
│   │   ├── AgentCapability.ts     # Capability system
│   │   └── index.ts
│   ├── execution/
│   │   ├── ExecutionContext.ts    # Replaces AgentContext
│   │   ├── ExecutionResult.ts     # Replaces AgentResult
│   │   ├── ExecutionConfig.ts     # Timeout, retry, etc.
│   │   └── index.ts
│   ├── lifecycle/
│   │   ├── AgentLifecycle.ts      # Hooks interface
│   │   ├── ExecutionHooks.ts      # Before/after/error hooks
│   │   └── index.ts
│   └── index.ts
├── llm/                            # LLM integration
│   ├── LLMProvider.ts              # Provider interface
│   ├── LLMMessage.ts               # Message types
│   ├── LLMResponse.ts              # Response types
│   ├── TokenUsage.ts               # Standardized token tracking
│   ├── ModelConfig.ts              # Model configuration
│   └── index.ts
├── tools/                          # Tool system
│   ├── Tool.ts                     # Base tool class
│   ├── ToolDefinition.ts           # Single source of truth
│   ├── ToolRegistry.ts             # Tool discovery
│   ├── ToolExecutor.ts             # Tool execution engine
│   └── index.ts
├── memory/                         # Memory systems
│   ├── Memory.ts                   # Memory interface
│   ├── ShortTermMemory.ts          # Session memory
│   ├── LongTermMemory.ts           # Persistent memory
│   ├── SemanticMemory.ts           # Vector-based memory
│   └── index.ts
├── orchestration/                  # Multi-agent coordination
│   ├── Orchestrator.ts             # Type-safe orchestrator
│   ├── Pipeline.ts                 # Sequential execution
│   ├── ParallelExecutor.ts         # Parallel execution
│   ├── Delegation.ts               # Agent delegation
│   └── index.ts
├── streaming/                      # Streaming support
│   ├── StreamingAgent.ts           # Composition-based streaming
│   ├── StreamChunk.ts              # Chunk types
│   ├── StreamExecutor.ts           # Stream execution engine
│   └── index.ts
├── rag/                            # Retrieval-Augmented Generation
│   ├── pipeline/
│   │   ├── RAGPipeline.ts
│   │   ├── PipelineConfig.ts
│   │   └── index.ts
│   ├── vector-store/
│   │   ├── VectorStore.ts
│   │   ├── Document.ts
│   │   ├── Embedding.ts
│   │   └── index.ts
│   ├── chunking/
│   │   ├── DocumentChunker.ts
│   │   ├── ChunkingStrategy.ts
│   │   └── index.ts
│   └── index.ts
├── guardrails/                     # Safety and compliance
│   ├── Guardrail.ts
│   ├── GuardrailChain.ts
│   ├── GuardrailResult.ts
│   ├── GuardrailSeverity.ts
│   └── index.ts
├── workflows/                      # Workflow engine
│   ├── Workflow.ts
│   ├── WorkflowEngine.ts
│   ├── WorkflowStep.ts
│   ├── WorkflowRepository.ts
│   ├── steps/
│   │   ├── AgentStep.ts
│   │   ├── ToolStep.ts
│   │   ├── ConditionalStep.ts
│   │   ├── ParallelStep.ts
│   │   └── index.ts
│   └── index.ts
├── prompts/                        # Prompt management
│   ├── PromptTemplate.ts
│   ├── PromptRegistry.ts
│   ├── PromptLoader.ts
│   ├── PromptVariable.ts
│   └── index.ts
├── observability/                  # Telemetry and tracing
│   ├── telemetry/
│   │   ├── AITelemetry.ts
│   │   ├── TelemetrySpan.ts
│   │   ├── TelemetryExporter.ts
│   │   └── index.ts
│   ├── tracing/
│   │   ├── ExecutionTrace.ts
│   │   ├── TraceCollector.ts
│   │   └── index.ts
│   ├── audit/
│   │   ├── ExecutionAuditLog.ts
│   │   ├── AuditRecord.ts
│   │   └── index.ts
│   └── index.ts
├── persistence/                    # Data persistence
│   ├── AgentRepository.ts
│   ├── WorkflowRepository.ts
│   └── index.ts
├── events/                         # Domain events
│   ├── AgentEvents.ts              # Agent lifecycle events
│   ├── ExecutionEvents.ts          # Execution events
│   ├── DomainEventPublisher.ts     # Event publishing
│   └── index.ts
├── errors/                         # Error hierarchy
│   ├── AgentError.ts               # Base error
│   ├── ExecutionErrors.ts          # Execution-related errors
│   ├── ValidationErrors.ts         # Validation errors
│   ├── ProviderErrors.ts           # LLM provider errors
│   └── index.ts
├── shared/                         # Shared types and utilities
│   ├── types.ts                    # Common types
│   ├── RetryPolicy.ts              # Single retry config
│   ├── TimeoutConfig.ts            # Timeout configuration
│   └── index.ts
└── index.ts                        # Main barrel export
```

---

## Detailed Component Design

### 1. Core Agent System

#### AIAgent (Simplified)

**Before** (514 lines):
```typescript
export abstract class AIAgent<TInput, TOutput> extends AggregateRoot<'AIAgent'> {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly version: AgentVersion;
  abstract readonly capabilities: AgentCapability[];
  abstract readonly model: ModelConfig;

  protected _context?: AgentContext;
  protected _memory?: AgentMemory;
  protected retryConfig?: RetryConfig;
  protected timeoutMs?: number;

  protected abstract execute(input: TInput): Promise<AgentResult<TOutput>>;
  async executeWithEvents(input: TInput): Promise<AgentResult<TOutput>> { /* ... */ }
  async executeWithRetry(input: TInput): Promise<AgentResult<TOutput>> { /* ... */ }

  // + 20 more methods
}
```

**After** (~100 lines):
```typescript
/**
 * Base class for AI Agents.
 *
 * Responsibilities:
 * - Define agent contract
 * - Execute core logic
 * - Emit domain events
 *
 * Delegated responsibilities:
 * - Retry logic -> ExecutionConfig + Executor
 * - Timeout -> ExecutionConfig + Executor
 * - Memory -> Memory system
 * - Context -> ExecutionContext
 * - Hooks -> AgentLifecycle
 */
export abstract class AIAgent<TInput, TOutput> extends AggregateRoot<'AIAgent'> {
  constructor(
    id: AgentId,
    private readonly metadata: AgentMetadata,
    private readonly modelConfig: ModelConfig
  ) {
    super(id, new Date(), new Date());
  }

  /**
   * Execute the agent's core logic.
   * Called by ExecutionEngine, not directly.
   */
  abstract execute(
    input: TInput,
    context: ExecutionContext
  ): Promise<ExecutionResult<TOutput>>;

  // Accessors
  get name(): string { return this.metadata.name; }
  get description(): string { return this.metadata.description; }
  get version(): AgentVersion { return this.metadata.version; }
  get capabilities(): readonly AgentCapability[] { return this.metadata.capabilities; }
  get model(): ModelConfig { return this.modelConfig; }

  hasCapability(capability: AgentCapability): boolean {
    return this.capabilities.includes(capability);
  }
}
```

#### ExecutionEngine (New)

```typescript
/**
 * Orchestrates agent execution with cross-cutting concerns.
 *
 * Responsibilities:
 * - Apply timeout
 * - Apply retry logic
 * - Invoke lifecycle hooks
 * - Record telemetry
 * - Publish domain events
 */
export class ExecutionEngine {
  constructor(
    private readonly lifecycle: AgentLifecycle,
    private readonly telemetry: AITelemetry,
    private readonly eventPublisher: DomainEventPublisher
  ) {}

  async execute<TInput, TOutput>(
    agent: AIAgent<TInput, TOutput>,
    input: TInput,
    context: ExecutionContext,
    config?: ExecutionConfig
  ): Promise<ExecutionResult<TOutput>> {
    const span = this.telemetry.startSpan('agent.execute', 'agent.execute');
    const startTime = Date.now();

    try {
      // Before hook
      await this.lifecycle.beforeExecute?.(agent, input, context);

      // Execute with timeout
      const result = config?.timeout
        ? await this.executeWithTimeout(agent, input, context, config.timeout)
        : await agent.execute(input, context);

      // After hook
      await this.lifecycle.afterExecute?.(agent, result, context);

      // Record metrics
      this.recordSuccess(agent, result, Date.now() - startTime);

      return result;
    } catch (error) {
      // Error hook
      await this.lifecycle.onError?.(agent, error as Error, context);

      // Record failure
      this.recordFailure(agent, error as Error, Date.now() - startTime);

      // Apply retry if configured
      if (config?.retry && this.shouldRetry(error as Error, config.retry)) {
        return this.retryExecution(agent, input, context, config);
      }

      throw error;
    } finally {
      span.end();
    }
  }

  private async executeWithTimeout<TInput, TOutput>(
    agent: AIAgent<TInput, TOutput>,
    input: TInput,
    context: ExecutionContext,
    timeoutMs: number
  ): Promise<ExecutionResult<TOutput>> {
    return Promise.race([
      agent.execute(input, context),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new AgentTimeoutError(timeoutMs)), timeoutMs)
      ),
    ]);
  }

  private async retryExecution<TInput, TOutput>(
    agent: AIAgent<TInput, TOutput>,
    input: TInput,
    context: ExecutionContext,
    config: ExecutionConfig
  ): Promise<ExecutionResult<TOutput>> {
    // Retry logic with exponential backoff
    // ...
  }

  private shouldRetry(error: Error, policy: RetryPolicy): boolean {
    // Check if error is retryable
    // ...
  }

  private recordSuccess(agent: AIAgent<any, any>, result: ExecutionResult<any>, duration: number): void {
    // Publish AgentExecutionCompleted event
    // Record telemetry metrics
  }

  private recordFailure(agent: AIAgent<any, any>, error: Error, duration: number): void {
    // Publish AgentExecutionFailed event
    // Record telemetry metrics
  }
}
```

**Justification**:
- **Separation of Concerns**: Agent focuses on domain logic, ExecutionEngine handles infrastructure
- **Testability**: Can test agent logic without mocking timers, retries, etc.
- **Flexibility**: Can swap execution strategies without changing agents
- **Reusability**: Same engine can be used for tools, workflows, etc.

---

### 2. Type-Safe Orchestration

#### Current Problem

```typescript
executeSequential(
  agents: AIAgent<unknown, unknown>[],
  input: unknown,
  context: AgentContext
): Promise<AgentResult<unknown>>;
```

#### Proposed Solution

```typescript
/**
 * Type-safe sequential pipeline.
 *
 * Uses TypeScript's type system to enforce input/output compatibility
 * between consecutive agents.
 */
export class Pipeline {
  /**
   * Execute two agents in sequence.
   * Output of first agent must match input of second agent.
   */
  static async pipe2<T1, T2, T3>(
    agent1: AIAgent<T1, T2>,
    agent2: AIAgent<T2, T3>,
    input: T1,
    context: ExecutionContext
  ): Promise<ExecutionResult<T3>> {
    const result1 = await engine.execute(agent1, input, context);
    if (!result1.isSuccess()) {
      return result1 as ExecutionResult<T3>; // Early return maintains type
    }

    return engine.execute(agent2, result1.unwrap(), context);
  }

  /**
   * Execute three agents in sequence.
   */
  static async pipe3<T1, T2, T3, T4>(
    agent1: AIAgent<T1, T2>,
    agent2: AIAgent<T2, T3>,
    agent3: AIAgent<T3, T4>,
    input: T1,
    context: ExecutionContext
  ): Promise<ExecutionResult<T4>> {
    const result1 = await this.pipe2(agent1, agent2, input, context);
    if (!result1.isSuccess()) {
      return result1 as ExecutionResult<T4>;
    }

    return engine.execute(agent3, result1.unwrap(), context);
  }

  // pipe4, pipe5, ... up to reasonable limit
}

/**
 * For dynamic pipelines where type safety isn't possible,
 * use explicit runtime validation.
 */
export class DynamicPipeline<T> {
  private agents: AIAgent<T, T>[] = [];

  add(agent: AIAgent<T, T>): this {
    this.agents.push(agent);
    return this;
  }

  async execute(
    input: T,
    context: ExecutionContext
  ): Promise<ExecutionResult<T>> {
    let current: T = input;

    for (const agent of this.agents) {
      const result = await engine.execute(agent, current, context);
      if (!result.isSuccess()) {
        return result;
      }
      current = result.unwrap();
    }

    return ExecutionResult.success(current);
  }
}
```

**Justification**:
- **Type Safety**: Compiler enforces correct data flow
- **IDE Support**: Autocomplete knows exact types at each step
- **Runtime Safety**: Dynamic version has explicit constraints
- **Clear Intent**: `pipe2`, `pipe3` names make chain length obvious

---

### 3. Unified Token Nomenclature

#### Standard: Follow OpenAI Convention

```typescript
/**
 * Token usage for LLM API calls.
 *
 * Follows OpenAI API naming convention:
 * - prompt_tokens (input)
 * - completion_tokens (output)
 * - total_tokens (sum)
 */
export interface TokenUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

/**
 * Cost associated with an LLM API call.
 */
export interface LLMCost {
  readonly provider: string;
  readonly model: string;
  readonly usage: TokenUsage;
  readonly costUSD: number;
  readonly timestamp: Date;
}
```

**Update All Usages**:
- `AgentContext` -> use `TokenUsage`
- `LLMProvider` -> already uses `TokenUsage` ✓
- `AITelemetry` -> use `TokenUsage`
- Events -> use `TokenUsage`

**Justification**:
- Industry standard (OpenAI, Anthropic compatible)
- Clear distinction: "prompt" = input, "completion" = output
- Eliminates mapping code
- Better documentation

---

### 4. Composition-Based Streaming

#### Current Problem

```typescript
export interface StreamableAgent<TInput, TOutput> extends AIAgent<TInput, TOutput> {
  executeStream(input: TInput): AsyncIterable<StreamChunk<TOutput>>;
}
```

#### Proposed Solution

```typescript
/**
 * Streaming capability as a separate interface.
 * Agents implement this if they support streaming.
 */
export interface Streamable<TOutput> {
  /**
   * Create a streaming iterator for this operation.
   */
  stream(): AsyncIterable<StreamChunk<TOutput>>;
}

/**
 * Streaming executor - composition over inheritance.
 */
export class StreamingExecutor {
  /**
   * Execute an agent with streaming if supported.
   * Falls back to regular execution if not.
   */
  async *executeStream<TInput, TOutput>(
    agent: AIAgent<TInput, TOutput>,
    input: TInput,
    context: ExecutionContext
  ): AsyncIterable<StreamChunk<TOutput>> {
    // Type guard for streaming support
    if (this.isStreamable(agent)) {
      yield* this.executeStreamable(agent, input, context);
    } else {
      // Fallback: execute normally and yield single chunk
      const result = await engine.execute(agent, input, context);
      yield {
        data: result.unwrap(),
        done: true,
        metadata: result.metadata,
      };
    }
  }

  private isStreamable<TInput, TOutput>(
    agent: AIAgent<TInput, TOutput>
  ): agent is AIAgent<TInput, TOutput> & Streamable<TOutput> {
    return 'stream' in agent && typeof (agent as any).stream === 'function';
  }

  private async *executeStreamable<TInput, TOutput>(
    agent: AIAgent<TInput, TOutput> & Streamable<TOutput>,
    input: TInput,
    context: ExecutionContext
  ): AsyncIterable<StreamChunk<TOutput>> {
    // Stream implementation with hooks, telemetry, etc.
    yield* agent.stream();
  }
}

/**
 * Example: Agent with streaming support.
 */
export class ChatAgent extends AIAgent<ChatInput, ChatOutput> implements Streamable<ChatOutput> {
  async execute(input: ChatInput, context: ExecutionContext): Promise<ExecutionResult<ChatOutput>> {
    // Regular execution
  }

  async *stream(): AsyncIterable<StreamChunk<ChatOutput>> {
    // Streaming implementation
  }
}
```

**Justification**:
- Clear separation: execution vs streaming
- Type-safe: TypeScript knows which agents stream
- Flexible: Agents opt-in to streaming
- No inheritance complexity

---

### 5. Consolidated ToolDefinition

#### Single Source of Truth

```typescript
// tools/ToolDefinition.ts

/**
 * Tool definition for LLM function calling.
 *
 * This is the ONLY definition - used by both tools and LLM providers.
 */
export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: ParameterSchema;
}

/**
 * JSON Schema for tool parameters.
 */
export interface ParameterSchema {
  readonly type: 'object';
  readonly properties: Record<string, PropertySchema>;
  readonly required?: string[];
  readonly additionalProperties?: boolean;
}

export type PropertySchema =
  | { readonly type: 'string'; readonly enum?: string[]; readonly description?: string }
  | { readonly type: 'number'; readonly minimum?: number; readonly maximum?: number; readonly description?: string }
  | { readonly type: 'boolean'; readonly description?: string }
  | { readonly type: 'array'; readonly items: PropertySchema; readonly description?: string }
  | { readonly type: 'object'; readonly properties: Record<string, PropertySchema>; readonly description?: string };
```

**Remove Duplicate**:
- Delete `ToolDefinition` from `AgentTool.ts`
- Import from `tools/ToolDefinition.ts` everywhere

**Justification**:
- DRY principle
- Type compatibility guaranteed
- Schema validation support
- Clear ownership

---

### 6. Unified Retry Policy

```typescript
// shared/RetryPolicy.ts

/**
 * Retry configuration for operations that may fail transiently.
 *
 * Used by:
 * - Agent execution
 * - Tool execution
 * - Workflow steps
 * - LLM API calls
 */
export interface RetryPolicy {
  /**
   * Maximum number of retry attempts.
   * 0 = no retries, 1 = one retry, etc.
   */
  readonly maxRetries: number;

  /**
   * Initial delay in milliseconds before first retry.
   */
  readonly initialDelayMs: number;

  /**
   * Maximum delay in milliseconds between retries.
   */
  readonly maxDelayMs: number;

  /**
   * Multiplier for exponential backoff.
   *
   * @example
   * initialDelay = 100ms, backoffMultiplier = 2
   * Retry 1: 100ms
   * Retry 2: 200ms
   * Retry 3: 400ms
   */
  readonly backoffMultiplier: number;

  /**
   * Jitter to add randomness to retry delays.
   * Prevents thundering herd problem.
   *
   * Value between 0 (no jitter) and 1 (full jitter).
   */
  readonly jitterFactor?: number;

  /**
   * Error codes that should trigger a retry.
   * If undefined, all errors are retryable.
   */
  readonly retryableErrorCodes?: string[];

  /**
   * Custom predicate to determine if error is retryable.
   * Overrides retryableErrorCodes if provided.
   */
  readonly shouldRetry?: (error: Error, attempt: number) => boolean;
}

/**
 * Default retry policies for common scenarios.
 */
export const RetryPolicies = {
  /**
   * No retries.
   */
  NONE: {
    maxRetries: 0,
    initialDelayMs: 0,
    maxDelayMs: 0,
    backoffMultiplier: 1,
  },

  /**
   * Conservative: 3 retries, 1 second initial delay.
   */
  CONSERVATIVE: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  },

  /**
   * Aggressive: 5 retries, 100ms initial delay.
   */
  AGGRESSIVE: {
    maxRetries: 5,
    initialDelayMs: 100,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
    jitterFactor: 0.2,
  },

  /**
   * LLM API calls: handle rate limits.
   */
  LLM_API: {
    maxRetries: 3,
    initialDelayMs: 2000,
    maxDelayMs: 30000,
    backoffMultiplier: 3,
    jitterFactor: 0.3,
    retryableErrorCodes: ['RATE_LIMIT', 'TIMEOUT', 'SERVICE_UNAVAILABLE'],
  },
} as const;
```

**Remove**:
- `RetryConfig` from `AIAgent.ts`
- `RetryPolicy` from `Workflow.ts` (different definition)

**Justification**:
- Single definition for all retry scenarios
- Jitter support (missing in current version)
- Predefined policies for common cases
- Custom predicate for complex logic

---

### 7. Immutable ExecutionContext

```typescript
/**
 * Immutable execution context.
 *
 * Replaces AgentContext with better immutability and type safety.
 */
export class ExecutionContext {
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

  static create(options: {
    sessionId: string;
    userId?: string;
    environment: 'development' | 'staging' | 'production';
    metadata?: Record<string, unknown>;
    budget?: number;
  }): ExecutionContext {
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
   * Add a message, returning a new context.
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
   * Record a cost, returning a new context.
   */
  recordCost(cost: LLMCost): ExecutionContext {
    return new ExecutionContext(
      this.sessionId,
      this.userId,
      this.environment,
      this.metadata,
      this._messages,
      [...this._costs, cost],
      this._budget,
      this._startTime
    );
  }

  // Getters
  get messages(): readonly Message[] {
    return this._messages;
  }

  get costs(): readonly LLMCost[] {
    return this._costs;
  }

  getTotalCost(): number {
    return this._costs.reduce((sum, c) => sum + c.costUSD, 0);
  }

  getRemainingBudget(): number | undefined {
    if (this._budget === undefined) return undefined;
    return Math.max(0, this._budget - this.getTotalCost());
  }

  isBudgetExceeded(): boolean {
    if (this._budget === undefined) return false;
    return this.getTotalCost() >= this._budget;
  }

  getDurationMs(): number {
    return Date.now() - this._startTime.getTime();
  }
}
```

**Justification**:
- True immutability (current version is mutable)
- Thread-safe (important for concurrent execution)
- Temporal queries (version history)
- Clear API (methods return new instances)

---

### 8. Result Type Improvements

```typescript
/**
 * Execution result with success/failure states.
 *
 * Similar to Result<T, E> but specialized for agent execution.
 */
export class ExecutionResult<T> {
  private constructor(
    public readonly success: boolean,
    public readonly value: T | undefined,
    public readonly error: Error | undefined,
    public readonly metadata: ExecutionMetadata,
    public readonly warnings: readonly string[],
    public readonly partial: boolean,
    public readonly trace: ExecutionTrace | undefined
  ) {}

  static success<T>(
    value: T,
    metadata: ExecutionMetadata,
    warnings: string[] = []
  ): ExecutionResult<T> {
    return new ExecutionResult(
      true,
      value,
      undefined,
      metadata,
      Object.freeze(warnings),
      false,
      undefined
    );
  }

  static failure<T>(
    error: Error,
    metadata: ExecutionMetadata,
    partialValue?: T
  ): ExecutionResult<T> {
    return new ExecutionResult(
      false,
      partialValue,
      error,
      metadata,
      [],
      partialValue !== undefined,
      undefined
    );
  }

  static partial<T>(
    value: T,
    metadata: ExecutionMetadata,
    warnings: string[]
  ): ExecutionResult<T> {
    return new ExecutionResult(
      true,
      value,
      undefined,
      metadata,
      Object.freeze(warnings),
      true,
      undefined
    );
  }

  /**
   * Type guard for success.
   */
  isSuccess(): this is ExecutionResult<T> & { value: T } {
    return this.success && this.value !== undefined;
  }

  /**
   * Type guard for failure.
   */
  isFailure(): this is ExecutionResult<T> & { error: Error } {
    return !this.success;
  }

  /**
   * Unwrap value or throw.
   *
   * @throws {Error} If result is failure
   */
  unwrap(): T {
    if (!this.isSuccess()) {
      throw this.error;
    }
    return this.value;
  }

  /**
   * Unwrap value or return default.
   */
  unwrapOr(defaultValue: T): T {
    return this.isSuccess() ? this.value : defaultValue;
  }

  /**
   * Map success value.
   */
  map<U>(fn: (value: T) => U): ExecutionResult<U> {
    if (!this.isSuccess()) {
      return this as any; // Failure passes through
    }

    try {
      const mapped = fn(this.value);
      return ExecutionResult.success(mapped, this.metadata, [...this.warnings]);
    } catch (error) {
      return ExecutionResult.failure(
        error as Error,
        this.metadata
      );
    }
  }

  /**
   * Flat map success value.
   */
  flatMap<U>(fn: (value: T) => ExecutionResult<U>): ExecutionResult<U> {
    if (!this.isSuccess()) {
      return this as any;
    }

    try {
      return fn(this.value);
    } catch (error) {
      return ExecutionResult.failure(
        error as Error,
        this.metadata
      );
    }
  }

  /**
   * Map error.
   */
  mapError(fn: (error: Error) => Error): ExecutionResult<T> {
    if (this.isSuccess()) {
      return this;
    }

    return new ExecutionResult(
      false,
      this.value,
      fn(this.error),
      this.metadata,
      this.warnings,
      this.partial,
      this.trace
    );
  }

  /**
   * Attach trace to result.
   */
  withTrace(trace: ExecutionTrace): ExecutionResult<T> {
    return new ExecutionResult(
      this.success,
      this.value,
      this.error,
      this.metadata,
      this.warnings,
      this.partial,
      trace
    );
  }

  /**
   * Convert to standard Result<T, Error>.
   */
  toResult(): Result<T, Error> {
    return this.isSuccess()
      ? Success.create(this.value)
      : Failure.create(this.error);
  }

  /**
   * Create from standard Result<T, Error>.
   */
  static fromResult<T>(
    result: Result<T, Error>,
    metadata: ExecutionMetadata
  ): ExecutionResult<T> {
    return result.isSuccess()
      ? ExecutionResult.success(result.value, metadata)
      : ExecutionResult.failure(result.error, metadata);
  }
}

/**
 * Execution metadata.
 */
export interface ExecutionMetadata {
  readonly model: string;
  readonly usage?: TokenUsage;
  readonly cost?: number;
  readonly durationMs?: number;
  readonly stage?: string;
  readonly [key: string]: unknown;
}
```

**Justification**:
- Monadic interface (map, flatMap)
- Conversion to/from Result<T, E>
- Better type guards
- Immutable
- Consistent with functional programming patterns

---

## Implementation Strategy

This is a **complete rewrite** with **no backward compatibility**. All changes are breaking changes. Version 2.0 will be a clean slate.

### Phase 1: Core Foundation (Week 1-2)

**Goals**:
- Implement new directory structure
- Build shared primitives
- Establish architectural patterns

**Tasks**:
1. Delete old `ai-agents/` directory
2. Create new directory structure
3. Implement shared types:
   - `TokenUsage` (standardized)
   - `RetryPolicy` (unified)
   - `ToolDefinition` (single source)
   - `ExecutionMetadata`
4. Implement core primitives:
   - `ExecutionContext` (immutable)
   - `ExecutionResult` (with monadic operations)
   - `AgentMetadata`
   - `AgentId`
5. Write comprehensive tests
6. Set up CI/CD for new package

**Success Criteria**:
- All shared types implemented and tested
- 100% test coverage
- No compilation errors
- Documentation stubs in place

### Phase 2: Agent Core (Week 3-4)

**Goals**:
- Implement new agent execution system
- Build ExecutionEngine
- Establish lifecycle pattern

**Tasks**:
1. Implement new `AIAgent` base class (~100 lines)
2. Implement `ExecutionEngine` with:
   - Timeout handling
   - Retry logic with exponential backoff
   - Lifecycle hooks
   - Telemetry integration
3. Implement `AgentLifecycle` interface
4. Implement `ExecutionConfig`
5. Build example agents for testing
6. Write integration tests

**Success Criteria**:
- Agent execution working end-to-end
- All lifecycle hooks functional
- Retry and timeout tested
- Performance benchmarks established

### Phase 3: Type-Safe Orchestration (Week 5)

**Goals**:
- Build type-safe orchestration system
- Replace old Orchestrator

**Tasks**:
1. Implement `Pipeline` class with type-safe methods:
   - `pipe2<T1, T2, T3>`
   - `pipe3<T1, T2, T3, T4>`
   - ... up to `pipe10`
2. Implement `ParallelExecutor`
3. Implement `DynamicPipeline<T>` for runtime scenarios
4. Implement `Delegation` utilities
5. Write orchestration examples
6. Benchmark performance vs old system

**Success Criteria**:
- Type-safe pipelines fully functional
- Parallel execution working
- Documentation complete with examples
- Performance equal or better than v1

### Phase 4: Subsystems (Week 6-7)

**Goals**:
- Rewrite all subsystems with new architecture

**Tasks**:
1. **LLM Integration**:
   - Rewrite `LLMProvider` interface
   - Implement `LLMMessage`, `LLMResponse`
   - Standardize `TokenUsage` everywhere
2. **Tools**:
   - Rewrite `Tool` base class
   - Implement `ToolRegistry`
   - Implement `ToolExecutor`
   - Consolidate `ToolDefinition`
3. **Memory**:
   - Implement `Memory` interface
   - Implement `ShortTermMemory`
   - Implement `LongTermMemory`
   - Implement `SemanticMemory`
4. **Streaming**:
   - Implement composition-based streaming
   - Implement `StreamingExecutor`
   - Implement `StreamChunk` types
5. **RAG**:
   - Rewrite `VectorStore`
   - Rewrite `DocumentChunker`
   - Rewrite `RAGPipeline`
6. **Workflows**:
   - Rewrite `WorkflowEngine`
   - Implement all step types
   - Implement `WorkflowRepository`
7. **Guardrails**:
   - Rewrite `Guardrail`
   - Rewrite `GuardrailChain`
8. **Prompts**:
   - Rewrite `PromptTemplate`
   - Implement `PromptRegistry`
   - Implement `PromptLoader`

**Success Criteria**:
- All subsystems implemented
- Integration tests passing
- Examples for each subsystem
- API documentation complete

### Phase 5: Observability (Week 8)

**Goals**:
- Implement comprehensive observability

**Tasks**:
1. Rewrite telemetry system:
   - `AITelemetry` interface
   - `TelemetrySpan` with OpenTelemetry compatibility
   - `TelemetryExporter` for various backends
2. Rewrite tracing:
   - `ExecutionTrace`
   - `TraceCollector`
   - Integration with ExecutionEngine
3. Rewrite audit:
   - `ExecutionAuditLog`
   - `AuditRecord`
   - Query capabilities
4. Implement metrics collection
5. Build exporters for common platforms:
   - Console (development)
   - OpenTelemetry
   - Datadog
   - New Relic

**Success Criteria**:
- Full observability stack working
- Exporters tested
- Performance overhead < 5%
- Documentation complete

### Phase 6: Polish & Release (Week 9-10)

**Goals**:
- Production-ready release
- Complete documentation
- Migration tooling

**Tasks**:
1. **Code Quality**:
   - Achieve 100% test coverage
   - Fix all linting issues
   - Optimize hot paths
   - Add comprehensive JSDoc comments
2. **Documentation**:
   - Complete API reference (TypeDoc)
   - Write architectural overview
   - Create usage guides for each subsystem
   - Build example applications
3. **Migration Tooling**:
   - Build CLI tool to detect v1 usage
   - Generate migration report
   - Provide code transformation suggestions
4. **Release Preparation**:
   - Update CHANGELOG.md
   - Version bump to 2.0.0
   - Tag release
   - Publish to npm
5. **Communication**:
   - Write blog post announcing v2
   - Update main documentation site
   - Notify community via Discord/Slack

**Success Criteria**:
- All quality metrics met
- Documentation complete
- Migration tool functional
- Release published

---

## Breaking Changes

### Summary

**Everything is a breaking change.** Version 2.0 is a complete rewrite with:

- New package structure
- New class names
- New method signatures
- New execution model
- New type system
- New patterns and practices

### Major Breaking Changes

1. **Package Structure**
   ```typescript
   // v1.x
   import { AIAgent, AgentContext } from '@stratix/core/ai-agents';

   // v2.0
   import { AIAgent } from '@stratix/core/ai-agents/core/agent';
   import { ExecutionContext } from '@stratix/core/ai-agents/core/execution';
   ```

2. **Agent Execution**
   ```typescript
   // v1.x
   const result = await agent.executeWithEvents(input);

   // v2.0
   const engine = new ExecutionEngine(lifecycle, telemetry, events);
   const context = ExecutionContext.create({ sessionId });
   const result = await engine.execute(agent, input, context);
   ```

3. **Context Management**
   ```typescript
   // v1.x (mutable)
   const context = new AgentContext({ sessionId });
   context.addMessage(message);
   context.recordCost(cost);

   // v2.0 (immutable)
   const context = ExecutionContext.create({ sessionId });
   const ctx2 = context.addMessage(message);
   const ctx3 = ctx2.recordCost(cost);
   ```

4. **Result Types**
   ```typescript
   // v1.x
   AgentResult.success(data, metadata)
   AgentResult.failure(error, metadata)

   // v2.0
   ExecutionResult.success(data, metadata)
   ExecutionResult.failure(error, metadata)
   ```

5. **Streaming**
   ```typescript
   // v1.x
   interface StreamableAgent extends AIAgent {
     executeStream(input: TInput): AsyncIterable<StreamChunk<TOutput>>;
   }

   // v2.0
   interface Streamable<TOutput> {
     stream(): AsyncIterable<StreamChunk<TOutput>>;
   }
   // Agents implement Streamable if they support streaming
   ```

6. **Orchestration**
   ```typescript
   // v1.x (no type safety)
   orchestrator.executeSequential([agent1, agent2], input, context);

   // v2.0 (type-safe)
   Pipeline.pipe2(agent1, agent2, input, context);

   // v2.0 (dynamic, with constraints)
   new DynamicPipeline<MyType>()
     .add(agent1)
     .add(agent2)
     .execute(input, context);
   ```

7. **Token Usage**
   ```typescript
   // v1.x (inconsistent naming)
   interface AgentCost {
     inputTokens: number;
     outputTokens: number;
   }

   // v2.0 (standardized)
   interface TokenUsage {
     promptTokens: number;
     completionTokens: number;
     totalTokens: number;
   }
   ```

8. **Retry Configuration**
   ```typescript
   // v1.x (two different interfaces)
   interface RetryConfig { maxRetries, initialDelayMs, ... }
   interface RetryPolicy { maxRetries, initialDelay, ... }

   // v2.0 (unified)
   interface RetryPolicy {
     maxRetries: number;
     initialDelayMs: number;
     maxDelayMs: number;
     backoffMultiplier: number;
     jitterFactor?: number;
     shouldRetry?: (error: Error, attempt: number) => boolean;
   }
   ```

9. **Tool Definition**
   ```typescript
   // v1.x (defined in two places)
   // AgentTool.ts and LLMProvider.ts

   // v2.0 (single source of truth)
   // tools/ToolDefinition.ts
   interface ToolDefinition {
     name: string;
     description: string;
     parameters: ParameterSchema;
   }
   ```

10. **Events**
    ```typescript
    // v1.x
    AgentExecutionStarted
    AgentExecutionCompleted
    AgentExecutionFailed

    // v2.0 (same events, different metadata)
    ExecutionStartedEvent {
      agentId: AgentId;
      sessionId: string;
      input: TInput;
      timestamp: Date;
      traceId: string;
    }
    ```

### No Migration Path

There is **no automatic migration** from v1.x to v2.0. Users must:

1. **Rewrite agents** using new base class
2. **Update execution code** to use ExecutionEngine
3. **Refactor orchestration** to use new type-safe pipelines
4. **Update imports** to new package structure
5. **Adapt to immutable context** pattern
6. **Use new result types** with monadic operations

### Migration Detection Tool

While there's no automatic migration, we provide a **detection tool**:

```bash
npx @stratix/detect-v1-usage ./src

# Output:
# Found 23 v1.x usages:
#   - agent.executeWithEvents() in src/agents/chat.ts:42
#   - new AgentContext() in src/agents/support.ts:15
#   - AgentResult.success() in src/handlers/query.ts:88
#   ...
#
# Estimated migration effort: 4-6 hours
# See migration guide: https://stratix.dev/docs/v2-migration
```

---

## Performance Considerations

### Optimizations

1. **Lazy Initialization**:
   ```typescript
   class ExecutionEngine {
     private _telemetry?: AITelemetry;

     get telemetry(): AITelemetry {
       if (!this._telemetry) {
         this._telemetry = createTelemetry();
       }
       return this._telemetry;
     }
   }
   ```

2. **Object Pooling** (for hot paths):
   ```typescript
   class ExecutionContextPool {
     private pool: ExecutionContext[] = [];

     acquire(options: ContextOptions): ExecutionContext {
       return this.pool.pop() ?? ExecutionContext.create(options);
     }

     release(context: ExecutionContext): void {
       if (this.pool.length < MAX_POOL_SIZE) {
         this.pool.push(context.reset());
       }
     }
   }
   ```

3. **Batch Operations**:
   ```typescript
   class TelemetryBatcher {
     private batch: AISpan[] = [];

     add(span: AISpan): void {
       this.batch.push(span);
       if (this.batch.length >= BATCH_SIZE) {
         this.flush();
       }
     }

     async flush(): Promise<void> {
       await exporter.exportBatch(this.batch);
       this.batch = [];
     }
   }
   ```

4. **Memoization**:
   ```typescript
   class PromptTemplate {
     private rendered = new Map<string, string>();

     render(variables: Record<string, unknown>): Result<string, Error> {
       const key = JSON.stringify(variables);
       if (this.rendered.has(key)) {
         return Success.create(this.rendered.get(key)!);
       }

       const result = this.doRender(variables);
       if (result.isSuccess()) {
         this.rendered.set(key, result.value);
       }
       return result;
     }
   }
   ```

### Benchmarks

Run benchmarks comparing old vs new implementation:

```typescript
// benchmarks/agent-execution.bench.ts

describe('Agent Execution Performance', () => {
  benchmark('Old: executeWithEvents', async () => {
    await oldAgent.executeWithEvents(input);
  });

  benchmark('New: ExecutionEngine.execute', async () => {
    await engine.execute(newAgent, input, context);
  });

  benchmark('Old: Sequential orchestration', async () => {
    await oldOrchestrator.executeSequential(agents, input, context);
  });

  benchmark('New: Type-safe pipeline', async () => {
    await Pipeline.pipe3(agent1, agent2, agent3, input, context);
  });
});
```

**Expected Results**:
- New system should be within 5% of old system
- Type-safe pipelines may be slightly faster (less runtime checks)
- Telemetry batching should reduce overhead

---

## Testing Strategy

### Unit Tests

```typescript
// core/agent/__tests__/AIAgent.test.ts
describe('AIAgent', () => {
  it('should execute successfully', async () => {
    const agent = new TestAgent(id, metadata, modelConfig);
    const context = ExecutionContext.create({ sessionId: 'test' });

    const result = await agent.execute(input, context);

    expect(result.isSuccess()).toBe(true);
    expect(result.value).toEqual(expectedOutput);
  });

  it('should handle errors', async () => {
    const agent = new FailingAgent(id, metadata, modelConfig);
    const context = ExecutionContext.create({ sessionId: 'test' });

    const result = await agent.execute(input, context);

    expect(result.isFailure()).toBe(true);
    expect(result.error).toBeInstanceOf(AgentExecutionError);
  });
});

// core/execution/__tests__/ExecutionEngine.test.ts
describe('ExecutionEngine', () => {
  it('should apply timeout', async () => {
    const agent = new SlowAgent(id, metadata, modelConfig);
    const config = { timeout: 100 };

    await expect(
      engine.execute(agent, input, context, config)
    ).rejects.toThrow(AgentTimeoutError);
  });

  it('should retry on failure', async () => {
    const agent = new FlakyAgent(id, metadata, modelConfig);
    const config = { retry: RetryPolicies.AGGRESSIVE };

    const result = await engine.execute(agent, input, context, config);

    expect(result.isSuccess()).toBe(true);
    expect(agent.attemptCount).toBeGreaterThan(1);
  });
});
```

### Integration Tests

```typescript
// integration/__tests__/full-workflow.test.ts
describe('Full Workflow Integration', () => {
  it('should execute multi-agent pipeline', async () => {
    const context = ExecutionContext.create({ sessionId: 'integration-test' });

    const result = await Pipeline.pipe3(
      classificationAgent,
      enrichmentAgent,
      responseAgent,
      userQuery,
      context
    );

    expect(result.isSuccess()).toBe(true);
    expect(result.metadata.usage?.totalTokens).toBeGreaterThan(0);
  });

  it('should handle RAG workflow', async () => {
    // Ingest documents
    await ragPipeline.ingest(documents, { chunk: true });

    // Query
    const result = await ragPipeline.query('test query');

    expect(result.response).toBeTruthy();
    expect(result.context.length).toBeGreaterThan(0);
  });
});
```

### Performance Tests

```typescript
// performance/__tests__/throughput.test.ts
describe('Throughput Tests', () => {
  it('should handle 100 concurrent requests', async () => {
    const requests = Array.from({ length: 100 }, () =>
      engine.execute(agent, input, context)
    );

    const startTime = Date.now();
    const results = await Promise.all(requests);
    const duration = Date.now() - startTime;

    const successful = results.filter(r => r.isSuccess()).length;

    expect(successful).toBe(100);
    expect(duration).toBeLessThan(10000); // All in under 10 seconds
  });
});
```

---

## Documentation Requirements

### API Documentation

Generate comprehensive API docs using TypeDoc:

```typescript
/**
 * Execute an AI agent with configurable options.
 *
 * This is the primary execution method for all agents. It handles:
 * - Lifecycle hooks (before/after/error)
 * - Timeout enforcement
 * - Retry logic with exponential backoff
 * - Telemetry and tracing
 * - Domain event publishing
 *
 * @template TInput - The input type for the agent
 * @template TOutput - The output type from the agent
 *
 * @param agent - The agent to execute
 * @param input - The input data for the agent
 * @param context - The execution context with session, user, and cost tracking
 * @param config - Optional execution configuration (timeout, retry, etc.)
 *
 * @returns A promise resolving to an ExecutionResult containing the output or error
 *
 * @throws {AgentTimeoutError} If execution exceeds the configured timeout
 * @throws {AgentBudgetExceededError} If execution would exceed the budget
 *
 * @example
 * ```typescript
 * const context = ExecutionContext.create({ sessionId: 'user-123' });
 * const config = {
 *   timeout: 30000,
 *   retry: RetryPolicies.CONSERVATIVE
 * };
 *
 * const result = await engine.execute(
 *   customerSupportAgent,
 *   { question: 'How do I reset my password?' },
 *   context,
 *   config
 * );
 *
 * if (result.isSuccess()) {
 *   console.log(result.value.answer);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 *
 * @see {@link ExecutionContext} for context creation
 * @see {@link ExecutionConfig} for configuration options
 * @see {@link RetryPolicies} for predefined retry strategies
 */
async execute<TInput, TOutput>(
  agent: AIAgent<TInput, TOutput>,
  input: TInput,
  context: ExecutionContext,
  config?: ExecutionConfig
): Promise<ExecutionResult<TOutput>>
```

### Migration Guide

```markdown
# Migration Guide: AI Agents v2.0

## ⚠️ BREAKING CHANGES - Complete Rewrite

Version 2.0 is a **complete rewrite** with **no backward compatibility**.
All existing code using v1.x will need to be rewritten.

## Why the Rewrite?

The v1.x architecture had fundamental flaws:
- Type safety issues (excessive use of `unknown`)
- Monolithic classes with too many responsibilities
- Inconsistent naming and patterns
- Duplicate code and types
- Poor separation of concerns

v2.0 fixes these issues from the ground up.

## Migration Checklist

### Prerequisites
- [ ] Read new architecture documentation
- [ ] Review all breaking changes below
- [ ] Allocate 1-3 days for migration (depending on codebase size)
- [ ] Set up v2.0 in a new branch
- [ ] Run detection tool to identify v1.x usage

### Step 1: Understand New Concepts

**Execution Model Changed**:
- v1.x: Agents self-execute
- v2.0: ExecutionEngine executes agents

**Context is Immutable**:
- v1.x: Mutable AgentContext
- v2.0: Immutable ExecutionContext (functional updates)

**Type-Safe Orchestration**:
- v1.x: `unknown[]` arrays lose type safety
- v2.0: `Pipeline.pipe2<T1, T2, T3>()` maintains types

### Step 2: Install v2.0

```bash
# Remove v1.x
npm uninstall @stratix/core@1.x

# Install v2.0
npm install @stratix/core@2.0.0
```

### Step 3: Run Detection Tool

```bash
npx @stratix/detect-v1-usage ./src

# Generates report of all v1.x usage
# Provides migration hints for each occurrence
```

### Step 4: Rewrite Agents

**v1.x Agent**:
```typescript
import { AIAgent, AgentResult } from '@stratix/core/ai-agents';

class MyAgent extends AIAgent<Input, Output> {
  readonly name = 'My Agent';
  readonly description = 'Does something';
  readonly version = { major: 1, minor: 0, patch: 0, value: '1.0.0' };
  readonly capabilities = ['capability1'];
  readonly model = { provider: 'openai', model: 'gpt-4', temperature: 0.7, maxTokens: 2000 };

  protected async execute(input: Input): Promise<AgentResult<Output>> {
    // Logic here
    return AgentResult.success(output, { model: 'gpt-4' });
  }
}

// Usage
const result = await agent.executeWithEvents(input);
```

**v2.0 Agent**:
```typescript
import { AIAgent } from '@stratix/core/ai-agents/core/agent';
import { ExecutionContext, ExecutionResult } from '@stratix/core/ai-agents/core/execution';
import { AgentMetadata, AgentId } from '@stratix/core/ai-agents/core/agent';
import { ModelConfig } from '@stratix/core/ai-agents/llm';

class MyAgent extends AIAgent<Input, Output> {
  constructor() {
    super(
      AgentId.create(),
      AgentMetadata.create({
        name: 'My Agent',
        description: 'Does something',
        version: '1.0.0',
        capabilities: ['capability1']
      }),
      ModelConfig.create({
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000
      })
    );
  }

  async execute(
    input: Input,
    context: ExecutionContext
  ): Promise<ExecutionResult<Output>> {
    // Logic here
    return ExecutionResult.success(output, { model: 'gpt-4' });
  }
}

// Usage
import { ExecutionEngine } from '@stratix/core/ai-agents/core/execution';

const engine = new ExecutionEngine(lifecycle, telemetry, events);
const context = ExecutionContext.create({ sessionId: 'abc' });
const result = await engine.execute(agent, input, context);
```

### Step 5: Update Orchestration

**v1.x Sequential**:
```typescript
const result = await orchestrator.executeSequential(
  [agent1, agent2, agent3],
  input,
  context
);
```

**v2.0 Type-Safe**:
```typescript
import { Pipeline } from '@stratix/core/ai-agents/orchestration';

const result = await Pipeline.pipe3(
  agent1,  // AIAgent<Input, Middle1>
  agent2,  // AIAgent<Middle1, Middle2>
  agent3,  // AIAgent<Middle2, Output>
  input,
  context
);
// Compiler enforces type compatibility!
```

**v2.0 Dynamic** (when types can't be known at compile time):
```typescript
import { DynamicPipeline } from '@stratix/core/ai-agents/orchestration';

const pipeline = new DynamicPipeline<MyDataType>();
pipeline.add(agent1).add(agent2).add(agent3);
const result = await pipeline.execute(input, context);
```

### Step 6: Update Context Usage

**v1.x (Mutable)**:
```typescript
const context = new AgentContext({ sessionId: 'abc', userId: '123', environment: 'production' });
context.addMessage({ role: 'user', content: 'Hello' });
context.recordCost({ provider: 'openai', model: 'gpt-4', inputTokens: 100, outputTokens: 50, cost: 0.01 });

const totalCost = context.getTotalCost();
```

**v2.0 (Immutable)**:
```typescript
import { ExecutionContext } from '@stratix/core/ai-agents/core/execution';

let context = ExecutionContext.create({
  sessionId: 'abc',
  userId: '123',
  environment: 'production'
});

context = context.addMessage({ role: 'user', content: 'Hello' });
context = context.recordCost({
  provider: 'openai',
  model: 'gpt-4',
  usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
  costUSD: 0.01,
  timestamp: new Date()
});

const totalCost = context.getTotalCost();
```

### Step 7: Update Result Handling

**v1.x**:
```typescript
const result = await agent.executeWithEvents(input);
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

**v2.0** (with monadic operations):
```typescript
const result = await engine.execute(agent, input, context);

// Type-safe unwrapping
if (result.isSuccess()) {
  console.log(result.value); // TypeScript knows value exists
} else {
  console.error(result.error); // TypeScript knows error exists
}

// Functional style
const transformed = result
  .map(output => output.toUpperCase())
  .map(output => `Result: ${output}`);

// Convert to standard Result<T, E>
const standardResult = result.toResult();
```

### Step 8: Update Imports

**Create import mapping**:
```typescript
// v1.x -> v2.0 import mapping

// Core
'@stratix/core/ai-agents/AIAgent' -> '@stratix/core/ai-agents/core/agent'
'@stratix/core/ai-agents/AgentContext' -> '@stratix/core/ai-agents/core/execution/ExecutionContext'
'@stratix/core/ai-agents/AgentResult' -> '@stratix/core/ai-agents/core/execution/ExecutionResult'

// LLM
'@stratix/core/ai-agents/LLMProvider' -> '@stratix/core/ai-agents/llm/LLMProvider'

// Tools
'@stratix/core/ai-agents/AgentTool' -> '@stratix/core/ai-agents/tools/Tool'
'@stratix/core/ai-agents/ToolRegistry' -> '@stratix/core/ai-agents/tools/ToolRegistry'

// RAG
'@stratix/core/ai-agents/RAGPipeline' -> '@stratix/core/ai-agents/rag/pipeline/RAGPipeline'
'@stratix/core/ai-agents/VectorStore' -> '@stratix/core/ai-agents/rag/vector-store/VectorStore'

// Workflows
'@stratix/core/ai-agents/Workflow' -> '@stratix/core/ai-agents/workflows/Workflow'
'@stratix/core/ai-agents/WorkflowEngine' -> '@stratix/core/ai-agents/workflows/WorkflowEngine'

// And so on...
```

### Step 9: Update Tests

All tests need rewriting to use new patterns:

```typescript
// v1.x
describe('MyAgent', () => {
  it('should execute', async () => {
    const agent = new MyAgent(id, metadata);
    const result = await agent.executeWithEvents(input);
    expect(result.success).toBe(true);
  });
});

// v2.0
describe('MyAgent', () => {
  let engine: ExecutionEngine;
  let agent: MyAgent;
  let context: ExecutionContext;

  beforeEach(() => {
    engine = new ExecutionEngine(mockLifecycle, mockTelemetry, mockEvents);
    agent = new MyAgent();
    context = ExecutionContext.create({ sessionId: 'test' });
  });

  it('should execute', async () => {
    const result = await engine.execute(agent, input, context);
    expect(result.isSuccess()).toBe(true);
    expect(result.value).toEqual(expectedOutput);
  });
});
```

### Step 10: Test Thoroughly

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Manual testing of critical paths
- [ ] Performance benchmarks (should be equal or better)

## Common Migration Patterns

### Pattern 1: Agent with Memory

**v1.x**:
```typescript
class ChatAgent extends AIAgent<ChatInput, ChatOutput> {
  setMemory(memory: AgentMemory): void {
    this._memory = memory;
  }

  protected async execute(input: ChatInput): Promise<AgentResult<ChatOutput>> {
    const history = await this.recall('chatHistory');
    // ...
  }
}
```

**v2.0**:
```typescript
import { Memory } from '@stratix/core/ai-agents/memory';

class ChatAgent extends AIAgent<ChatInput, ChatOutput> {
  constructor(private memory: Memory) {
    super(/* ... */);
  }

  async execute(
    input: ChatInput,
    context: ExecutionContext
  ): Promise<ExecutionResult<ChatOutput>> {
    const history = await this.memory.retrieve('chatHistory');
    // ...
  }
}
```

### Pattern 2: Streaming Agent

**v1.x**:
```typescript
class StreamingAgent extends AIAgent<Input, Output> implements StreamableAgent<Input, Output> {
  async *executeStream(input: Input): AsyncIterable<StreamChunk<Output>> {
    // ...
  }
}
```

**v2.0**:
```typescript
import { Streamable, StreamChunk } from '@stratix/core/ai-agents/streaming';

class StreamingAgent extends AIAgent<Input, Output> implements Streamable<Output> {
  async *stream(): AsyncIterable<StreamChunk<Output>> {
    // ...
  }

  async execute(input: Input, context: ExecutionContext): Promise<ExecutionResult<Output>> {
    // Non-streaming version
  }
}

// Usage
import { StreamingExecutor } from '@stratix/core/ai-agents/streaming';

const executor = new StreamingExecutor();
for await (const chunk of executor.executeStream(agent, input, context)) {
  console.log(chunk.data);
}
```

## Estimated Migration Time

| Codebase Size | Estimated Time |
|---------------|----------------|
| Small (1-5 agents) | 4-8 hours |
| Medium (5-20 agents) | 1-2 days |
| Large (20+ agents) | 2-4 days |
| Enterprise (complex orchestration) | 1-2 weeks |

## Getting Help

- **Documentation**: https://stratix.dev/docs/v2
- **Examples**: https://github.com/stratix-dev/stratix/tree/main/examples/v2
- **Discord**: https://discord.gg/stratix
- **GitHub Issues**: https://github.com/stratix-dev/stratix/issues

## FAQ

**Q: Can I use v1.x and v2.0 together?**
A: No. They are incompatible. You must choose one or the other.

**Q: Will there be a v1.x LTS?**
A: No. v1.x is deprecated immediately upon v2.0 release. Security fixes only for 6 months.

**Q: Is there an automated migration tool?**
A: No. The changes are too fundamental for automation. We provide a detection tool to find v1.x usage.

**Q: Can I incrementally migrate?**
A: No. The entire package must be migrated at once due to incompatible types.

**Q: What about my production applications?**
A: Stay on v1.x until you can allocate time for full migration. Plan migration during a maintenance window.

**Q: Why such aggressive breaking changes?**
A: The v1.x architecture was fundamentally flawed. Incremental fixes would not solve the core issues. A clean rewrite allows us to build on solid foundations.
```

---

## Risk Assessment

### Critical Risk

1. **User Adoption**
   - **Risk**: Users refuse to migrate, stay on v1.x indefinitely
   - **Impact**: Fragmented ecosystem, maintenance burden
   - **Mitigation**:
     - Clear communication of v1.x EOL (6 months security fixes only)
     - Compelling v2.0 features and improvements
     - Comprehensive documentation and examples
     - Active community support during migration period
   - **Probability**: Medium-High

2. **Migration Effort Underestimation**
   - **Risk**: Users discover migration takes longer than expected
   - **Impact**: Frustrated users, negative sentiment, delayed adoption
   - **Mitigation**:
     - Honest time estimates in documentation
     - Detection tool to assess migration scope upfront
     - Provide migration consulting/support
   - **Probability**: Medium

### High Risk

1. **Breaking Changes Backlash**
   - **Risk**: Community backlash against complete rewrite
   - **Impact**: Loss of trust, users switch to competitors
   - **Mitigation**:
     - Explain rationale clearly and honestly
     - Show measurable improvements in v2.0
     - Provide migration period (6 months before v1.x EOL)
     - Active engagement with community feedback
   - **Probability**: Medium

2. **Performance Regression**
   - **Risk**: New system slower than v1.x
   - **Impact**: Users report poor performance, delay migration
   - **Mitigation**:
     - Continuous benchmarking during development
     - Performance must be equal or better before release
     - Optimization pass in Phase 6
     - Real-world performance testing
   - **Probability**: Low-Medium

3. **Feature Gaps**
   - **Risk**: v2.0 missing features from v1.x
   - **Impact**: Blockers for migration, users can't switch
   - **Mitigation**:
     - Complete feature inventory before starting
     - Feature parity checklist tracked throughout phases
     - Beta testing period to identify gaps
   - **Probability**: Low-Medium

### Medium Risk

1. **Documentation Quality**
   - **Risk**: Insufficient documentation for migration
   - **Impact**: Users stuck, support burden increases
   - **Mitigation**:
     - Documentation as primary deliverable
     - Real-world examples for all patterns
     - Video tutorials for complex migrations
     - Community-contributed guides
   - **Probability**: Low

2. **Bug Introduction**
   - **Risk**: New code has undiscovered bugs
   - **Impact**: Production issues, loss of confidence
   - **Mitigation**:
     - 100% test coverage requirement
     - Extended beta period (4-6 weeks)
     - Staged rollout to production users
     - Quick response to bug reports
   - **Probability**: Medium (inherent to rewrites)

3. **Timeline Slippage**
   - **Risk**: Implementation takes longer than 10 weeks
   - **Impact**: Delayed release, extended v1.x support
   - **Mitigation**:
     - Conservative estimates with buffer
     - Weekly progress reviews
     - Scope freeze after Phase 1
     - Accept minor features can be added in v2.1
   - **Probability**: Medium

### Low Risk

1. **Type Compatibility**
   - **Risk**: TypeScript compilation issues
   - **Impact**: Build failures, integration problems
   - **Mitigation**:
     - Strict TypeScript config from day 1
     - CI/CD with multiple TS versions
     - Type tests for public APIs
   - **Probability**: Low

2. **Ecosystem Fragmentation**
   - **Risk**: Third-party packages still using v1.x
   - **Impact**: Incompatibility issues
   - **Mitigation**:
     - Early notification to package authors
     - Provide upgrade guides for package authors
     - Maintain list of compatible packages
   - **Probability**: Low

## Risk Mitigation Strategy

### Communication Plan

1. **Announcement (3 months before release)**:
   - Blog post explaining rationale
   - RFC for community feedback
   - Timeline for v1.x EOL

2. **Beta Period (6 weeks before release)**:
   - Public beta with early adopters
   - Weekly office hours for migration help
   - Bug bounty program

3. **Release**:
   - Release notes highlighting improvements
   - Migration guide prominence
   - Community celebration event

4. **Post-Release (6 months)**:
   - Active support for migration questions
   - Regular status updates on adoption
   - Highlight successful migrations

### Contingency Plans

**If adoption is lower than expected**:
- Extend v1.x security support to 12 months
- Provide professional migration services
- Create more examples and tutorials

**If performance issues discovered**:
- Emergency optimization sprint
- Profile and fix hot paths
- May delay release if critical

**If migration proves too difficult**:
- Simplify migration path if possible
- Provide more tooling support
- Consider interim compatibility layer (last resort)

---

## Success Metrics

### Code Quality

- **Code Coverage**: >90% for all new code
- **Type Safety**: 0 `any` or `unknown` in public APIs
- **Cyclomatic Complexity**: <10 for all functions
- **Duplication**: <2% code duplication

### Performance

- **Execution Speed**: Within 5% of v1.x
- **Memory Usage**: Within 10% of v1.x
- **Throughput**: Support 100+ concurrent executions

### Developer Experience

- **Migration Time**: <1 day for typical project
- **API Satisfaction**: >4.5/5 in developer survey
- **Documentation**: <5 minutes to find answer

### Adoption

- **Migration Rate**: >50% within 6 months
- **Issue Rate**: <5 major issues per month
- **Community Feedback**: >80% positive

---

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| 1. Core Foundation | 2 weeks | Shared types, directory structure, primitives |
| 2. Agent Core | 2 weeks | New AIAgent, ExecutionEngine, lifecycle |
| 3. Type-Safe Orchestration | 1 week | Pipeline, ParallelExecutor |
| 4. Subsystems | 2 weeks | LLM, Tools, Memory, Streaming, RAG, Workflows, Guardrails, Prompts |
| 5. Observability | 1 week | Telemetry, tracing, audit |
| 6. Polish & Release | 2 weeks | Documentation, testing, migration tools |
| **Total** | **10 weeks** | Complete rewrite ready for release |
| **Beta Period** | **6 weeks** | Community testing, bug fixes |
| **v1.x Support** | **6 months** | Security fixes only |

---

## Conclusion

This proposal presents a **complete rewrite** of the AI Agents package with **no backward compatibility**. This aggressive approach is necessary because the v1.x architecture has fundamental flaws that cannot be fixed incrementally.

### Why This Approach?

**The v1.x problems are structural**:
- Type safety issues permeate the entire codebase
- Class responsibilities are too mixed to separate gradually
- Naming inconsistencies are too widespread to fix piecemeal
- Code duplication is intertwined with architecture

**Incremental migration would**:
- Take longer overall (adapter layers, compatibility code)
- Leave technical debt in the system
- Confuse developers with two patterns
- Result in a "franken-system" that's worse than either version

**A clean rewrite**:
- Fixes everything at once
- Starts with correct patterns from day 1
- Allows modern TypeScript features
- Enables better performance optimizations
- Creates maintainable foundation for future

### Benefits of v2.0

1. **Type Safety**: Compiler catches errors at build time
2. **Maintainability**: Small, focused classes with single responsibilities
3. **Developer Experience**: Consistent patterns, predictable APIs
4. **Performance**: Equal or better than v1.x
5. **Extensibility**: Composition-based design allows easy customization
6. **Documentation**: Written alongside code, not retrofitted
7. **Future-Proof**: Modern architecture ready for AI advancements

### Risks and Mitigation

**Main Risk**: Users refuse to migrate
**Mitigation**:
- Clear communication of v1.x EOL
- Compelling v2.0 improvements
- Excellent documentation
- Community support during transition

**Secondary Risk**: Migration takes longer than expected
**Mitigation**:
- Honest time estimates
- Detection tool for scoping
- Comprehensive examples

### Success Criteria

v2.0 is successful if:
- **Technical**: All quality metrics met, performance equal/better
- **Adoption**: >50% of active users migrate within 6 months
- **Sentiment**: >80% positive feedback from migrated users
- **Stability**: <5 critical issues per month post-release

### Timeline and Resources

- **Development**: 10 weeks (2 senior engineers full-time)
- **Beta**: 6 weeks (community testing)
- **Support**: 6 months v1.x security fixes
- **Total Investment**: ~4 engineer-months

### Decision Point

This proposal requires approval for:
1. ✅ Complete rewrite with breaking changes
2. ✅ 10-week development timeline
3. ✅ 6-month v1.x EOL timeline
4. ✅ Resource allocation (2 senior engineers)
5. ✅ Community communication plan

### Next Steps

**If Approved**:
1. **Week 0**: Finalize specification, set up infrastructure
2. **Week 1**: Begin Phase 1 (Foundation)
3. **Week 4**: Mid-point review and adjustment
4. **Week 10**: Code complete, begin beta
5. **Week 16**: Public release

**If Not Approved**:
- Alternative: Incremental improvements to v1.x (slower, leaves debt)
- Alternative: Fork and maintain both versions (resource intensive)
- Alternative: Deprecate package entirely (ecosystem loss)

### Recommendation

**Proceed with complete rewrite**. The v1.x issues are too fundamental to fix incrementally. A clean v2.0 provides the best long-term outcome for the framework, despite short-term migration pain.

The aggressive timeline (10 weeks) and clear breaking changes send a strong signal: we're serious about quality and willing to make hard decisions. This builds trust for future development.

---

## Appendix: Key Metrics

### Current State (v1.x)
- **Lines of Code**: ~6,000
- **Test Coverage**: ~75%
- **Type Safety**: ~60% (excessive `any`/`unknown`)
- **Cyclomatic Complexity**: Average 15, max 45
- **Code Duplication**: ~8%

### Target State (v2.0)
- **Lines of Code**: ~8,000 (more features, better separation)
- **Test Coverage**: 100%
- **Type Safety**: >95%
- **Cyclomatic Complexity**: Average <8, max 15
- **Code Duplication**: <2%

### Performance Benchmarks (must meet or exceed)
- **Agent Execution**: Within 5% of v1.x
- **Memory Usage**: Within 10% of v1.x
- **Throughput**: Support 100+ concurrent executions
- **Startup Time**: <100ms for module load

---

**Prepared by**: Claude
**Date**: 2025-12-27
**Version**: 2.0 (Breaking Changes Edition)
**Status**: Awaiting Approval
