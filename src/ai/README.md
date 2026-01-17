# AI Agents v2.0

Production-ready AI agent framework for TypeScript with strict hexagonal architecture, complete observability, RAG, workflows, and orchestration.

## ⚠️ Architectural Principle

**CRITICAL:** All agents must follow hexagonal architecture. Agents must NEVER make I/O calls (LLM, database, APIs) directly. This keeps domain pure and infrastructure swappable.

## Overview

The AI Agents system provides a comprehensive framework for building, orchestrating, and monitoring AI agents in production environments. Built on Domain-Driven Design principles, it treats agents as first-class domain entities with complete lifecycle management.

## Architecture

```
ai-agents/
├── domain/            # Pure domain layer (NO I/O)
│   ├── AgentSpecification.ts  # Domain entity for agents
│   └── ports/
│       └── LLMPort.ts         # Domain-defined interface
│
├── application/       # Application services (orchestration)
│   └── AgentService.ts        # Orchestrates domain + infrastructure
│
├── core/              # Core primitives
│   ├── agent/        # AIAgent (deprecated), AgentId, AgentMetadata
│   ├── execution/    # ExecutionEngine, ExecutionContext, ExecutionResult
│   └── lifecycle/    # AgentLifecycle (hooks)
│
├── llm/              # LLM provider abstraction (infrastructure)
├── tools/            # Tool system
├── memory/           # Agent memory
├── orchestration/    # Multi-agent orchestration
├── workflows/        # Workflow engine
├── streaming/        # Streaming support
├── prompts/          # Prompt management
├── rag/              # Retrieval-Augmented Generation
├── guardrails/       # Safety and validation
├── observability/    # Telemetry, tracing, audit
└── shared/           # Shared types and utilities
```

## Core Concepts

### 1. AgentSpecification (Domain Entity)

Agents are **pure domain entities** with zero I/O operations:

```typescript
import { AgentSpecification, EntityId } from '@stratix/core';
import type { AgentMetadata, ModelConfig } from '@stratix/core';

class CustomerSupportAgentSpec extends AgentSpecification {
  constructor(id: AgentSpecificationId) {
    super(
      id,
      {
        name: 'Customer Support',
        description: 'Handles customer support inquiries',
        version: '2.0.0',
        capabilities: ['customer-support', 'sentiment-analysis'],
        tags: ['support'],
      },
      {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 2000,
      }
    );
  }

  // Pure domain methods (NO I/O!)
  canHandleQuery(query: string): boolean {
    return query.length > 0 && query.length < 5000;
  }

  buildMessages(query: string): LLMMessage[] {
    return [
      { role: 'system', content: this.buildSystemPrompt() },
      { role: 'user', content: query }
    ];
  }

  private buildSystemPrompt(): string {
    return 'You are a helpful support agent...';
  }
}
```

### 2. AgentService (Application Layer)

Application services orchestrate domain + infrastructure:

```typescript
import { AgentService } from '@stratix/core';
import type { LLMPort, LLMRequest, LLMCompletionResponse } from '@stratix/core';

class SupportService extends AgentService<string, string> {
  constructor(llmPort: LLMPort) {  // ← Infrastructure abstraction
    super(llmPort);
  }

  protected prepareRequest(spec: AgentSpecification, input: string): LLMRequest {
    const supportSpec = spec as CustomerSupportAgentSpec;
    return {
      messages: supportSpec.buildMessages(input),  // ← Uses domain logic
      config: spec.modelConfig
    };
  }

  protected parseResponse(response: LLMCompletionResponse): string {
    return response.content;
  }
}

// Usage
const llmAdapter = new OpenAILLMAdapter(apiKey);  // Infrastructure
const service = new SupportService(llmAdapter);
const spec = new CustomerSupportAgentSpec(EntityId.create());

const result = await service.execute(spec, 'How do I reset my password?');

if (result.isSuccess) {
  console.log(result.value.output);
}
```

