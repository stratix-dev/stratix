import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryVectorStore } from '../vector-store/VectorStore.js';
import { DocumentHelpers, type Document } from '../vector-store/Document.js';
import { EmbeddingHelpers, type Embedding } from '../vector-store/Embedding.js';

describe('Document', () => {
  describe('DocumentHelpers', () => {
    it('should create a document', () => {
      const doc = DocumentHelpers.create('doc1', 'Hello world', {
        source: 'test'
      });

      expect(doc.id).toBe('doc1');
      expect(doc.content).toBe('Hello world');
      expect(doc.metadata?.source).toBe('test');
    });

    it('should generate unique IDs', () => {
      const id1 = DocumentHelpers.generateId();
      const id2 = DocumentHelpers.generateId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^doc_\d+_[a-z0-9]+$/);
    });

    it('should estimate tokens', () => {
      const doc = DocumentHelpers.create('doc1', 'a'.repeat(100));

      expect(DocumentHelpers.estimateTokens(doc)).toBe(25); // 100 / 4
    });

    it('should check if document is empty', () => {
      const empty = DocumentHelpers.create('doc1', '   ');
      const nonEmpty = DocumentHelpers.create('doc2', 'content');

      expect(DocumentHelpers.isEmpty(empty)).toBe(true);
      expect(DocumentHelpers.isEmpty(nonEmpty)).toBe(false);
    });
  });
});

describe('Embedding', () => {
  describe('EmbeddingHelpers', () => {
    it('should create an embedding', () => {
      const embedding = EmbeddingHelpers.create([0.1, 0.2, 0.3], 'doc1', {
        model: 'test'
      });

      expect(embedding.vector).toEqual([0.1, 0.2, 0.3]);
      expect(embedding.documentId).toBe('doc1');
      expect(embedding.metadata?.model).toBe('test');
    });

    it('should get dimensions', () => {
      const embedding = EmbeddingHelpers.create([1, 2, 3, 4, 5], 'doc1');

      expect(EmbeddingHelpers.getDimensions(embedding)).toBe(5);
    });

    it('should calculate cosine similarity', () => {
      const emb1 = EmbeddingHelpers.create([1, 0, 0], 'doc1');
      const emb2 = EmbeddingHelpers.create([1, 0, 0], 'doc2');
      const emb3 = EmbeddingHelpers.create([0, 1, 0], 'doc3');

      expect(EmbeddingHelpers.cosineSimilarity(emb1, emb2)).toBe(1); // Identical
      expect(EmbeddingHelpers.cosineSimilarity(emb1, emb3)).toBe(0); // Orthogonal
    });

    it('should calculate Euclidean distance', () => {
      const emb1 = EmbeddingHelpers.create([0, 0], 'doc1');
      const emb2 = EmbeddingHelpers.create([3, 4], 'doc2');

      expect(EmbeddingHelpers.euclideanDistance(emb1, emb2)).toBe(5); // 3-4-5 triangle
    });

    it('should normalize vectors', () => {
      const normalized = EmbeddingHelpers.normalize([3, 4]);

      expect(normalized[0]).toBeCloseTo(0.6);
      expect(normalized[1]).toBeCloseTo(0.8);

      // Verify unit length
      const length = Math.sqrt(normalized[0] * normalized[0] + normalized[1] * normalized[1]);
      expect(length).toBeCloseTo(1);
    });

    it('should validate vectors', () => {
      const valid = [1, 2, 3];
      const invalid = [1, NaN, 3];
      const empty: number[] = [];

      expect(EmbeddingHelpers.validate(valid)).toEqual([]);
      expect(EmbeddingHelpers.validate(invalid).length).toBeGreaterThan(0);
      expect(EmbeddingHelpers.validate(empty).length).toBeGreaterThan(0);
    });
  });
});

