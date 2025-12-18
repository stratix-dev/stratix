import type {
  AgentTool,
  ToolDefinition,
  ToolRegistry,
  ToolMetadata,
  ToolSearchResult,
  ToolSearchOptions,
} from '@stratix/core';

/**
 * In-memory implementation of ToolRegistry.
 *
 * Provides fast, synchronous tool management with metadata and search capabilities.
 * Suitable for development, testing, and single-instance deployments.
 *
 * @example
 * ```typescript
 * const registry = new InMemoryToolRegistry();
 *
 * // Register tools
 * await registry.register(new SearchTool(), {
 *   category: 'knowledge',
 *   tags: ['search', 'docs'],
 *   version: '1.0.0'
 * });
 *
 * await registry.register(new CalculatorTool(), {
 *   category: 'math',
 *   tags: ['calculator', 'compute']
 * });
 *
 * // Search for tools
 * const results = await registry.search({
 *   query: 'search',
 *   limit: 5
 * });
 *
 * // Get definitions for LLM
 * const definitions = await registry.getDefinitions();
 * ```
 */
export class InMemoryToolRegistry implements ToolRegistry {
  private tools: Map<string, AgentTool<unknown, unknown>> = new Map();
  private metadata: Map<string, ToolMetadata> = new Map();

  async register(
    tool: AgentTool<unknown, unknown>,
    metadata?: Partial<ToolMetadata>
  ): Promise<void> {
    const name = tool.name;

    if (this.tools.has(name)) {
      throw new Error(`Tool '${name}' is already registered`);
    }

    this.tools.set(name, tool);

    const fullMetadata: ToolMetadata = {
      name,
      description: tool.description,
      requiresApproval: tool.requiresApproval,
      category: metadata?.category,
      tags: metadata?.tags || [],
      version: metadata?.version || '1.0.0',
    };

    this.metadata.set(name, fullMetadata);
  }

  async unregister(name: string): Promise<boolean> {
    const existed = this.tools.has(name);
    this.tools.delete(name);
    this.metadata.delete(name);
    return existed;
  }

  async get(name: string): Promise<AgentTool<unknown, unknown> | null> {
    return this.tools.get(name) ?? null;
  }

  async has(name: string): Promise<boolean> {
    return this.tools.has(name);
  }

  async listAll(): Promise<AgentTool<unknown, unknown>[]> {
    return Array.from(this.tools.values());
  }

  async getMetadata(name: string): Promise<ToolMetadata | null> {
    return this.metadata.get(name) ?? null;
  }

  async search(options: ToolSearchOptions): Promise<ToolSearchResult[]> {
    const results: ToolSearchResult[] = [];

    for (const [name, tool] of this.tools.entries()) {
      const meta = this.metadata.get(name)!;

      // Filter by category
      if (options.category && meta.category !== options.category) {
        continue;
      }

      // Filter by requiresApproval
      if (
        options.requiresApproval !== undefined &&
        meta.requiresApproval !== options.requiresApproval
      ) {
        continue;
      }

      // Filter by tags
      if (options.tags && options.tags.length > 0) {
        const hasAllTags = options.tags.every((tag) =>
          meta.tags?.includes(tag)
        );
        if (!hasAllTags) {
          continue;
        }
      }

      // Calculate score based on query match
      let score = 1.0;
      if (options.query) {
        const query = options.query.toLowerCase();
        const nameMatch = meta.name.toLowerCase().includes(query);
        const descMatch = meta.description.toLowerCase().includes(query);
        const tagMatch = meta.tags?.some((tag) =>
          tag.toLowerCase().includes(query)
        );

        if (!nameMatch && !descMatch && !tagMatch) {
          continue; // No match
        }

        // Higher score for name matches
        if (nameMatch) score += 2.0;
        if (descMatch) score += 1.0;
        if (tagMatch) score += 0.5;
      }

      results.push({
        tool,
        metadata: meta,
        score,
      });
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Apply limit
    if (options.limit && options.limit > 0) {
      return results.slice(0, options.limit);
    }

    return results;
  }

  async getDefinitions(names?: string[]): Promise<ToolDefinition[]> {
    const toolsToInclude = names
      ? names
          .map((name) => this.tools.get(name))
          .filter((tool): tool is AgentTool<unknown, unknown> => tool !== undefined)
      : Array.from(this.tools.values());

    return toolsToInclude.map((tool) => tool.getDefinition());
  }

  async listCategories(): Promise<string[]> {
    const categories = new Set<string>();
    for (const meta of this.metadata.values()) {
      if (meta.category) {
        categories.add(meta.category);
      }
    }
    return Array.from(categories).sort();
  }

  async listTags(): Promise<string[]> {
    const tags = new Set<string>();
    for (const meta of this.metadata.values()) {
      if (meta.tags) {
        meta.tags.forEach((tag) => tags.add(tag));
      }
    }
    return Array.from(tags).sort();
  }

  async getByCategory(category: string): Promise<AgentTool<unknown, unknown>[]> {
    const results: AgentTool<unknown, unknown>[] = [];
    for (const [name, tool] of this.tools.entries()) {
      const meta = this.metadata.get(name)!;
      if (meta.category === category) {
        results.push(tool);
      }
    }
    return results;
  }

  async getByTag(tag: string): Promise<AgentTool<unknown, unknown>[]> {
    const results: AgentTool<unknown, unknown>[] = [];
    for (const [name, tool] of this.tools.entries()) {
      const meta = this.metadata.get(name)!;
      if (meta.tags?.includes(tag)) {
        results.push(tool);
      }
    }
    return results;
  }

  async clear(): Promise<void> {
    this.tools.clear();
    this.metadata.clear();
  }

  async count(): Promise<number> {
    return this.tools.size;
  }
}