### 3. Tools

Tools extend agents with external capabilities:

```typescript
import { Tool } from '@stratix/core/ai/tools';

class DatabaseQueryTool extends Tool<
  { query: string },
  { results: unknown[] }
> {
  get name() {
    return 'database_query';
  }

  get description() {
    return 'Execute a database query';
  }

  get parameters() {
    return {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'SQL query to execute' },
      },
      required: ['query'],
    };
  }

  async execute(params, context) {
    // Execute query...
    return ToolResult.success({ results: [] });
  }
}
```

### 4. Memory

Agents maintain short-term memory across conversations:

```typescript
import { ShortTermMemory } from '@stratix/core/ai/memory';

const memory = new ShortTermMemory({
  maxEntries: 100,
  maxAgeMs: 3600000, // 1 hour
});

await memory.store('key', { value: 'data' }, {
  importance: 0.8,
  tags: ['user-preference'],
});

const entries = await memory.search('key');
```

### 5. Orchestration

Coordinate multiple agents:

```typescript
import { Pipeline, DynamicPipeline } from '@stratix/core/ai/orchestration';

// Sequential pipeline
const pipeline = Pipeline.create([
  classificationAgent,
  routingAgent,
  executionAgent,
]);

const result = await pipeline.execute(input);

// Dynamic routing
const dynamic = DynamicPipeline.create(
  routingAgent,
  {
    support: supportAgent,
    sales: salesAgent,
    technical: technicalAgent,
  }
);
```

### 6. Workflows

Complex multi-step processes:

```typescript
import { Workflow, WorkflowEngine } from '@stratix/core/ai/workflows';
import { TransformStep, ConditionalStep } from '@stratix/core/ai/workflows/steps';

const workflow = new Workflow({
  id: 'user-onboarding',
  name: 'User Onboarding',
  version: '1.0',
  steps: [
    new TransformStep('validate', (input) => validateUser(input)),
    new ConditionalStep(
      'check-premium',
      (ctx) => ctx.input.premium === true,
      'setup-premium',
      'setup-basic'
    ),
    // ...more steps
  ],
});

const engine = new WorkflowEngine();
const result = await engine.execute(workflow, input);
```

### 7. RAG (Retrieval-Augmented Generation)

Enhance agents with knowledge bases:

```typescript
import { RAGPipeline, InMemoryVectorStore } from '@stratix/core/ai/rag';
import { FixedSizeChunking } from '@stratix/core/ai/rag/chunking';

const vectorStore = new InMemoryVectorStore();
const chunker = new DocumentChunker(new FixedSizeChunking({
  chunkSize: 512,
  overlap: 50,
}));

const pipeline = new RAGPipeline(
  vectorStore,
  chunker,
  embeddingProvider
);

// Ingest documents
await pipeline.ingest({
  id: 'doc1',
  content: 'Product documentation...',
  metadata: { source: 'docs' },
});

// Retrieve relevant context
const context = await pipeline.retrieve('How do I reset password?', {
  limit: 5,
  minSimilarity: 0.7,
});
```

### 8. Observability

Complete visibility into agent operations:

```typescript
import {
  InMemoryTelemetry,
  TraceCollector,
  InMemoryExecutionAuditLog,
  AuditRecordHelpers,
  AuditSeverity,
} from '@stratix/core/ai/observability';

// Telemetry (OpenTelemetry-compatible)
const telemetry = new InMemoryTelemetry();
const span = telemetry.startSpan('agent.execute', {
  'agent.name': 'CustomerSupport',
});
// ... do work
telemetry.endSpan(span.spanId);

// Tracing (execution paths)
const traceCollector = new TraceCollector();
const trace = traceCollector.startTrace({
  agentId: 'customer-support',
  sessionId: 'session_123',
});
traceCollector.addStep(trace.traceId, {
  name: 'llm.request',
  type: 'llm',
  startTime: new Date(),
  endTime: new Date(),
  metadata: { model: 'gpt-4', tokens: 150, cost: 0.003 },
});
traceCollector.endTrace(trace.traceId);

// Audit (compliance-ready)
const auditLog = new InMemoryExecutionAuditLog();
auditLog.record(AuditRecordHelpers.info(
  'agent.executed',
  'customer-support',
  { input: '...', output: '...', duration: 1250 }
));

// Query audit trail
const errors = auditLog.query({
  minSeverity: AuditSeverity.ERROR,
  startTime: new Date('2024-01-01'),
});
```