describe('InMemoryVectorStore', () => {
  let store: InMemoryVectorStore;
  let doc1: Document;
  let doc2: Document;
  let emb1: Embedding;
  let emb2: Embedding;

  beforeEach(() => {
    store = new InMemoryVectorStore();

    doc1 = DocumentHelpers.create('doc1', 'First document', { category: 'tech' });
    doc2 = DocumentHelpers.create('doc2', 'Second document', {
      category: 'science'
    });

    emb1 = EmbeddingHelpers.create([1, 0, 0], 'doc1');
    emb2 = EmbeddingHelpers.create([0, 1, 0], 'doc2');
  });

  describe('upsert', () => {
    it('should store a document with embedding', async () => {
      await store.upsert(doc1, emb1);

      expect(await store.size()).toBe(1);
      expect(await store.has('doc1')).toBe(true);
    });

    it('should update existing document', async () => {
      await store.upsert(doc1, emb1);

      const updated = DocumentHelpers.create('doc1', 'Updated content');
      await store.upsert(updated, emb1);

      expect(await store.size()).toBe(1);
      const retrieved = await store.get('doc1');
      expect(retrieved?.content).toBe('Updated content');
    });
  });

  describe('upsertBatch', () => {
    it('should store multiple documents', async () => {
      await store.upsertBatch([doc1, doc2], [emb1, emb2]);

      expect(await store.size()).toBe(2);
    });

    it('should throw on length mismatch', async () => {
      await expect(store.upsertBatch([doc1, doc2], [emb1])).rejects.toThrow('mismatch');
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await store.upsertBatch([doc1, doc2], [emb1, emb2]);
    });

    it('should find similar documents', async () => {
      const results = await store.search({
        vector: [1, 0, 0], // Similar to doc1
        limit: 10
      });

      expect(results.length).toBe(2);
      expect(results[0].documentId).toBe('doc1'); // Most similar
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });

    it('should respect limit', async () => {
      await store.upsert(
        DocumentHelpers.create('doc3', 'Third document'),
        EmbeddingHelpers.create([0, 0, 1], 'doc3')
      );

      const results = await store.search({
        vector: [1, 0, 0],
        limit: 1
      });

      expect(results.length).toBe(1);
    });

    it('should apply similarity threshold', async () => {
      const results = await store.search({
        vector: [1, 0, 0],
        threshold: 0.5
      });

      // Only doc1 should be above threshold
      expect(results.length).toBe(1);
      expect(results[0].documentId).toBe('doc1');
    });

    it('should filter by metadata', async () => {
      const results = await store.search({
        vector: [1, 0, 0],
        filters: { category: 'tech' }
      });

      expect(results.length).toBe(1);
      expect(results[0].documentId).toBe('doc1');
    });
  });

  describe('get', () => {
    it('should retrieve document by ID', async () => {
      await store.upsert(doc1, emb1);

      const retrieved = await store.get('doc1');

      expect(retrieved).toEqual(doc1);
    });

    it('should return undefined for non-existent document', async () => {
      const retrieved = await store.get('nonexistent');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('getEmbedding', () => {
    it('should retrieve embedding by document ID', async () => {
      await store.upsert(doc1, emb1);

      const retrieved = await store.getEmbedding('doc1');

      expect(retrieved).toEqual(emb1);
    });
  });

  describe('delete', () => {
    it('should delete document and embedding', async () => {
      await store.upsert(doc1, emb1);

      const deleted = await store.delete('doc1');

      expect(deleted).toBe(true);
      expect(await store.size()).toBe(0);
    });

    it('should return false for non-existent document', async () => {
      const deleted = await store.delete('nonexistent');

      expect(deleted).toBe(false);
    });
  });

  describe('deleteBatch', () => {
    it('should delete multiple documents', async () => {
      await store.upsertBatch([doc1, doc2], [emb1, emb2]);

      const count = await store.deleteBatch(['doc1', 'doc2']);

      expect(count).toBe(2);
      expect(await store.size()).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all documents', async () => {
      await store.upsertBatch([doc1, doc2], [emb1, emb2]);

      await store.clear();

      expect(await store.size()).toBe(0);
    });
  });

  describe('listIds', () => {
    it('should list all document IDs', async () => {
      await store.upsertBatch([doc1, doc2], [emb1, emb2]);

      const ids = await store.listIds();

      expect(ids).toEqual(['doc1', 'doc2']);
    });

    it('should respect limit', async () => {
      await store.upsertBatch([doc1, doc2], [emb1, emb2]);

      const ids = await store.listIds(1);

      expect(ids.length).toBe(1);
    });
  });
});
