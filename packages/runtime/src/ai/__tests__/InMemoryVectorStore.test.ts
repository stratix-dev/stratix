import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryVectorStore } from '../InMemoryVectorStore.js';
import type { LLMProvider, ChatParams, EmbeddingParams } from '@stratix/core';

// Mock LLM Provider for testing
class MockLLMProvider implements LLMProvider {
  readonly name = 'mock';
  readonly models = ['mock-model'];

  private embeddingCounter = 0;

  async chat(params: ChatParams) {
    return {
      content: 'Mock response',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
      finishReason: 'stop' as const,
    };
  }

  async *streamChat(params: ChatParams) {
    yield { content: 'Mock', isComplete: false };
    yield { content: ' response', isComplete: true };
  }

  async embeddings(params: EmbeddingParams) {
    const inputs = Array.isArray(params.input) ? params.input : [params.input];
    const embeddings = inputs.map((input) => this.generateEmbedding(input));

    return {
      embeddings,
      usage: {
        promptTokens: inputs.length * 8,
        completionTokens: 0,
        totalTokens: inputs.length * 8,
      },
    };
  }

  private generateEmbedding(text: string): number[] {
    // Generate a deterministic embedding based on text content
    // This creates different embeddings for different texts while being deterministic
    const hash = this.simpleHash(text);
    const dimension = 128;
    const embedding: number[] = [];

    for (let i = 0; i < dimension; i++) {
      const seed = hash + i;
      embedding.push(Math.sin(seed) * Math.cos(seed * 0.5));
    }

    // Normalize the vector
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map((val) => val / norm);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

describe('InMemoryVectorStore', () => {
  let store: InMemoryVectorStore;
  let llmProvider: MockLLMProvider;

  beforeEach(() => {
    llmProvider = new MockLLMProvider();
    store = new InMemoryVectorStore(llmProvider, 'mock-model');
  });

  describe('add', () => {
    it('should add documents and generate embeddings', async () => {
      const count = await store.add([
        { id: '1', content: 'AI agents are autonomous software entities' },
        { id: '2', content: 'Machine learning powers modern AI systems' },
      ]);

      expect(count).toBe(2);
      expect(store.size()).toBe(2);
    });

    it('should preserve existing embeddings', async () => {
      const embedding = new Array(128).fill(0.5);

      await store.add([
        { id: '1', content: 'Test', embedding },
      ]);

      const doc = await store.get('1');
      expect(doc?.embedding).toEqual(embedding);
    });

    it('should preserve metadata', async () => {
      await store.add([
        {
          id: '1',
          content: 'Test content',
          metadata: {
            source: 'test.pdf',
            tags: ['testing', 'documentation'],
            author: 'Test Author',
          },
        },
      ]);

      const doc = await store.get('1');
      expect(doc?.metadata?.source).toBe('test.pdf');
      expect(doc?.metadata?.tags).toEqual(['testing', 'documentation']);
      expect(doc?.metadata?.author).toBe('Test Author');
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await store.add([
        { id: '1', content: 'AI agents are autonomous software entities' },
        { id: '2', content: 'Machine learning powers modern AI systems' },
        { id: '3', content: 'Natural language processing enables text understanding' },
      ]);
    });

    it('should find relevant documents by text query', async () => {
      const results = await store.search({
        query: 'What are AI agents?',
        limit: 3,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(3);
      expect(results[0].score).toBeGreaterThan(0);
      expect(results[0].score).toBeLessThanOrEqual(1);
    });

    it('should find relevant documents by embedding vector', async () => {
      const doc = await store.get('1');
      const results = await store.search({
        query: doc!.embedding!,
        limit: 1,
      });

      expect(results.length).toBe(1);
      expect(results[0].document.id).toBe('1');
      expect(results[0].score).toBeCloseTo(1, 2); // Should be very close to 1 (identical)
    });

    it('should respect limit parameter', async () => {
      const results = await store.search({
        query: 'AI systems',
        limit: 2,
      });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should filter by minimum score', async () => {
      const results = await store.search({
        query: 'completely unrelated quantum physics topic',
        minScore: 0.9,
      });

      // Should have few or no results due to high threshold
      results.forEach((result) => {
        expect(result.score).toBeGreaterThanOrEqual(0.9);
      });
    });

    it('should return results sorted by score descending', async () => {
      const results = await store.search({
        query: 'AI and machine learning',
        limit: 3,
      });

      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
    });

    it('should filter by metadata source', async () => {
      await store.clear();
      await store.add([
        { id: '1', content: 'Content A', metadata: { source: 'doc1.pdf' } },
        { id: '2', content: 'Content B', metadata: { source: 'doc2.pdf' } },
        { id: '3', content: 'Content C', metadata: { source: 'doc1.pdf' } },
      ]);

      const results = await store.search({
        query: 'Content',
        filter: { source: 'doc1.pdf' },
      });

      expect(results.length).toBe(2);
      results.forEach((result) => {
        expect(result.document.metadata?.source).toBe('doc1.pdf');
      });
    });

    it('should filter by metadata tags', async () => {
      await store.clear();
      await store.add([
        { id: '1', content: 'Content A', metadata: { tags: ['ai', 'ml'] } },
        { id: '2', content: 'Content B', metadata: { tags: ['nlp'] } },
        { id: '3', content: 'Content C', metadata: { tags: ['ai', 'cv'] } },
      ]);

      const results = await store.search({
        query: 'Content',
        filter: { tags: ['ai'] },
      });

      expect(results.length).toBe(2);
      results.forEach((result) => {
        expect(result.document.metadata?.tags).toContain('ai');
      });
    });
  });

  describe('get', () => {
    it('should return document by ID', async () => {
      await store.add([{ id: '1', content: 'Test content' }]);

      const doc = await store.get('1');
      expect(doc).not.toBeNull();
      expect(doc?.id).toBe('1');
      expect(doc?.content).toBe('Test content');
    });

    it('should return null for non-existent document', async () => {
      const doc = await store.get('nonexistent');
      expect(doc).toBeNull();
    });
  });

  describe('update', () => {
    beforeEach(async () => {
      await store.add([
        {
          id: '1',
          content: 'Original content',
          metadata: { source: 'original.pdf' },
        },
      ]);
    });

    it('should update document content and regenerate embedding', async () => {
      const updated = await store.update('1', {
        content: 'Updated content',
      });

      expect(updated).toBe(true);

      const doc = await store.get('1');
      expect(doc?.content).toBe('Updated content');
      expect(doc?.embedding).toBeDefined();
    });

    it('should update metadata without changing content', async () => {
      const updated = await store.update('1', {
        metadata: { source: 'updated.pdf', tags: ['new'] },
      });

      expect(updated).toBe(true);

      const doc = await store.get('1');
      expect(doc?.content).toBe('Original content');
      expect(doc?.metadata?.source).toBe('updated.pdf');
      expect(doc?.metadata?.tags).toEqual(['new']);
    });

    it('should return false for non-existent document', async () => {
      const updated = await store.update('nonexistent', { content: 'New' });
      expect(updated).toBe(false);
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      await store.add([
        { id: '1', content: 'Content 1' },
        { id: '2', content: 'Content 2' },
      ]);
    });

    it('should delete document by ID', async () => {
      const deleted = await store.delete('1');
      expect(deleted).toBe(true);
      expect(store.size()).toBe(1);

      const doc = await store.get('1');
      expect(doc).toBeNull();
    });

    it('should return false for non-existent document', async () => {
      const deleted = await store.delete('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('deleteMany', () => {
    beforeEach(async () => {
      await store.add([
        { id: '1', content: 'Content A', metadata: { source: 'doc1.pdf', tags: ['ai'] } },
        { id: '2', content: 'Content B', metadata: { source: 'doc2.pdf', tags: ['ml'] } },
        { id: '3', content: 'Content C', metadata: { source: 'doc1.pdf', tags: ['ai'] } },
        { id: '4', content: 'Content D', metadata: { source: 'doc3.pdf', tags: ['nlp'] } },
      ]);
    });

    it('should delete documents by source filter', async () => {
      const deleted = await store.deleteMany({ source: 'doc1.pdf' });
      expect(deleted).toBe(2);
      expect(store.size()).toBe(2);
    });

    it('should delete documents by tags filter', async () => {
      const deleted = await store.deleteMany({ tags: ['ai'] });
      expect(deleted).toBe(2);
      expect(store.size()).toBe(2);
    });

    it('should return 0 if no documents match filter', async () => {
      const deleted = await store.deleteMany({ source: 'nonexistent.pdf' });
      expect(deleted).toBe(0);
      expect(store.size()).toBe(4);
    });
  });

  describe('count', () => {
    it('should return document count', async () => {
      expect(await store.count()).toBe(0);

      await store.add([
        { id: '1', content: 'Content 1' },
        { id: '2', content: 'Content 2' },
        { id: '3', content: 'Content 3' },
      ]);

      expect(await store.count()).toBe(3);
    });
  });

  describe('clear', () => {
    it('should remove all documents', async () => {
      await store.add([
        { id: '1', content: 'Content 1' },
        { id: '2', content: 'Content 2' },
      ]);

      expect(store.size()).toBe(2);

      await store.clear();

      expect(store.size()).toBe(0);
      expect(await store.count()).toBe(0);
    });
  });

  describe('listAll', () => {
    beforeEach(async () => {
      await store.add([
        { id: '1', content: 'Content A', metadata: { source: 'doc1.pdf' } },
        { id: '2', content: 'Content B', metadata: { source: 'doc2.pdf' } },
        { id: '3', content: 'Content C', metadata: { source: 'doc1.pdf' } },
      ]);
    });

    it('should return all documents without filter', async () => {
      const docs = await store.listAll();
      expect(docs.length).toBe(3);
    });

    it('should return filtered documents', async () => {
      const docs = await store.listAll({ source: 'doc1.pdf' });
      expect(docs.length).toBe(2);
      docs.forEach((doc) => {
        expect(doc.metadata?.source).toBe('doc1.pdf');
      });
    });
  });

  describe('cosine similarity', () => {
    it('should calculate perfect similarity for identical vectors', async () => {
      const content = 'Test content for similarity';
      await store.add([{ id: '1', content }]);

      const results = await store.search({ query: content, limit: 1 });

      expect(results[0].score).toBeCloseTo(1, 1); // Very close to 1
    });

    it('should calculate lower similarity for different vectors', async () => {
      await store.add([
        { id: '1', content: 'AI agents' },
        { id: '2', content: 'Quantum physics' },
      ]);

      const results = await store.search({ query: 'AI agents', limit: 2 });

      // First result should be much more similar than second
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });
  });
});