### 9. Guardrails

Safety and validation:

```typescript
import {
  TextLengthGuardrail,
  PatternGuardrail,
  GuardrailChain,
} from '@stratix/core/ai/guardrails';

const lengthGuard = new TextLengthGuardrail({
  maxLength: 1000,
  severity: 'error',
});

const piiGuard = new PatternGuardrail({
  patterns: [/\b\d{3}-\d{2}-\d{4}\b/], // SSN pattern
  severity: 'critical',
  message: 'PII detected in output',
});

const chain = new GuardrailChain([lengthGuard, piiGuard], {
  stopOnFailure: true,
  parallel: true,
});

const result = await chain.check(output);
if (result.shouldBlock()) {
  // Handle blocked output
}
```

### 10. Prompts

Centralized prompt management:

```typescript
import {
  PromptTemplate,
  PromptRegistry,
  PromptLoader,
} from '@stratix/core/ai/prompts';

const template = new PromptTemplate(
  'support-agent',
  `You are a helpful support agent for {{company}}.

User query: {{query}}

Please respond professionally and helpfully.`,
  ['company', 'query']
);

const rendered = template.render({
  company: 'Acme Corp',
  query: 'How do I reset my password?',
});

// Registry
const registry = new PromptRegistry();
registry.register(template);

const prompt = registry.get('support-agent');
```

### 11. Streaming

Real-time response streaming:

```typescript
import { StreamingExecutor } from '@stratix/core/ai/streaming';

const executor = new StreamingExecutor(engine);

for await (const chunk of executor.stream(agent, input, config)) {
  if (chunk.type === 'content') {
    process.stdout.write(chunk.data);
  } else if (chunk.type === 'tool_call') {
    console.log(`Calling tool: ${chunk.data.tool}`);
  }
}
```

## Key Features

### Type Safety

- Strict TypeScript with no `any` in domain code
- Phantom types for entity IDs
- Branded types for domain concepts
- Exhaustive pattern matching with discriminated unions

### Error Handling

- Result pattern instead of exceptions
- Structured error types
- Error context preservation
- Graceful degradation

### Observability

- OpenTelemetry-compatible spans
- Distributed tracing
- Audit logging
- Metrics collection

### Testing

- 776 tests covering all subsystems
- >50% code coverage
- Integration test utilities
- Mock providers for testing

### Performance

- Streaming support for real-time responses
- Batching for efficiency
- Caching where appropriate
- Async-first design

## Production Checklist

Before deploying agents to production:

- [ ] Configure appropriate timeouts and retries
- [ ] Set up guardrails for content safety
- [ ] Implement proper error handling
- [ ] Configure observability (telemetry, tracing, audit)
- [ ] Test with realistic workloads
- [ ] Set resource limits (max iterations, memory)
- [ ] Implement rate limiting
- [ ] Configure proper model selection
- [ ] Set up monitoring and alerting
- [ ] Document agent capabilities and limitations

## Examples

Complete working examples demonstrating the DDD pattern with AI agents are planned but not yet available in the repository.

## Testing

```bash
# Run all tests
npx vitest run src/ai/

# Run specific subsystem tests
npx vitest run src/ai/core/
npx vitest run src/ai/observability/

# Run with coverage
npx vitest run src/ai/ --coverage

# Watch mode
npx vitest src/ai/
```

## License

Part of the Stratix framework. See main LICENSE file.
