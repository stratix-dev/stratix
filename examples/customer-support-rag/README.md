# Customer Support with RAG Example

This example demonstrates a complete AI-powered customer support system using Stratix's RAG pipeline, guardrails, and telemetry features.

## Features Demonstrated

- **RAG Pipeline**: Semantic search over product documentation
- **Guardrails**: PII detection and prompt injection prevention
- **Telemetry**: Complete observability of all operations
- **Error Handling**: Result pattern for robust error handling

## Architecture

```
Customer Query
    |
    v
[Guardrails]
    |
    v
[RAG Pipeline]
    |
    +---> Document Chunking
    +---> Vector Search
    +---> Context Retrieval
    |
    v
[LLM Generation]
    |
    v
[Telemetry Recording]
    |
    v
Response
```

## Setup

```bash
# Install dependencies
pnpm install

# Set your OpenAI API key
export OPENAI_API_KEY="your-api-key-here"

# Run the example
npx tsx index.ts
```

## Code Walkthrough

### 1. Initialize Components

The example sets up:
- In-memory vector store for document embeddings
- Recursive text chunker for document processing
- RAG pipeline with OpenAI embeddings
- PII and Prompt Injection guardrails
- Telemetry for observability

### 2. Ingest Product Documentation

Product docs are chunked and embedded into the vector store for semantic search.

### 3. Process Customer Queries

Each query goes through:
1. Guardrail evaluation (PII, injection detection)
2. RAG retrieval (semantic search)
3. LLM generation with context
4. Telemetry recording

### 4. View Metrics

After processing queries, view:
- Total cost and tokens used
- RAG retrieval statistics
- Guardrail violations
- Success/failure rates

## Example Output

```
Processing query: "How do I reset my password?"
✓ Guardrails passed
✓ Retrieved 3 relevant documents
✓ Generated response

Response: To reset your password, go to Settings > Security > Reset Password...

Metrics:
- Total Cost: $0.015
- Total Tokens: 450
- RAG Retrievals: 1
- Guardrail Checks: 2
- Success Rate: 100%
```

## Key Takeaways

1. **Type Safety**: All operations return `Result<T, Error>` for explicit error handling
2. **Observability**: Every operation is tracked with detailed metrics
3. **Security**: Guardrails automatically detect and prevent security issues
4. **Scalability**: In-memory implementations can be swapped for production-ready ones (Pinecone, Qdrant, etc.)
