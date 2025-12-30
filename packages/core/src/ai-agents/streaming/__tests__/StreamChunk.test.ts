import { describe, it, expect } from 'vitest';
import { StreamChunkHelpers, type StreamChunk } from '../StreamChunk.js';

describe('StreamChunk', () => {
  describe('create', () => {
    it('should create a chunk', () => {
      const chunk = StreamChunkHelpers.create('test', false);

      expect(chunk.data).toBe('test');
      expect(chunk.done).toBe(false);
      expect(chunk.metadata).toBeUndefined();
    });

    it('should create a chunk with metadata', () => {
      const chunk = StreamChunkHelpers.create('test', true, { count: 1 });

      expect(chunk.metadata?.count).toBe(1);
    });
  });

  describe('partial', () => {
    it('should create a partial chunk', () => {
      const chunk = StreamChunkHelpers.partial('test');

      expect(chunk.done).toBe(false);
    });
  });

  describe('final', () => {
    it('should create a final chunk', () => {
      const chunk = StreamChunkHelpers.final('test');

      expect(chunk.done).toBe(true);
    });
  });

  describe('isFinal and isPartial', () => {
    it('should identify final chunks', () => {
      const final = StreamChunkHelpers.final('test');
      const partial = StreamChunkHelpers.partial('test');

      expect(StreamChunkHelpers.isFinal(final)).toBe(true);
      expect(StreamChunkHelpers.isFinal(partial)).toBe(false);
    });

    it('should identify partial chunks', () => {
      const final = StreamChunkHelpers.final('test');
      const partial = StreamChunkHelpers.partial('test');

      expect(StreamChunkHelpers.isPartial(partial)).toBe(true);
      expect(StreamChunkHelpers.isPartial(final)).toBe(false);
    });
  });

  describe('collect', () => {
    it('should collect all chunks', async () => {
      async function* testStream() {
        yield StreamChunkHelpers.partial('a');
        yield StreamChunkHelpers.partial('b');
        yield StreamChunkHelpers.final('c');
      }

      const chunks = await StreamChunkHelpers.collect(testStream());

      expect(chunks.length).toBe(3);
      expect(chunks[0].data).toBe('a');
      expect(chunks[1].data).toBe('b');
      expect(chunks[2].data).toBe('c');
    });

    it('should handle empty stream', async () => {
      async function* emptyStream(): AsyncIterable<StreamChunk<string>> {
        // Empty
      }

      const chunks = await StreamChunkHelpers.collect(emptyStream());

      expect(chunks.length).toBe(0);
    });
  });

  describe('getFinal', () => {
    it('should get the final chunk', async () => {
      async function* testStream() {
        yield StreamChunkHelpers.partial('a');
        yield StreamChunkHelpers.partial('b');
        yield StreamChunkHelpers.final('c');
      }

      const final = await StreamChunkHelpers.getFinal(testStream());

      expect(final?.data).toBe('c');
      expect(final?.done).toBe(true);
    });

    it('should return undefined for empty stream', async () => {
      async function* emptyStream(): AsyncIterable<StreamChunk<string>> {
        // Empty
      }

      const final = await StreamChunkHelpers.getFinal(emptyStream());

      expect(final).toBeUndefined();
    });
  });

  describe('map', () => {
    it('should transform chunk data', async () => {
      async function* testStream() {
        yield StreamChunkHelpers.partial('hello');
        yield StreamChunkHelpers.final('world');
      }

      const uppercase = StreamChunkHelpers.map(testStream(), (text) =>
        text.toUpperCase()
      );

      const chunks = await StreamChunkHelpers.collect(uppercase);

      expect(chunks[0].data).toBe('HELLO');
      expect(chunks[1].data).toBe('WORLD');
    });

    it('should preserve done state and metadata', async () => {
      async function* testStream() {
        yield StreamChunkHelpers.partial('a', { index: 0 });
        yield StreamChunkHelpers.final('b', { index: 1 });
      }

      const mapped = StreamChunkHelpers.map(testStream(), (text) =>
        text.toUpperCase()
      );

      const chunks = await StreamChunkHelpers.collect(mapped);

      expect(chunks[0].done).toBe(false);
      expect(chunks[0].metadata?.index).toBe(0);
      expect(chunks[1].done).toBe(true);
      expect(chunks[1].metadata?.index).toBe(1);
    });
  });

  describe('filter', () => {
    it('should filter chunks', async () => {
      async function* testStream() {
        yield StreamChunkHelpers.partial('a');
        yield StreamChunkHelpers.partial('');
        yield StreamChunkHelpers.partial('b');
        yield StreamChunkHelpers.final('');
      }

      const nonEmpty = StreamChunkHelpers.filter(
        testStream(),
        (text) => text.length > 0
      );

      const chunks = await StreamChunkHelpers.collect(nonEmpty);

      expect(chunks.length).toBe(2);
      expect(chunks[0].data).toBe('a');
      expect(chunks[1].data).toBe('b');
    });
  });

  describe('reduce', () => {
    it('should accumulate chunks', async () => {
      async function* testStream() {
        yield StreamChunkHelpers.partial('Hello');
        yield StreamChunkHelpers.partial(' ');
        yield StreamChunkHelpers.final('World!');
      }

      const fullText = await StreamChunkHelpers.reduce(
        testStream(),
        (acc, data) => acc + data,
        ''
      );

      expect(fullText).toBe('Hello World!');
    });

    it('should work with empty stream', async () => {
      async function* emptyStream(): AsyncIterable<StreamChunk<string>> {
        // Empty
      }

      const result = await StreamChunkHelpers.reduce(
        emptyStream(),
        (acc, data) => acc + data,
        'initial'
      );

      expect(result).toBe('initial');
    });

    it('should accumulate non-string types', async () => {
      async function* numberStream() {
        yield StreamChunkHelpers.partial(1);
        yield StreamChunkHelpers.partial(2);
        yield StreamChunkHelpers.final(3);
      }

      const sum = await StreamChunkHelpers.reduce(
        numberStream(),
        (acc, data) => acc + data,
        0
      );

      expect(sum).toBe(6);
    });
  });
});
