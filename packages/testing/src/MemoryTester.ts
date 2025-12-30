import type { Memory, MemoryEntry, MemoryQuery } from '@stratix/core/ai-agents';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Entry data for populating test memory.
 */
export interface TestMemoryEntry<T> {
  /**
   * Entry content.
   */
  readonly content: T;

  /**
   * Importance score (0-1).
   */
  readonly importance?: number;

  /**
   * Additional metadata.
   */
  readonly metadata?: Record<string, unknown>;
}

// ============================================================================
// MemoryTester Class
// ============================================================================

/**
 * Test harness for memory implementations.
 *
 * Provides utilities for testing memory systems:
 * - Populate with test data
 * - Assert size and contents
 * - Test search functionality
 * - Verify ordering
 *
 * @template T - Memory content type
 *
 * @example
 * ```typescript
 * describe('ShortTermMemory', () => {
 *   let memory: Memory<string>;
 *   let tester: MemoryTester<string>;
 *
 *   beforeEach(() => {
 *     memory = new ShortTermMemory();
 *     tester = new MemoryTester(memory);
 *   });
 *
 *   it('should store and retrieve entries', async () => {
 *     const ids = await tester.populate([
 *       { content: 'First memory', importance: 0.8 },
 *       { content: 'Second memory', importance: 0.5 }
 *     ]);
 *
 *     await tester.expectSize(2);
 *     await tester.expectContains(ids[0]);
 *     await tester.expectImportant(1, 0.7); // At least 1 entry with importance >= 0.7
 *   });
 * });
 * ```
 */
export class MemoryTester<T = unknown> {
  /**
   * Create a new MemoryTester.
   *
   * @param memory - The memory implementation to test
   */
  constructor(private readonly memory: Memory<T>) {}

  // === Population Methods ===

  /**
   * Populate memory with test entries.
   *
   * @param entries - Test entries to store
   * @returns Array of entry IDs
   *
   * @example
   * ```typescript
   * const ids = await tester.populate([
   *   { content: 'Memory 1', importance: 0.9 },
   *   { content: 'Memory 2', importance: 0.5, metadata: { type: 'note' } }
   * ]);
   * ```
   */
  async populate(entries: TestMemoryEntry<T>[]): Promise<string[]> {
    const ids: string[] = [];

    for (const entry of entries) {
      const id = await this.memory.store(
        entry.content,
        entry.importance,
        entry.metadata
      );
      ids.push(id);
    }

    return ids;
  }

  /**
   * Populate memory with simple content values.
   * All entries get default importance (0.5).
   *
   * @param contents - Content values to store
   * @returns Array of entry IDs
   *
   * @example
   * ```typescript
   * const ids = await tester.populateSimple(['Memory 1', 'Memory 2', 'Memory 3']);
   * ```
   */
  async populateSimple(contents: T[]): Promise<string[]> {
    const entries = contents.map((content) => ({ content }));
    return this.populate(entries);
  }

  // === Size Assertions ===

  /**
   * Assert that memory has a specific size.
   *
   * @param expected - Expected number of entries
   * @throws {Error} If size doesn't match
   *
   * @example
   * ```typescript
   * await tester.expectSize(5);
   * ```
   */
  async expectSize(expected: number): Promise<void> {
    const actual = await this.memory.size();

    if (actual !== expected) {
      throw new Error(`Expected memory size ${expected} but got ${actual}`);
    }
  }

  /**
   * Assert that memory is empty.
   *
   * @throws {Error} If memory is not empty
   *
   * @example
   * ```typescript
   * await tester.expectEmpty();
   * ```
   */
  async expectEmpty(): Promise<void> {
    await this.expectSize(0);
  }

  /**
   * Assert that memory is not empty.
   *
   * @throws {Error} If memory is empty
   *
   * @example
   * ```typescript
   * await tester.expectNotEmpty();
   * ```
   */
  async expectNotEmpty(): Promise<void> {
    const size = await this.memory.size();

    if (size === 0) {
      throw new Error('Expected memory to not be empty but it is');
    }
  }

