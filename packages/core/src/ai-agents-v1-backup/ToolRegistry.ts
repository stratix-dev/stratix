import type { AgentTool, ToolDefinition } from './AgentTool.js';

/**
 * Metadata for a registered tool
 */
export interface ToolMetadata {
  readonly name: string;
  readonly description: string;
  readonly category?: string;
  readonly tags?: string[];
  readonly version?: string;
  readonly requiresApproval: boolean;
}

/**
 * Result of searching for tools
 */
export interface ToolSearchResult {
  readonly tool: AgentTool<unknown, unknown>;
  readonly metadata: ToolMetadata;
  readonly score: number;
}

/**
 * Options for searching tools
 */
export interface ToolSearchOptions {
  readonly query?: string;
  readonly category?: string;
  readonly tags?: string[];
  readonly requiresApproval?: boolean;
  readonly limit?: number;
}

/**
 * Registry for managing and discovering AI agent tools.
 *
 * Provides centralized management of tools that agents can use,
 * including registration, discovery, and metadata management.
 *
 * @example
 * ```typescript
 * const registry = new InMemoryToolRegistry();
 *
 * // Register a tool
 * await registry.register(new SearchKnowledgeBaseTool(), {
 *   category: 'knowledge',
 *   tags: ['search', 'documentation'],
 *   version: '1.0.0'
 * });
 *
 * // Get tool by name
 * const tool = await registry.get('search_knowledge_base');
 *
 * // Search for tools
 * const results = await registry.search({
 *   query: 'search',
 *   category: 'knowledge'
 * });
 *
 * // List all available tools
 * const allTools = await registry.listAll();
 * ```
 */
export interface ToolRegistry {
  /**
   * Register a tool in the registry
   *
   * @param tool - The tool to register
   * @param metadata - Optional metadata for the tool
   * @throws {Error} If a tool with the same name already exists
   */
  register(
    tool: AgentTool<unknown, unknown>,
    metadata?: Partial<ToolMetadata>
  ): Promise<void>;

  /**
   * Unregister a tool by name
   *
   * @param name - The tool name
   * @returns true if tool was removed, false if not found
   */
  unregister(name: string): Promise<boolean>;

  /**
   * Get a tool by name
   *
   * @param name - The tool name
   * @returns The tool, or null if not found
   */
  get(name: string): Promise<AgentTool<unknown, unknown> | null>;

  /**
   * Check if a tool is registered
   *
   * @param name - The tool name
   * @returns true if registered
   */
  has(name: string): Promise<boolean>;

  /**
   * List all registered tools
   *
   * @returns Array of all registered tools
   */
  listAll(): Promise<AgentTool<unknown, unknown>[]>;

  /**
   * Get metadata for a tool
   *
   * @param name - The tool name
   * @returns Tool metadata, or null if not found
   */
  getMetadata(name: string): Promise<ToolMetadata | null>;

  /**
   * Search for tools matching criteria
   *
   * @param options - Search options
   * @returns Array of matching tools with scores
   */
  search(options: ToolSearchOptions): Promise<ToolSearchResult[]>;

  /**
   * Get tool definitions for LLM function calling
   *
   * @param names - Optional array of tool names to include (all if not specified)
   * @returns Array of tool definitions
   */
  getDefinitions(names?: string[]): Promise<ToolDefinition[]>;

  /**
   * List all categories
   *
   * @returns Array of unique categories
   */
  listCategories(): Promise<string[]>;

  /**
   * List all tags
   *
   * @returns Array of unique tags
   */
  listTags(): Promise<string[]>;

  /**
   * Get tools by category
   *
   * @param category - The category name
   * @returns Array of tools in the category
   */
  getByCategory(category: string): Promise<AgentTool<unknown, unknown>[]>;

  /**
   * Get tools by tag
   *
   * @param tag - The tag name
   * @returns Array of tools with the tag
   */
  getByTag(tag: string): Promise<AgentTool<unknown, unknown>[]>;

  /**
   * Clear all registered tools
   */
  clear(): Promise<void>;

  /**
   * Get count of registered tools
   *
   * @returns Number of tools
   */
  count(): Promise<number>;
}
