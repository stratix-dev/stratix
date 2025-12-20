# Stratix Examples

Welcome to the Stratix examples directory! These examples demonstrate how to use Stratix's AI-first features in real-world scenarios.

## Available Examples

### 1. Customer Support with RAG
**Directory:** `customer-support-rag/`

A complete customer support system powered by RAG (Retrieval-Augmented Generation).

**Features:**
- Semantic search over product documentation
- PII detection guardrails
- Prompt injection prevention
- Complete telemetry and observability
- Cost and token tracking

**What you'll learn:**
- Setting up a RAG pipeline
- Ingesting and chunking documents
- Configuring security guardrails
- Tracking metrics and costs

**Time to complete:** 10 minutes

### 2. Document Processing Workflow
**Directory:** `document-workflow/`

A multi-step document processing pipeline using the Workflow Engine.

**Features:**
- Sequential and parallel step execution
- Conditional branching
- Human-in-the-loop approval
- Transform steps
- Variable passing between steps

**What you'll learn:**
- Building workflows with WorkflowBuilder
- Orchestrating complex processes
- Handling approvals and reviews
- Managing workflow state

**Time to complete:** 15 minutes

## Getting Started

### Prerequisites

```bash
# Node.js 18+ required
node --version

# Install dependencies
pnpm install
```

### Running Examples

Each example is self-contained and can be run independently:

```bash
# Navigate to an example directory
cd customer-support-rag

# Run the example
npx tsx index.ts
```

### Using with OpenAI

To use real LLM providers instead of mocks:

```bash
# Install OpenAI provider
pnpm add @stratix/ai-openai

# Set your API key
export OPENAI_API_KEY="your-key-here"
```

Then modify the example to use `OpenAIProvider` instead of `MockLLMProvider`.

## Example Structure

Each example follows this structure:

```
example-name/
├── README.md          # Detailed documentation
├── index.ts           # Runnable code
└── package.json       # Dependencies (if needed)
```

## Common Patterns

### 1. Result Pattern

All operations return `Result<T, Error>` for explicit error handling:

```typescript
const result = await operation();

if (result.isSuccess) {
  console.log(result.value);
} else {
  console.error(result.error);
}
```

### 2. Telemetry

Track all operations with telemetry:

```typescript
const telemetry = new InMemoryTelemetry({
  serviceName: 'my-service',
  environment: 'production',
});

const span = telemetry.startSpan('operation', 'agent.execute');
// ... perform operation
span.end();

const metrics = telemetry.getMetrics();
```

### 3. Guardrails

Protect your AI operations:

```typescript
const guardrailChain = new StandardGuardrailChain([
  new PIIGuardrail(),
  new PromptInjectionGuardrail(),
  new ContentLengthGuardrail({ maxCharacters: 10000 }),
]);

const result = guardrailChain.execute({ content, metadata: {} });

if (!result.passed) {
  // Handle violations
  console.log(result.violations);
}
```

### 4. Workflows

Build complex processes:

```typescript
const workflow = new WorkflowBuilder('my-workflow', '1.0.0')
  .agent('extract-data', {
    input: WorkflowBuilder.variable('document'),
    output: 'extractedData',
  })
  .condition(
    '${extractedData.isValid}',
    (then) => then.agent('process', { /* ... */ }),
    (else) => else.tool('reject', { /* ... */ })
  )
  .build();

const engine = new StandardWorkflowEngine();
const result = await engine.execute(workflow, inputVariables);
```

## Best Practices

1. **Always use Result pattern** - Don't throw exceptions in domain logic
2. **Enable telemetry in production** - Track metrics for debugging and optimization
3. **Configure guardrails** - Protect against PII leaks and prompt injection
4. **Use TypeScript strictly** - Leverage type safety for robust code
5. **Test with mocks first** - Use mock providers before connecting real LLMs

## Production Deployment

### Swapping Implementations

Stratix uses abstractions that allow swapping implementations:

```typescript
// Development
const vectorStore = new InMemoryVectorStore({ provider });

// Production
const vectorStore = new PineconeVectorStore({
  apiKey: process.env.PINECONE_API_KEY,
  environment: 'production',
  indexName: 'product-docs',
});
```

### Environment Configuration

Use environment variables for configuration:

```typescript
const config = {
  llmProvider: process.env.LLM_PROVIDER || 'openai',
  vectorStore: process.env.VECTOR_STORE || 'pinecone',
  telemetryEnabled: process.env.TELEMETRY_ENABLED === 'true',
};
```

### Monitoring

Export telemetry to observability platforms:

```typescript
import { OpenTelemetryExporter } from '@stratix/telemetry-opentelemetry';

const telemetry = new InMemoryTelemetry({
  exporters: [
    new OpenTelemetryExporter({
      endpoint: 'https://otel-collector.company.com',
    }),
  ],
});
```

## Next Steps

After completing the examples:

1. **Read the Documentation** - Explore the full API reference
2. **Build Your Own** - Create custom agents, workflows, and guardrails
3. **Join the Community** - Share your experiences and get help
4. **Contribute** - Submit examples and improvements

## Resources

- [Stratix Documentation](https://stratix.dev/docs)
- [API Reference](https://stratix.dev/api)
- [GitHub Repository](https://github.com/stratix-dev/stratix)
- [Discord Community](https://discord.gg/stratix)

## License

MIT License - See LICENSE file in root directory

## Questions?

- Open an issue on GitHub
- Ask in Discord
- Email: support@stratix.dev

Happy building with Stratix! 🚀
