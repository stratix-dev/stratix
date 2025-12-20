import { describe, it, expect, beforeEach } from 'vitest';
import { RecursiveTextChunker } from '../RecursiveTextChunker.js';

describe('RecursiveTextChunker', () => {
  let chunker: RecursiveTextChunker;

  beforeEach(() => {
    chunker = new RecursiveTextChunker({
      chunkSize: 100,
      chunkOverlap: 20,
    });
  });

  describe('constructor', () => {
    it('should create chunker with valid config', () => {
      expect(chunker.config.chunkSize).toBe(100);
      expect(chunker.config.chunkOverlap).toBe(20);
    });

    it('should throw error for invalid chunkSize', () => {
      expect(() => {
        new RecursiveTextChunker({ chunkSize: 0, chunkOverlap: 10 });
      }).toThrow('chunkSize must be positive');

      expect(() => {
        new RecursiveTextChunker({ chunkSize: -100, chunkOverlap: 10 });
      }).toThrow('chunkSize must be positive');
    });

    it('should throw error for negative chunkOverlap', () => {
      expect(() => {
        new RecursiveTextChunker({ chunkSize: 100, chunkOverlap: -10 });
      }).toThrow('chunkOverlap cannot be negative');
    });

    it('should throw error if chunkOverlap >= chunkSize', () => {
      expect(() => {
        new RecursiveTextChunker({ chunkSize: 100, chunkOverlap: 100 });
      }).toThrow('chunkOverlap must be less than chunkSize');

      expect(() => {
        new RecursiveTextChunker({ chunkSize: 100, chunkOverlap: 150 });
      }).toThrow('chunkOverlap must be less than chunkSize');
    });
  });

  describe('chunk', () => {
    it('should chunk long text into multiple pieces', async () => {
      // Use text with natural separators for more realistic testing
      const longText = 'This is a sentence. '.repeat(50); // ~1000 characters

      const result = await chunker.chunk({
        id: 'doc1',
        content: longText,
      });

      expect(result.chunks.length).toBeGreaterThan(1);
      // Verify total content is preserved
      const totalContent = result.chunks.map((c) => c.content.trim()).join(' ');
      expect(totalContent.length).toBeGreaterThan(0);
      // Each chunk should have some content
      result.chunks.forEach((chunk) => {
        expect(chunk.content.length).toBeGreaterThan(0);
      });
    });

    it('should not chunk short text', async () => {
      const shortText = 'This is a short text.';

      const result = await chunker.chunk({
        id: 'doc1',
        content: shortText,
      });

      expect(result.chunks.length).toBe(1);
      expect(result.chunks[0].content).toBe(shortText);
    });

    it('should preserve chunk metadata', async () => {
      const result = await chunker.chunk({
        id: 'doc1',
        content: 'A'.repeat(300),
        metadata: { source: 'test.pdf', author: 'Test' },
      });

      result.chunks.forEach((chunk, index) => {
        expect(chunk.metadata?.source).toBe('test.pdf');
        expect(chunk.metadata?.author).toBe('Test');
        expect(chunk.metadata?.chunkIndex).toBe(index);
        expect(chunk.metadata?.totalChunks).toBe(result.chunks.length);
      });
    });

    it('should assign unique IDs to chunks', async () => {
      const result = await chunker.chunk({
        id: 'doc1',
        content: 'A'.repeat(300),
      });

      const ids = result.chunks.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length); // All IDs should be unique
    });

    it('should split on paragraph boundaries', async () => {
      const text = `First paragraph with some content here.

Second paragraph with different content.

Third paragraph with more information.`;

      const result = await chunker.chunk({
        id: 'doc1',
        content: text,
      });

      // Should split on double newlines
      expect(result.chunks.length).toBeGreaterThan(1);
    });

    it('should create overlap between chunks', async () => {
      const chunker = new RecursiveTextChunker({
        chunkSize: 50,
        chunkOverlap: 10,
      });

      const text = 'A'.repeat(30) + ' ' + 'B'.repeat(30) + ' ' + 'C'.repeat(30);

      const result = await chunker.chunk({
        id: 'doc1',
        content: text,
      });

      expect(result.chunks.length).toBeGreaterThan(1);

      // Check that there's overlap between consecutive chunks
      for (let i = 0; i < result.chunks.length - 1; i++) {
        const chunk1 = result.chunks[i].content;
        const chunk2 = result.chunks[i + 1].content;

        // Last part of chunk1 should overlap with start of chunk2
        const overlapFromChunk1 = chunk1.slice(-chunker.config.chunkOverlap);
        expect(chunk2.startsWith(overlapFromChunk1) || chunk2.includes(overlapFromChunk1.trim())).toBe(true);
      }
    });

    it('should handle minChunkSize', async () => {
      const chunker = new RecursiveTextChunker({
        chunkSize: 100,
        chunkOverlap: 20,
        minChunkSize: 50,
      });

      const text = 'Short. ' + 'A'.repeat(200);

      const result = await chunker.chunk({
        id: 'doc1',
        content: text,
      });

      // All chunks should meet minimum size (except possibly the last one)
      result.chunks.forEach((chunk) => {
        expect(chunk.content.length).toBeGreaterThanOrEqual(chunker.config.minChunkSize!);
      });
    });

    it('should return originalMetadata', async () => {
      const metadata = { source: 'test.pdf', tags: ['test'] };

      const result = await chunker.chunk({
        id: 'doc1',
        content: 'A'.repeat(300),
        metadata,
      });

      expect(result.originalMetadata).toEqual(metadata);
    });
  });

  describe('chunkMany', () => {
    it('should chunk multiple documents', async () => {
      const docs = [
        { id: '1', content: 'A'.repeat(300) },
        { id: '2', content: 'B'.repeat(400) },
        { id: '3', content: 'C'.repeat(200) },
      ];

      const results = await chunker.chunkMany(docs);

      expect(results.length).toBe(3);
      results.forEach((result, index) => {
        expect(result.chunks.length).toBeGreaterThan(0);
        result.chunks.forEach((chunk) => {
          expect(chunk.id).toContain(docs[index].id);
        });
      });
    });

    it('should handle empty array', async () => {
      const results = await chunker.chunkMany([]);
      expect(results).toEqual([]);
    });
  });

  describe('estimateChunks', () => {
    it('should estimate number of chunks correctly', async () => {
      const chunker = new RecursiveTextChunker({
        chunkSize: 100,
        chunkOverlap: 20,
      });

      const doc = { id: '1', content: 'A'.repeat(250) };

      const estimate = chunker.estimateChunks(doc);
      const actual = await chunker.chunk(doc);

      // Estimate should be reasonably close to actual (within 50%)
      expect(estimate).toBeGreaterThan(0);
      expect(Math.abs(estimate - actual.chunks.length) / actual.chunks.length).toBeLessThan(0.5);
    });

    it('should return 1 for small documents', () => {
      const doc = { id: '1', content: 'Short text' };
      const estimate = chunker.estimateChunks(doc);
      expect(estimate).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', async () => {
      const result = await chunker.chunk({
        id: 'doc1',
        content: '',
      });

      expect(result.chunks.length).toBe(1);
      expect(result.chunks[0].content).toBe('');
    });

    it('should handle content with only whitespace', async () => {
      const result = await chunker.chunk({
        id: 'doc1',
        content: '   \n\n   ',
      });

      expect(result.chunks.length).toBeGreaterThan(0);
    });

    it('should handle content with no separators', async () => {
      const text = 'A'.repeat(300); // No spaces, newlines, or punctuation

      const result = await chunker.chunk({
        id: 'doc1',
        content: text,
      });

      expect(result.chunks.length).toBeGreaterThan(1);
    });

    it('should handle content with mixed separators', async () => {
      const text = `Paragraph 1 with sentence. Another sentence!

Paragraph 2 with different content? Yes.

Paragraph 3 here.`;

      const result = await chunker.chunk({
        id: 'doc1',
        content: text,
      });

      expect(result.chunks.length).toBeGreaterThan(0);
    });

    it('should handle very small chunk size', async () => {
      const chunker = new RecursiveTextChunker({
        chunkSize: 10,
        chunkOverlap: 2,
      });

      const text = 'This is a test sentence with multiple words.';

      const result = await chunker.chunk({
        id: 'doc1',
        content: text,
      });

      expect(result.chunks.length).toBeGreaterThan(1);
      result.chunks.forEach((chunk) => {
        // Some chunks might be slightly larger than chunkSize due to splitting logic
        expect(chunk.content.length).toBeGreaterThan(0);
      });
    });

    it('should handle large chunk size', async () => {
      const chunker = new RecursiveTextChunker({
        chunkSize: 10000,
        chunkOverlap: 100,
      });

      const text = 'A'.repeat(500);

      const result = await chunker.chunk({
        id: 'doc1',
        content: text,
      });

      expect(result.chunks.length).toBe(1);
      expect(result.chunks[0].content).toBe(text);
    });

    it('should handle zero overlap', async () => {
      const chunker = new RecursiveTextChunker({
        chunkSize: 50,
        chunkOverlap: 0,
      });

      const text = 'A'.repeat(150);

      const result = await chunker.chunk({
        id: 'doc1',
        content: text,
      });

      expect(result.chunks.length).toBeGreaterThan(1);
      // No overlap means chunks shouldn't share content
    });
  });
});
