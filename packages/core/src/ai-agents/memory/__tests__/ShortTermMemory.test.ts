import { describe, it, expect, beforeEach } from 'vitest';
import { ShortTermMemory } from '../ShortTermMemory.js';

describe('ShortTermMemory', () => {
  let memory: ShortTermMemory<string>;

  beforeEach(() => {
    memory = new ShortTermMemory<string>();
  });

  describe('store and retrieve', () => {
    it('should store and retrieve entry', async () => {
      const id = await memory.store('Hello, world!');

      const entry = await memory.retrieve(id);

      expect(entry).toBeDefined();
      expect(entry?.content).toBe('Hello, world!');
    });

    it('should store with importance', async () => {
      const id = await memory.store('Important message', 0.9);

      const entry = await memory.retrieve(id);

      expect(entry?.importance).toBe(0.9);
    });

    it('should store with metadata', async () => {
      const id = await memory.store('Message', undefined, { user: 'Alice' });

      const entry = await memory.retrieve(id);

      expect(entry?.metadata?.user).toBe('Alice');
    });

    it('should return undefined for non-existent entry', async () => {
      const entry = await memory.retrieve('nonexistent');

      expect(entry).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all entries', async () => {
      await memory.store('Entry 1');
      await memory.store('Entry 2');
      await memory.store('Entry 3');

      const all = await memory.getAll();

      expect(all.length).toBe(3);
    });

    it('should return entries sorted by recency', async () => {
      const id1 = await memory.store('First');
      await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different timestamps
      const id2 = await memory.store('Second');

      const all = await memory.getAll();

      expect(all[0].id).toBe(id2); // Most recent first
      expect(all[1].id).toBe(id1);
    });

    it('should respect limit', async () => {
      await memory.store('Entry 1');
      await memory.store('Entry 2');
      await memory.store('Entry 3');

      const limited = await memory.getAll(2);

      expect(limited.length).toBe(2);
    });
  });

  describe('getRecent', () => {
    it('should return recent entries', async () => {
      await memory.store('Old');
      await new Promise(resolve => setTimeout(resolve, 10));
      await memory.store('Recent 1');
      await new Promise(resolve => setTimeout(resolve, 10));
      await memory.store('Recent 2');

      const recent = await memory.getRecent(2);

      expect(recent.length).toBe(2);
      expect(recent[0].content).toBe('Recent 2');
      expect(recent[1].content).toBe('Recent 1');
    });
  });

  describe('getImportant', () => {
    it('should return most important entries', async () => {
      await memory.store('Low', 0.1);
      await memory.store('High', 0.9);
      await memory.store('Medium', 0.5);

      const important = await memory.getImportant(2);

      expect(important.length).toBe(2);
      expect(important[0].content).toBe('High');
      expect(important[1].content).toBe('Medium');
    });
  });

  describe('search', () => {
    it('should search with time range', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 3600000); // 1 hour ago

      await memory.store('Old');
      await memory.store('Recent');

      const results = await memory.search({
        timeRange: { from: past },
      });

      expect(results.length).toBe(2);
    });

    it('should filter by importance', async () => {
      await memory.store('Low', 0.3);
      await memory.store('High', 0.8);

      const results = await memory.search({
        minImportance: 0.5,
      });

      expect(results.length).toBe(1);
      expect(results[0].content).toBe('High');
    });

    it('should filter by metadata', async () => {
      await memory.store('User A', undefined, { user: 'alice' });
      await memory.store('User B', undefined, { user: 'bob' });

      const results = await memory.search({
        metadata: { user: 'alice' },
      });

      expect(results.length).toBe(1);
      expect(results[0].content).toBe('User A');
    });

    it('should apply limit', async () => {
      await memory.store('Entry 1');
      await memory.store('Entry 2');
      await memory.store('Entry 3');

      const results = await memory.search({ limit: 2 });

      expect(results.length).toBe(2);
    });
  });

  describe('delete', () => {
    it('should delete entry', async () => {
      const id = await memory.store('To delete');

      const deleted = await memory.delete(id);

      expect(deleted).toBe(true);
      expect(await memory.size()).toBe(0);
    });

    it('should return false for non-existent entry', async () => {
      const deleted = await memory.delete('nonexistent');

      expect(deleted).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all entries', async () => {
      await memory.store('Entry 1');
      await memory.store('Entry 2');

      await memory.clear();

      expect(await memory.size()).toBe(0);
    });
  });

  describe('size', () => {
    it('should return number of entries', async () => {
      expect(await memory.size()).toBe(0);

      await memory.store('Entry 1');
      await memory.store('Entry 2');

      expect(await memory.size()).toBe(2);
    });
  });

  describe('max entries limit', () => {
    it('should evict oldest entries when limit exceeded', async () => {
      const limitedMemory = new ShortTermMemory<string>({ maxEntries: 3 });

      await limitedMemory.store('Entry 1');
      await new Promise(resolve => setTimeout(resolve, 10));
      await limitedMemory.store('Entry 2');
      await new Promise(resolve => setTimeout(resolve, 10));
      await limitedMemory.store('Entry 3');
      await new Promise(resolve => setTimeout(resolve, 10));
      await limitedMemory.store('Entry 4'); // Should evict Entry 1

      const all = await limitedMemory.getAll();

      expect(all.length).toBe(3);
      expect(all.some((e) => e.content === 'Entry 1')).toBe(false);
      expect(all.some((e) => e.content === 'Entry 4')).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return memory statistics', async () => {
      await memory.store('Entry 1', 0.5);
      await memory.store('Entry 2', 0.7);

      const stats = memory.getStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.averageImportance).toBe(0.6);
      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();
    });

    it('should handle empty memory', () => {
      const stats = memory.getStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.averageImportance).toBe(0);
    });
  });
});
