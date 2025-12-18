import type { PromptTemplate, PromptRegistry } from '@stratix/core/ai-agents';

/**
 * In-memory implementation of PromptRegistry
 *
 * Stores templates in memory with:
 * - Version management
 * - Tag-based search
 * - Model filtering
 *
 * Suitable for development, testing, and applications that don't need persistence.
 *
 * @example
 * ```typescript
 * const registry = new InMemoryPromptRegistry();
 *
 * registry.register(template1);
 * registry.register(template2);
 *
 * const latest = registry.getLatest('customer-greeting');
 * const supportPrompts = registry.findByTags(['support']);
 * const gpt4Prompts = registry.findByModel('gpt-4');
 * ```
 */
export class InMemoryPromptRegistry implements PromptRegistry {
  /**
   * Map of prompt ID to versions map (version -> template)
   */
  private readonly prompts: Map<string, Map<string, PromptTemplate>>;

  constructor() {
    this.prompts = new Map();
  }

  /**
   * Register a prompt template
   */
  register(template: PromptTemplate): void {
    if (!this.prompts.has(template.id)) {
      this.prompts.set(template.id, new Map());
    }

    const versions = this.prompts.get(template.id)!;
    versions.set(template.version, template);
  }

  /**
   * Get prompt by ID and optional version
   */
  get(id: string, version?: string): PromptTemplate | undefined {
    const versions = this.prompts.get(id);
    if (!versions) return undefined;

    if (version) {
      return versions.get(version);
    }

    // Return latest version
    return this.getLatest(id);
  }

  /**
   * Get latest version of a prompt
   */
  getLatest(id: string): PromptTemplate | undefined {
    const versions = this.prompts.get(id);
    if (!versions || versions.size === 0) return undefined;

    // Convert to array and sort by version
    const sorted = Array.from(versions.values()).sort((a, b) => {
      return this.compareVersions(b.version, a.version); // Descending
    });

    return sorted[0];
  }

  /**
   * List all registered prompts
   */
  list(): PromptTemplate[] {
    const all: PromptTemplate[] = [];

    for (const versions of this.prompts.values()) {
      for (const template of versions.values()) {
        all.push(template);
      }
    }

    return all;
  }

  /**
   * Search prompts by tags
   */
  findByTags(tags: string[]): PromptTemplate[] {
    const tagSet = new Set(tags.map((t: string) => t.toLowerCase()));
    const results: PromptTemplate[] = [];

    for (const versions of this.prompts.values()) {
      for (const template of versions.values()) {
        const templateTags = new Set(
          (template.metadata.tags || []).map((t) => t.toLowerCase())
        );

        // Check if any tag matches
        for (const tag of tagSet) {
          if (templateTags.has(tag)) {
            results.push(template);
            break;
          }
        }
      }
    }

    return results;
  }

  /**
   * Search prompts by model recommendation
   */
  findByModel(model: string): PromptTemplate[] {
    const modelLower = model.toLowerCase();
    const results: PromptTemplate[] = [];

    for (const versions of this.prompts.values()) {
      for (const template of versions.values()) {
        if (
          template.metadata.model &&
          template.metadata.model.toLowerCase() === modelLower
        ) {
          results.push(template);
        }
      }
    }

    return results;
  }

  /**
   * Check if prompt exists
   */
  has(id: string, version?: string): boolean {
    const versions = this.prompts.get(id);
    if (!versions) return false;

    if (version) {
      return versions.has(version);
    }

    return versions.size > 0;
  }

  /**
   * Remove a prompt
   */
  remove(id: string, version?: string): boolean {
    const versions = this.prompts.get(id);
    if (!versions) return false;

    if (version) {
      const deleted = versions.delete(version);

      // Clean up empty version maps
      if (versions.size === 0) {
        this.prompts.delete(id);
      }

      return deleted;
    }

    // Remove all versions
    this.prompts.delete(id);
    return true;
  }

  /**
   * Get all versions of a prompt
   */
  getVersions(id: string): PromptTemplate[] {
    const versions = this.prompts.get(id);
    if (!versions) return [];

    // Sort by version (newest first)
    return Array.from(versions.values()).sort((a, b) => {
      return this.compareVersions(b.version, a.version);
    });
  }

  /**
   * Clear all registered prompts
   */
  clear(): void {
    this.prompts.clear();
  }

  /**
   * Get number of registered prompts (unique IDs)
   */
  get size(): number {
    return this.prompts.size;
  }

  /**
   * Get total number of prompt versions
   */
  get totalVersions(): number {
    let count = 0;
    for (const versions of this.prompts.values()) {
      count += versions.size;
    }
    return count;
  }

  /**
   * Compare semantic versions
   *
   * Returns:
   * - Positive number if v1 > v2
   * - Negative number if v1 < v2
   * - 0 if equal
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }

    return 0;
  }

  /**
   * Get prompts grouped by ID
   */
  getGrouped(): Map<string, PromptTemplate[]> {
    const grouped = new Map<string, PromptTemplate[]>();

    for (const [id, versions] of this.prompts.entries()) {
      const sorted = Array.from(versions.values()).sort((a, b) => {
        return this.compareVersions(b.version, a.version);
      });
      grouped.set(id, sorted);
    }

    return grouped;
  }

  /**
   * Search prompts by name (case-insensitive partial match)
   */
  searchByName(query: string): PromptTemplate[] {
    const queryLower = query.toLowerCase();
    const results: PromptTemplate[] = [];

    for (const versions of this.prompts.values()) {
      for (const template of versions.values()) {
        if (template.name.toLowerCase().includes(queryLower)) {
          results.push(template);
        }
      }
    }

    return results;
  }

  /**
   * Get statistics about the registry
   */
  getStatistics() {
    const stats = {
      totalPrompts: this.size,
      totalVersions: this.totalVersions,
      averageVersionsPerPrompt:
        this.size > 0 ? this.totalVersions / this.size : 0,
      promptsWithMultipleVersions: 0,
      totalTags: new Set<string>(),
      totalModels: new Set<string>(),
    };

    for (const versions of this.prompts.values()) {
      if (versions.size > 1) {
        stats.promptsWithMultipleVersions++;
      }

      for (const template of versions.values()) {
        // Collect tags
        if (template.metadata.tags) {
          for (const tag of template.metadata.tags) {
            stats.totalTags.add(tag.toLowerCase());
          }
        }

        // Collect models
        if (template.metadata.model) {
          stats.totalModels.add(template.metadata.model.toLowerCase());
        }
      }
    }

    return {
      ...stats,
      totalTags: stats.totalTags.size,
      totalModels: stats.totalModels.size,
      tags: Array.from(stats.totalTags),
      models: Array.from(stats.totalModels),
    };
  }
}
