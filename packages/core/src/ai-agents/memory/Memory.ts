/**
 * Memory entry with metadata.
 */
export interface MemoryEntry<T = unknown> {
  /**
   * Unique identifier for this entry.
   */
  readonly id: string;

  /**
   * Entry content/data.
   */
  readonly content: T;

  /**
   * When this entry was created.
   */
  readonly timestamp: Date;

  /**
   * Importance score (0-1).
   * Higher scores indicate more important memories.
   */
  readonly importance?: number;

  /**
   * Additional metadata.
   */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Memory query for searching/filtering.
 */
export interface MemoryQuery {
  /**
   * Maximum number of results.
   */
  readonly limit?: number;

  /**
   * Minimum importance score.
   */
  readonly minImportance?: number;

  /**
   * Time range filter.
   */
  readonly timeRange?: {
    readonly from?: Date;
    readonly to?: Date;
  };

  /**
   * Metadata filters.
   */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Base interface for all memory systems.
 *
 * Memory systems store and retrieve information for AI agents.
 */
export interface Memory<T = unknown> {
  /**
   * Store a memory entry.
   *
   * @param content - Content to store
   * @param importance - Importance score (0-1)
   * @param metadata - Additional metadata
   * @returns ID of the stored entry
   */
  store(
    content: T,
    importance?: number,
    metadata?: Record<string, unknown>
  ): Promise<string>;

  /**
   * Retrieve a memory entry by ID.
   *
   * @param id - Entry ID
   * @returns Memory entry or undefined if not found
   */
  retrieve(id: string): Promise<MemoryEntry<T> | undefined>;

  /**
   * Search for memory entries.
   *
   * @param query - Search query
   * @returns Matching entries
   */
  search(query: MemoryQuery): Promise<readonly MemoryEntry<T>[]>;

  /**
   * Get all memory entries.
   *
   * @param limit - Maximum number of entries
   * @returns All entries (most recent first)
   */
  getAll(limit?: number): Promise<readonly MemoryEntry<T>[]>;

  /**
   * Get the most recent entries.
   *
   * @param count - Number of entries to retrieve
   * @returns Recent entries
   */
  getRecent(count: number): Promise<readonly MemoryEntry<T>[]>;

  /**
   * Get the most important entries.
   *
   * @param count - Number of entries to retrieve
   * @returns Important entries
   */
  getImportant(count: number): Promise<readonly MemoryEntry<T>[]>;

  /**
   * Delete a memory entry.
   *
   * @param id - Entry ID
   * @returns True if deleted
   */
  delete(id: string): Promise<boolean>;

  /**
   * Clear all memory entries.
   */
  clear(): Promise<void>;

  /**
   * Get the number of stored entries.
   */
  size(): Promise<number>;
}

/**
 * Helper functions for working with memory entries.
 */
export const MemoryHelpers = {
  /**
   * Create a memory entry.
   */
  createEntry<T>(
    id: string,
    content: T,
    importance?: number,
    metadata?: Record<string, unknown>
  ): MemoryEntry<T> {
    return {
      id,
      content,
      timestamp: new Date(),
      importance,
      metadata,
    };
  },

  /**
   * Generate a unique ID for a memory entry.
   */
  generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Sort entries by timestamp (most recent first).
   */
  sortByRecency<T>(entries: readonly MemoryEntry<T>[]): MemoryEntry<T>[] {
    return [...entries].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  },

  /**
   * Sort entries by importance (highest first).
   */
  sortByImportance<T>(entries: readonly MemoryEntry<T>[]): MemoryEntry<T>[] {
    return [...entries].sort((a, b) => {
      const importanceA = a.importance ?? 0;
      const importanceB = b.importance ?? 0;
      return importanceB - importanceA;
    });
  },

  /**
   * Filter entries by time range.
   */
  filterByTimeRange<T>(
    entries: readonly MemoryEntry<T>[],
    from?: Date,
    to?: Date
  ): MemoryEntry<T>[] {
    return entries.filter((entry) => {
      if (from && entry.timestamp < from) {
        return false;
      }
      if (to && entry.timestamp > to) {
        return false;
      }
      return true;
    });
  },

  /**
   * Filter entries by minimum importance.
   */
  filterByImportance<T>(
    entries: readonly MemoryEntry<T>[],
    minImportance: number
  ): MemoryEntry<T>[] {
    return entries.filter(
      (entry) => (entry.importance ?? 0) >= minImportance
    );
  },

  /**
   * Calculate relevance score based on recency and importance.
   *
   * @param entry - Memory entry
   * @param recencyWeight - Weight for recency (0-1), default 0.5
   * @returns Relevance score (0-1)
   */
  calculateRelevance<T>(
    entry: MemoryEntry<T>,
    recencyWeight = 0.5
  ): number {
    // Recency score: exponential decay
    const ageMs = Date.now() - entry.timestamp.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const recencyScore = Math.exp(-ageDays / 7); // Half-life of 7 days

    // Importance score
    const importanceScore = entry.importance ?? 0.5;

    // Weighted combination
    return recencyWeight * recencyScore + (1 - recencyWeight) * importanceScore;
  },
};
