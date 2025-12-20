import type {
  RAGPipeline,
  RAGPipelineConfig,
  RAGPipelineStatistics,
  IngestOptions,
  IngestResult,
  RetrievalOptions,
  RAGResult,
  Document,
  VectorSearchResult,
} from '@stratix/core';

/**
 * Standard RAG pipeline implementation.
 *
 * Orchestrates the complete RAG workflow:
 * 1. Ingest: Chunk documents and store with embeddings
 * 2. Retrieve: Find relevant documents using vector search
 * 3. Generate: Create responses augmented with retrieved context
 * @category AI Agents
 *
 * @example
 * ```typescript
 * const pipeline = new StandardRAGPipeline({
 *   llmProvider: openAIProvider,
 *   vectorStore: new InMemoryVectorStore(openAIProvider, 'text-embedding-3-small'),
 *   chunker: new RecursiveTextChunker({ chunkSize: 1000, chunkOverlap: 200 }),
 *   embeddingModel: 'text-embedding-3-small',
 *   generationModel: 'gpt-4-turbo',
 *   defaultSearchLimit: 5,
 *   defaultMinScore: 0.7
 * });
 *
 * // Ingest documents
 * await pipeline.ingest([
 *   { id: '1', content: 'Product documentation...' },
 *   { id: '2', content: 'FAQ content...' }
 * ], { chunk: true });
 *
 * // Query with RAG
 * const result = await pipeline.query('How do I reset my password?');
 * console.log(result.response);
 * ```
 */
export class StandardRAGPipeline implements RAGPipeline {
  readonly config: RAGPipelineConfig;

  private statistics: {
    totalQueries: number;
    totalRetrievalTime: number;
    totalGenerationTime: number;
    totalTokensUsed: number;
  } = {
    totalQueries: 0,
    totalRetrievalTime: 0,
    totalGenerationTime: 0,
    totalTokensUsed: 0,
  };

  constructor(config: RAGPipelineConfig) {
    this.config = config;
  }

  async ingest(
    documents: Document[],
    options: IngestOptions = {}
  ): Promise<IngestResult> {
    const {
      chunk = true,
      metadata = {},
      skipExisting = false,
    } = options;

    let documentsToIngest: Document[] = documents;
    let chunksCreated = 0;

    // Add custom metadata to all documents
    documentsToIngest = documentsToIngest.map((doc) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        ...metadata,
      },
    }));

    // Chunk documents if requested
    if (chunk) {
      const allChunks: Document[] = [];

      for (const doc of documentsToIngest) {
        const result = await this.config.chunker.chunk(doc);
        allChunks.push(...result.chunks);
        chunksCreated += result.chunks.length;
      }

      documentsToIngest = allChunks;
    }

    // Filter out existing documents if skipExisting is true
    if (skipExisting) {
      const filtered: Document[] = [];

      for (const doc of documentsToIngest) {
        const existing = await this.config.vectorStore.get(doc.id);

        if (!existing) {
          filtered.push(doc);
        }
      }

      documentsToIngest = filtered;
    }

    // Ingest into vector store
    const documentsIngested = await this.config.vectorStore.add(documentsToIngest);

    return {
      documentsIngested,
      chunksCreated: chunk ? chunksCreated : 0,
      documentIds: documentsToIngest.map((doc) => doc.id),
    };
  }

  async retrieve(
    query: string,
    options: RetrievalOptions = {}
  ): Promise<VectorSearchResult[]> {
    const startTime = Date.now();

    const {
      limit = this.config.defaultSearchLimit ?? 5,
      minScore = this.config.defaultMinScore ?? 0.7,
      filter,
    } = options;

    const results = await this.config.vectorStore.search({
      query,
      limit,
      minScore,
      filter,
    });

    const retrievalTime = Date.now() - startTime;
    this.statistics.totalRetrievalTime += retrievalTime;

    return results;
  }

  async query(
    query: string,
    options: RetrievalOptions = {},
    systemPrompt?: string
  ): Promise<RAGResult> {
    // Retrieve relevant context
    const context = await this.retrieve(query, options);

    // Build context string
    const contextText = context
      .map((result, index) => {
        const source = result.document.metadata?.source
          ? ` (Source: ${result.document.metadata.source})`
          : '';
        return `[${index + 1}]${source}\n${result.document.content}`;
      })
      .join('\n\n---\n\n');

    // Build messages
    const messages: Array<{ role: 'system' | 'user'; content: string; timestamp: Date }> = [];
    const now = new Date();

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
        timestamp: now,
      });
    }

    // Add context and query
    const userMessage = contextText
      ? `Context:\n${contextText}\n\nQuestion: ${query}`
      : query;

    messages.push({
      role: 'user',
      content: userMessage,
      timestamp: now,
    });

    // Generate response
    const startTime = Date.now();

    const model = this.config.generationModel ?? this.config.llmProvider.models[0];

    const chatResponse = await this.config.llmProvider.chat({
      model,
      messages,
      temperature: 0.7,
    });

    const generationTime = Date.now() - startTime;
    this.statistics.totalGenerationTime += generationTime;
    this.statistics.totalQueries++;

    // Track token usage
    const embeddingsTokens = context.length * 8; // Rough estimate
    const generationTokens = chatResponse.usage.totalTokens;
    const totalTokens = embeddingsTokens + generationTokens;

    this.statistics.totalTokensUsed += totalTokens;

    return {
      response: chatResponse.content,
      context,
      tokenUsage: {
        embeddings: embeddingsTokens,
        generation: generationTokens,
        total: totalTokens,
      },
    };
  }

  async clear(): Promise<void> {
    await this.config.vectorStore.clear();

    // Reset statistics
    this.statistics = {
      totalQueries: 0,
      totalRetrievalTime: 0,
      totalGenerationTime: 0,
      totalTokensUsed: 0,
    };
  }

  async getStatistics(): Promise<RAGPipelineStatistics> {
    const totalDocuments = await this.config.vectorStore.count();
    const allDocs = await this.config.vectorStore.listAll();

    const totalSize = allDocs.reduce((sum, doc) => sum + doc.content.length, 0);
    const averageDocumentSize = totalDocuments > 0 ? totalSize / totalDocuments : 0;

    const averageRetrievalTime =
      this.statistics.totalQueries > 0
        ? this.statistics.totalRetrievalTime / this.statistics.totalQueries
        : 0;

    const averageGenerationTime =
      this.statistics.totalQueries > 0
        ? this.statistics.totalGenerationTime / this.statistics.totalQueries
        : 0;

    return {
      totalDocuments,
      averageDocumentSize,
      totalQueries: this.statistics.totalQueries,
      averageRetrievalTime,
      averageGenerationTime,
      totalTokensUsed: this.statistics.totalTokensUsed,
    };
  }
}