  // === Content Assertions ===

  /**
   * Assert that memory contains an entry with the given ID.
   *
   * @param id - Entry ID to check
   * @throws {Error} If entry doesn't exist
   *
   * @example
   * ```typescript
   * await tester.expectContains(entryId);
   * ```
   */
  async expectContains(id: string): Promise<void> {
    const entry = await this.memory.retrieve(id);

    if (!entry) {
      throw new Error(`Expected memory to contain entry '${id}' but it doesn't exist`);
    }
  }

  /**
   * Assert that memory does not contain an entry with the given ID.
   *
   * @param id - Entry ID to check
   * @throws {Error} If entry exists
   *
   * @example
   * ```typescript
   * await tester.expectNotContains(deletedId);
   * ```
   */
  async expectNotContains(id: string): Promise<void> {
    const entry = await this.memory.retrieve(id);

    if (entry) {
      throw new Error(`Expected memory to not contain entry '${id}' but it exists`);
    }
  }

  /**
   * Assert that the most recent entries match expected IDs.
   *
   * @param count - Number of recent entries to check
   * @param expectedIds - Expected entry IDs (in order, most recent first)
   * @throws {Error} If recent entries don't match
   *
   * @example
   * ```typescript
   * await tester.expectRecent(3, [id3, id2, id1]);
   * ```
   */
  async expectRecent(count: number, expectedIds: string[]): Promise<void> {
    const recent = await this.memory.getRecent(count);

    if (recent.length !== expectedIds.length) {
      throw new Error(
        `Expected ${expectedIds.length} recent entries but got ${recent.length}`
      );
    }

    for (let i = 0; i < expectedIds.length; i++) {
      if (recent[i].id !== expectedIds[i]) {
        throw new Error(
          `Expected recent entry ${i} to be '${expectedIds[i]}' but got '${recent[i].id}'`
        );
      }
    }
  }

  /**
   * Assert that there are at least N important entries above a threshold.
   *
   * @param count - Minimum number of important entries
   * @param minImportance - Minimum importance score
   * @throws {Error} If not enough important entries
   *
   * @example
   * ```typescript
   * await tester.expectImportant(3, 0.8); // At least 3 entries with importance >= 0.8
   * ```
   */
  async expectImportant(count: number, minImportance: number): Promise<void> {
    const important = await this.memory.getImportant(count);

    // Check we got at least the requested count
    if (important.length < count) {
      throw new Error(
        `Expected at least ${count} important entries but got ${important.length}`
      );
    }

    // Check all returned entries meet the minimum importance
    const belowThreshold = important.filter(
      (entry) => (entry.importance ?? 0) < minImportance
    );

    if (belowThreshold.length > 0) {
      throw new Error(
        `Expected all important entries to have importance >= ${minImportance}, ` +
        `but ${belowThreshold.length} entries were below threshold`
      );
    }
  }

  // === Search Assertions ===

  /**
   * Assert that a search query returns a specific number of results.
   *
   * @param query - Search query
   * @param expectedCount - Expected number of results
   * @throws {Error} If result count doesn't match
   *
   * @example
   * ```typescript
   * await tester.expectSearchResults(
   *   { minImportance: 0.7, limit: 5 },
   *   3
   * );
   * ```
   */
  async expectSearchResults(query: MemoryQuery, expectedCount: number): Promise<void> {
    const results = await this.memory.search(query);

    if (results.length !== expectedCount) {
      throw new Error(
        `Expected search to return ${expectedCount} results but got ${results.length}`
      );
    }
  }

  /**
   * Assert that a search query returns at least a specific number of results.
   *
   * @param query - Search query
   * @param minCount - Minimum number of results
   * @throws {Error} If result count is below minimum
   *
   * @example
   * ```typescript
   * await tester.expectSearchResultsAtLeast({ minImportance: 0.5 }, 2);
   * ```
   */
  async expectSearchResultsAtLeast(query: MemoryQuery, minCount: number): Promise<void> {
    const results = await this.memory.search(query);

    if (results.length < minCount) {
      throw new Error(
        `Expected search to return at least ${minCount} results but got ${results.length}`
      );
    }
  }

