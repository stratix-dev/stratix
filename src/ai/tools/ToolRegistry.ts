import type { Tool, ToolResult, ToolContext } from './Tool.js';
import type { ToolDefinition } from '../llm/LLMProvider.js';

/**
 * Error thrown when a tool is not found.
 */
export class ToolNotFoundError extends Error {
  constructor(public readonly toolName: string) {
    super(`Tool not found: ${toolName}`);
    this.name = 'ToolNotFoundError';
  }
}

/**
 * Error thrown when a tool name conflicts.
 */
export class ToolConflictError extends Error {
  constructor(public readonly toolName: string) {
    super(`Tool already registered: ${toolName}`);
    this.name = 'ToolConflictError';
  }
}

/**
 * Registry for managing available tools.
 *
 * Provides tool discovery, registration, and retrieval.
 *
 * @example
 * ```TypeScript
 * const registry = new ToolRegistry();
 *
 * // Register tools
 * registry.register(new WeatherTool());
 * registry.register(new CalculatorTool());
 *
 * // Get tool definitions for LLM
 * const definitions = registry.getDefinitions();
 *
 * // Execute a tool
 * const result = await registry.execute('get_weather', { location: 'London' }, context);
 * ```
 */
export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  /**
   * Register a tool.
   *
   * @param tool - Tool to register
   * @throws ToolConflictError if tool name already exists
   */
  register(tool: Tool): this {
    if (this.tools.has(tool.name)) {
      throw new ToolConflictError(tool.name);
    }
    this.tools.set(tool.name, tool);
    return this;
  }

  /**
   * Register multiple tools.
   */
  registerAll(tools: readonly Tool[]): this {
    for (const tool of tools) {
      this.register(tool);
    }
    return this;
  }

  /**
   * Register a tool, replacing if it exists.
   */
  registerOrReplace(tool: Tool): this {
    this.tools.set(tool.name, tool);
    return this;
  }

  /**
   * Unregister a tool by name.
   *
   * @param name - Tool name
   * @returns True if tool was removed
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Clear all registered tools.
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * Check if a tool is registered.
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get a tool by name.
   *
   * @throws ToolNotFoundError if tool doesn't exist
   */
  get(name: string): Tool {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new ToolNotFoundError(name);
    }
    return tool;
  }

  /**
   * Try to get a tool by name.
   * Returns undefined if not found.
   */
  tryGet(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools.
   */
  getAll(): readonly Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get all tool names.
   */
  getNames(): readonly string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get tool definitions for LLM function calling.
   */
  getDefinitions(): readonly ToolDefinition[] {
    return this.getAll().map((tool) => tool.getDefinition());
  }

  /**
   * Get definitions for specific tools.
   */
  getDefinitionsFor(names: readonly string[]): readonly ToolDefinition[] {
    return names
      .map((name) => this.tryGet(name))
      .filter((tool): tool is Tool => tool !== undefined)
      .map((tool) => tool.getDefinition());
  }

  /**
   * Execute a tool by name.
   *
   * @param name - Tool name
   * @param params - Tool parameters
   * @param context - Execution context
   * @returns Tool execution result
   * @throws ToolNotFoundError if tool doesn't exist
   */
  async execute(name: string, params: unknown, context: ToolContext): Promise<ToolResult> {
    const tool = this.get(name);
    return tool.executeValidated(params, context);
  }

  /**
   * Execute multiple tools in parallel.
   */
  async executeMany(
    calls: readonly { name: string; params: unknown }[],
    context: ToolContext
  ): Promise<readonly ToolResult[]> {
    const promises = calls.map((call) => this.execute(call.name, call.params, context));
    return Promise.all(promises);
  }

  /**
   * Get number of registered tools.
   */
  get size(): number {
    return this.tools.size;
  }

  /**
   * Check if registry is empty.
   */
  get isEmpty(): boolean {
    return this.tools.size === 0;
  }

  /**
   * Find tools matching a predicate.
   */
  find(predicate: (tool: Tool) => boolean): readonly Tool[] {
    return this.getAll().filter(predicate);
  }

  /**
   * Find tools by description substring.
   */
  findByDescription(search: string): readonly Tool[] {
    const searchLower = search.toLowerCase();
    return this.find((tool) => tool.description.toLowerCase().includes(searchLower));
  }

  /**
   * Find tools by name pattern.
   */
  findByNamePattern(pattern: RegExp): readonly Tool[] {
    return this.find((tool) => pattern.test(tool.name));
  }

  /**
   * Clone the registry.
   */
  clone(): ToolRegistry {
    const cloned = new ToolRegistry();
    for (const tool of this.tools.values()) {
      cloned.tools.set(tool.name, tool);
    }
    return cloned;
  }

  /**
   * Merge another registry into this one.
   *
   * @param other - Registry to merge
   * @param overwrite - Whether to overwrite existing tools
   */
  merge(other: ToolRegistry, overwrite = false): this {
    for (const tool of other.getAll()) {
      if (overwrite || !this.has(tool.name)) {
        this.tools.set(tool.name, tool);
      }
    }
    return this;
  }

  /**
   * Create a subset registry with specific tools.
   */
  subset(names: readonly string[]): ToolRegistry {
    const subset = new ToolRegistry();
    for (const name of names) {
      const tool = this.tryGet(name);
      if (tool) {
        subset.register(tool);
      }
    }
    return subset;
  }

  /**
   * JSON representation.
   */
  toJSON() {
    return {
      tools: this.getAll().map((tool) => tool.toJSON()),
      size: this.size
    };
  }

  /**
   * String representation.
   */
  toString(): string {
    return `ToolRegistry(${this.size} tools)`;
  }
}
