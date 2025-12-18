import { Result } from '../result/Result.js';

/**
 * Variable definition for prompt templates
 *
 * Defines the type, requirements, and validation for template variables.
 * @category AI Agents
 *
 * @example
 * ```typescript
 * const variable: PromptVariable = {
 *   name: 'userName',
 *   type: 'string',
 *   required: true,
 *   description: 'Name of the user',
 *   validator: (value) => typeof value === 'string' && value.length > 0
 * };
 * ```
 */
export interface PromptVariable {
  /**
   * Variable name used in template
   */
  readonly name: string;

  /**
   * Expected type of the variable
   */
  readonly type: 'string' | 'number' | 'boolean' | 'array' | 'object';

  /**
   * Whether variable is required for rendering
   */
  readonly required: boolean;

  /**
   * Default value if not provided
   */
  readonly default?: unknown;

  /**
   * Human-readable description
   */
  readonly description?: string;

  /**
   * Custom validation function
   */
  readonly validator?: (value: unknown) => boolean;
}

/**
 * Metadata for prompt templates
 *
 * Contains descriptive information and LLM configuration hints.
 */
export interface PromptMetadata {
  /**
   * Description of what this prompt does
   */
  readonly description?: string;

  /**
   * Author or creator
   */
  readonly author?: string;

  /**
   * Tags for categorization and search
   */
  readonly tags?: string[];

  /**
   * Recommended model for this prompt
   */
  readonly model?: string;

  /**
   * Recommended max tokens
   */
  readonly maxTokens?: number;

  /**
   * Recommended temperature
   */
  readonly temperature?: number;

  /**
   * Creation timestamp
   */
  readonly createdAt: Date;

  /**
   * Last update timestamp
   */
  readonly updatedAt: Date;

  /**
   * Additional custom metadata
   */
  readonly [key: string]: unknown;
}

/**
 * Validation result for prompt variables
 */
export interface PromptValidationResult {
  /**
   * Whether validation passed
   */
  readonly valid: boolean;

  /**
   * Validation errors by variable name
   */
  readonly errors: Record<string, string>;

  /**
   * Missing required variables
   */
  readonly missingRequired: string[];

  /**
   * Variables with type mismatches
   */
  readonly typeMismatches: Record<string, { expected: string; actual: string }>;
}

/**
 * Template for generating prompts with variable substitution
 *
 * Provides a structured way to manage prompt templates with:
 * - Variable substitution
 * - Type validation
 * - Versioning
 * - Metadata
 *
 * @example
 * ```typescript
 * const template: PromptTemplate = {
 *   id: 'customer-support-greeting',
 *   name: 'Customer Support Greeting',
 *   version: '1.0.0',
 *   template: 'Hello {{userName}}, how can I help you with {{topic}} today?',
 *   variables: [
 *     { name: 'userName', type: 'string', required: true },
 *     { name: 'topic', type: 'string', required: true }
 *   ],
 *   metadata: {
 *     description: 'Friendly greeting for customer support',
 *     tags: ['support', 'greeting'],
 *     createdAt: new Date(),
 *     updatedAt: new Date()
 *   },
 *   render: (vars) => {...},
 *   validate: (vars) => {...}
 * };
 *
 * const result = template.render({ userName: 'Alice', topic: 'billing' });
 * // "Hello Alice, how can I help you with billing today?"
 * ```
 */
export interface PromptTemplate {
  /**
   * Unique identifier for this prompt
   */
  readonly id: string;

  /**
   * Human-readable name
   */
  readonly name: string;

  /**
   * Semantic version
   */
  readonly version: string;

  /**
   * Template string with variable placeholders
   */
  readonly template: string;

  /**
   * Variable definitions
   */
  readonly variables: PromptVariable[];

  /**
   * Metadata about this prompt
   */
  readonly metadata: PromptMetadata;

  /**
   * Render template with provided variables
   *
   * @param variables - Variable values to substitute
   * @returns Rendered prompt string
   */
  render(variables: Record<string, unknown>): Result<string, Error>;

  /**
   * Validate variables before rendering
   *
   * Checks that:
   * - All required variables are present
   * - Variable types match definitions
   * - Custom validators pass
   *
   * @param variables - Variable values to validate
   * @returns Validation result
   */
  validate(variables: Record<string, unknown>): PromptValidationResult;
}

/**
 * Registry for managing prompt templates
 *
 * Provides centralized storage and retrieval of prompt templates with:
 * - Version management
 * - Tag-based search
 * - Bulk loading from files/directories
 *
 * @example
 * ```typescript
 * const registry: PromptRegistry = new InMemoryPromptRegistry();
 *
 * // Register a template
 * registry.register(template);
 *
 * // Get specific version
 * const v1 = registry.get('customer-support-greeting', '1.0.0');
 *
 * // Get latest version
 * const latest = registry.getLatest('customer-support-greeting');
 *
 * // Search by tags
 * const supportPrompts = registry.findByTags(['support']);
 * ```
 */
export interface PromptRegistry {
  /**
   * Register a prompt template
   *
   * If a template with same id and version exists, it will be replaced.
   *
   * @param template - Template to register
   */
  register(template: PromptTemplate): void;

  /**
   * Get prompt by ID and optional version
   *
   * @param id - Prompt identifier
   * @param version - Specific version (defaults to latest)
   * @returns Template if found
   */
  get(id: string, version?: string): PromptTemplate | undefined;

  /**
   * Get latest version of a prompt
   *
   * @param id - Prompt identifier
   * @returns Latest template version if found
   */
  getLatest(id: string): PromptTemplate | undefined;

  /**
   * List all registered prompts
   *
   * @returns Array of all templates
   */
  list(): PromptTemplate[];

  /**
   * Search prompts by tags
   *
   * @param tags - Tags to search for (matches ANY tag)
   * @returns Templates matching at least one tag
   */
  findByTags(tags: string[]): PromptTemplate[];

  /**
   * Search prompts by model recommendation
   *
   * @param model - Model name to search for
   * @returns Templates recommended for this model
   */
  findByModel(model: string): PromptTemplate[];

  /**
   * Check if prompt exists
   *
   * @param id - Prompt identifier
   * @param version - Specific version (optional)
   * @returns True if exists
   */
  has(id: string, version?: string): boolean;

  /**
   * Remove a prompt
   *
   * @param id - Prompt identifier
   * @param version - Specific version (removes all versions if not specified)
   * @returns True if removed
   */
  remove(id: string, version?: string): boolean;

  /**
   * Get all versions of a prompt
   *
   * @param id - Prompt identifier
   * @returns Array of all versions, sorted newest first
   */
  getVersions(id: string): PromptTemplate[];

  /**
   * Clear all registered prompts
   */
  clear(): void;
}

/**
 * Loader for prompt templates from external sources
 *
 * Enables loading prompts from YAML files, directories, or other formats.
 */
export interface PromptLoader {
  /**
   * Load prompt from YAML content
   *
   * @param content - YAML string
   * @returns Parsed template
   */
  loadFromYAML(content: string): Result<PromptTemplate, Error>;

  /**
   * Load prompts from directory
   *
   * Recursively loads all .yaml and .yml files from directory.
   *
   * @param path - Directory path
   * @returns Array of loaded templates
   */
  loadFromDirectory(path: string): Promise<Result<PromptTemplate[], Error>>;

  /**
   * Load prompt from JSON content
   *
   * @param content - JSON string
   * @returns Parsed template
   */
  loadFromJSON(content: string): Result<PromptTemplate, Error>;
}