  /**
   * Assert that a search query returns an entry with the given ID.
   *
   * @param query - Search query
   * @param id - Expected entry ID
   * @throws {Error} If entry is not in search results
   *
   * @example
   * ```typescript
   * await tester.expectSearchContains({ minImportance: 0.8 }, importantEntryId);
   * ```
   */
  async expectSearchContains(query: MemoryQuery, id: string): Promise<void> {
    const results = await this.memory.search(query);
    const found = results.some((entry) => entry.id === id);

    if (!found) {
      throw new Error(
        `Expected search results to contain entry '${id}' but it was not found`
      );
    }
  }

  // === Utility Methods ===

  /**
   * Get the memory instance being tested.
   *
   * @returns The memory implementation
   */
  getMemory(): Memory<T> {
    return this.memory;
  }

  /**
   * Clear the memory.
   * Convenience method for memory.clear().
   */
  async clear(): Promise<void> {
    await this.memory.clear();
  }

  /**
   * Get current size.
   * Convenience method for memory.size().
   */
  async size(): Promise<number> {
    return this.memory.size();
  }

  /**
   * Retrieve an entry.
   * Convenience method for memory.retrieve().
   */
  async retrieve(id: string): Promise<MemoryEntry<T> | undefined> {
    return this.memory.retrieve(id);
  }
}

// ============================================================================
// Factory Helpers
// ============================================================================

/**
 * Create a test memory entry.
 *
 * @param content - Entry content
 * @param importance - Importance score (0-1)
 * @param metadata - Additional metadata
 * @returns Test memory entry
 *
 * @example
 * ```typescript
 * const entry = createTestMemoryEntry('Important memory', 0.9, { type: 'note' });
 * ```
 */
export function createTestMemoryEntry<T>(
  content: T,
  importance?: number,
  metadata?: Record<string, unknown>
): TestMemoryEntry<T> {
  return {
    content,
    importance: importance ?? 0.5,
    metadata: metadata ?? {},
  };
}

/**
 * Create multiple test memory entries with sequential content.
 *
 * @param count - Number of entries to create
 * @param contentPrefix - Prefix for content (will be appended with number)
 * @param importance - Importance score for all entries
 * @returns Array of test memory entries
 *
 * @example
 * ```typescript
 * const entries = createTestMemoryEntries(5, 'Memory', 0.7);
 * // Creates: ['Memory 1', 'Memory 2', 'Memory 3', 'Memory 4', 'Memory 5']
 * ```
 */
export function createTestMemoryEntries(
  count: number,
  contentPrefix: string,
  importance?: number
): TestMemoryEntry<string>[] {
  const entries: TestMemoryEntry<string>[] = [];

  for (let i = 1; i <= count; i++) {
    entries.push({
      content: `${contentPrefix} ${i}`,
      importance: importance ?? 0.5,
      metadata: { index: i },
    });
  }

  return entries;
}

/**
 * Create test memory entries with varying importance.
 *
 * @param count - Number of entries to create
 * @param contentPrefix - Prefix for content
 * @returns Array of test memory entries with importance 0.1 to 1.0
 *
 * @example
 * ```typescript
 * const entries = createTestMemoryEntriesWithVaryingImportance(10, 'Memory');
 * // Creates 10 entries with importance from 0.1 to 1.0
 * ```
 */
export function createTestMemoryEntriesWithVaryingImportance(
  count: number,
  contentPrefix: string
): TestMemoryEntry<string>[] {
  const entries: TestMemoryEntry<string>[] = [];

  for (let i = 0; i < count; i++) {
    const importance = (i + 1) / count; // 0.1 to 1.0

    entries.push({
      content: `${contentPrefix} ${i + 1}`,
      importance,
      metadata: { index: i + 1, importance },
    });
  }

  return entries;
}
