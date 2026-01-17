import type { Memory, MemoryEntry, MemoryQuery } from './Memory.js';
import { MemoryHelpers } from './Memory.js';

/**
 * Configuration for short-term memory.
 */
export interface ShortTermMemoryConfig {
  /**
   * Maximum number of entries to store.
   * When exceeded, oldest entries are removed.
   * Default: 100
   */
  readonly maxEntries?: number;

  /**
   * Maximum age of entries in milliseconds.
   * Entries older than this are automatically removed.
   * Default: undefined (no expiration)
   */
  readonly maxAgeMs?: number;

  /**
   * Whether to automatically remove old entries.
   * Default: true
   */
  readonly autoCleanup?: boolean;
}

/**
 * In-memory storage for short-term memories.
 *
 * - Stores entries in RAM
 * - Automatically evicts old entries
 * - Fast access
 * - No persistence (lost on restart)
 *
 * Use for:
 * - Session-based context
 * - Recent conversation history
 * - Temporary working memory
 *
 * @example
 * ```typescript
 * const memory = new ShortTermMemory<string>({
 *   maxEntries: 50,
 *   maxAgeMs: 3600000 // 1 hour
 * });
 *
 * // Store messages
 * await memory.store('User said: Hello');
 * await memory.store('Assistant said: Hi there!');
 *
 * // Retrieve recent history
 * const recent = await memory.getRecent(10);
 * ```
 */
export class ShortTermMemory<T = unknown> implements Memory<T> {
  private entries: MemoryEntry<T>[] = [];
  private readonly config: Required<ShortTermMemoryConfig>;

  constructor(config: ShortTermMemoryConfig = {}) {
    this.config = {
      maxEntries: config.maxEntries ?? 100,
      maxAgeMs: config.maxAgeMs ?? Infinity,
      autoCleanup: config.autoCleanup ?? true
    };
  }

  async store(
    content: T,
    importance?: number,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const entry = MemoryHelpers.createEntry(
      MemoryHelpers.generateId(),
      content,
      importance,
      metadata
    );

    this.entries.push(entry);

    if (this.config.autoCleanup) {
      this.cleanup();
    }

    return Promise.resolve(entry.id);
  }

  async retrieve(id: string): Promise<MemoryEntry<T> | undefined> {
    if (this.config.autoCleanup) {
      this.cleanup();
    }

    return Promise.resolve(this.entries.find((entry) => entry.id === id));
  }

  async search(query: MemoryQuery): Promise<readonly MemoryEntry<T>[]> {
    if (this.config.autoCleanup) {
      this.cleanup();
    }

    let results = [...this.entries];

    // Filter by time range
    if (query.timeRange) {
      results = MemoryHelpers.filterByTimeRange(results, query.timeRange.from, query.timeRange.to);
    }

    // Filter by importance
    if (query.minImportance !== undefined) {
      results = MemoryHelpers.filterByImportance(results, query.minImportance);
    }

    // Filter by metadata
    if (query.metadata) {
      results = results.filter((entry) => {
        if (!entry.metadata) return false;
        return Object.entries(query.metadata!).every(
          ([key, value]) => entry.metadata![key] === value
        );
      });
    }

    // Sort by recency
    results = MemoryHelpers.sortByRecency(results);

    // Apply limit
    if (query.limit !== undefined) {
      results = results.slice(0, query.limit);
    }

    return Promise.resolve(results);
  }

  async getAll(limit?: number): Promise<readonly MemoryEntry<T>[]> {
    if (this.config.autoCleanup) {
      this.cleanup();
    }

    const sorted = MemoryHelpers.sortByRecency(this.entries);
    return Promise.resolve(limit !== undefined ? sorted.slice(0, limit) : sorted);
  }

  async getRecent(count: number): Promise<readonly MemoryEntry<T>[]> {
    return this.getAll(count);
  }

  async getImportant(count: number): Promise<readonly MemoryEntry<T>[]> {
    if (this.config.autoCleanup) {
      this.cleanup();
    }

    const sorted = MemoryHelpers.sortByImportance(this.entries);
    return Promise.resolve(sorted.slice(0, count));
  }

  async delete(id: string): Promise<boolean> {
    const initialLength = this.entries.length;
    this.entries = this.entries.filter((entry) => entry.id !== id);
    return Promise.resolve(this.entries.length < initialLength);
  }

  async clear(): Promise<void> {
    this.entries = [];
    return Promise.resolve();
  }

  async size(): Promise<number> {
    if (this.config.autoCleanup) {
      this.cleanup();
    }

    return Promise.resolve(this.entries.length);
  }

  /**
   * Remove expired and excess entries.
   */
  private cleanup(): void {
    const now = Date.now();

    // Remove expired entries
    if (this.config.maxAgeMs !== Infinity) {
      this.entries = this.entries.filter(
        (entry) => now - entry.timestamp.getTime() < this.config.maxAgeMs
      );
    }

    // Remove excess entries (keep most recent)
    if (this.entries.length > this.config.maxEntries) {
      const sorted = MemoryHelpers.sortByRecency(this.entries);
      this.entries = sorted.slice(0, this.config.maxEntries);
    }
  }

  /**
   * Get memory statistics.
   */
  getStats(): {
    totalEntries: number;
    oldestEntry?: Date;
    newestEntry?: Date;
    averageImportance: number;
  } {
    if (this.config.autoCleanup) {
      this.cleanup();
    }

    const totalEntries = this.entries.length;

    if (totalEntries === 0) {
      return {
        totalEntries: 0,
        averageImportance: 0
      };
    }

    const sorted = MemoryHelpers.sortByRecency(this.entries);
    const oldestEntry = sorted[sorted.length - 1]?.timestamp;
    const newestEntry = sorted[0]?.timestamp;

    const sumImportance = this.entries.reduce((sum, entry) => sum + (entry.importance ?? 0), 0);
    const averageImportance = sumImportance / totalEntries;

    return {
      totalEntries,
      oldestEntry,
      newestEntry,
      averageImportance
    };
  }
}
