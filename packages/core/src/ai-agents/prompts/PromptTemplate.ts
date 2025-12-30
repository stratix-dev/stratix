import type { PromptVariable, PromptVariables } from './PromptVariable.js';
import { PromptVariableHelpers } from './PromptVariable.js';

// Re-export for consumers
export type { PromptVariable, PromptVariables } from './PromptVariable.js';

/**
 * Metadata for a prompt template.
 */
export interface PromptMetadata {
  /**
   * Template name.
   */
  readonly name: string;

  /**
   * Template description.
   */
  readonly description?: string;

  /**
   * Template version.
   */
  readonly version?: string;

  /**
   * Template author.
   */
  readonly author?: string;

  /**
   * Template tags for categorization.
   */
  readonly tags?: readonly string[];

  /**
   * Additional metadata.
   */
  readonly [key: string]: unknown;
}

/**
 * A prompt template with variable substitution.
 *
 * Supports:
 * - Variable substitution with {{variable}} or {variable} syntax
 * - Required and optional variables
 * - Default values
 * - Template validation
 * - Memoization for performance
 *
 * @example
 * ```typescript
 * const template = new PromptTemplate({
 *   name: 'greeting',
 *   template: 'Hello {{name}}, welcome to {{app}}!',
 *   variables: [
 *     { name: 'name', required: true },
 *     { name: 'app', defaultValue: 'our app' }
 *   ]
 * });
 *
 * const rendered = template.render({ name: 'Alice' });
 * // => 'Hello Alice, welcome to our app!'
 * ```
 */
export class PromptTemplate {
  private readonly template: string;
  private readonly metadata: PromptMetadata;
  private readonly variables: readonly PromptVariable[];
  private readonly renderedCache = new Map<string, string>();

  constructor(config: {
    template: string;
    metadata: PromptMetadata;
    variables?: readonly PromptVariable[];
  }) {
    this.template = config.template;
    this.metadata = config.metadata;
    this.variables = config.variables ?? this.inferVariables();
  }

  /**
   * Render the template with the given variables.
   *
   * @param variables - Variable values
   * @param options - Rendering options
   * @returns Rendered string
   *
   * @example
   * ```typescript
   * const result = template.render(
   *   { name: 'Alice', age: 25 },
   *   { strict: true, cache: false }
   * );
   * ```
   */
  render(
    variables: PromptVariables,
    options: { strict?: boolean; cache?: boolean } = {}
  ): string {
    const strict = options.strict ?? true;
    const cache = options.cache ?? true;

    // Check cache
    if (cache) {
      const cacheKey = this.getCacheKey(variables);
      const cached = this.renderedCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Apply defaults
    const withDefaults = this.applyDefaults(variables);

    // Validate
    if (strict) {
      const errors = this.validate(withDefaults);
      if (errors.length > 0) {
        throw new Error(`Template validation failed: ${errors.join(', ')}`);
      }
    }

    // Render
    const rendered = PromptVariableHelpers.substitute(
      this.template,
      withDefaults,
      strict
    );

    // Cache
    if (cache) {
      const cacheKey = this.getCacheKey(variables);
      this.renderedCache.set(cacheKey, rendered);
    }

    return rendered;
  }

  /**
   * Validate that all required variables can be satisfied.
   *
   * @param variables - Variable values
   * @returns Array of validation errors (empty if valid)
   *
   * @example
   * ```typescript
   * const errors = template.validate({ name: 'Alice' });
   * if (errors.length > 0) {
   *   console.error('Validation errors:', errors);
   * }
   * ```
   */
  validate(variables: PromptVariables): string[] {
    const errors: string[] = [];

    for (const variable of this.variables) {
      const isRequired = variable.required ?? variable.defaultValue === undefined;

      if (isRequired && !(variable.name in variables)) {
        errors.push(`Missing required variable: ${variable.name}`);
      }
    }

    return errors;
  }

  /**
   * Get template metadata.
   *
   * @returns Template metadata
   */
  getMetadata(): PromptMetadata {
    return this.metadata;
  }

  /**
   * Get template variables.
   *
   * @returns Array of variables
   */
  getVariables(): readonly PromptVariable[] {
    return this.variables;
  }

  /**
   * Get the raw template string.
   *
   * @returns Template string
   */
  getTemplate(): string {
    return this.template;
  }

  /**
   * Clear the render cache.
   *
   * @example
   * ```typescript
   * template.clearCache();
   * ```
   */
  clearCache(): void {
    this.renderedCache.clear();
  }

  /**
   * Get cache statistics.
   *
   * @returns Cache stats
   */
  getCacheStats(): { size: number } {
    return { size: this.renderedCache.size };
  }

  /**
   * Apply default values to variables.
   */
  private applyDefaults(variables: PromptVariables): PromptVariables {
    const result: PromptVariables = { ...variables };

    for (const variable of this.variables) {
      if (!(variable.name in result) && variable.defaultValue !== undefined) {
        result[variable.name] = variable.defaultValue;
      }
    }

    return result;
  }

  /**
   * Infer variables from the template string.
   */
  private inferVariables(): PromptVariable[] {
    const varNames = PromptVariableHelpers.extractVariables(this.template);

    return varNames.map((name) => ({
      name,
      required: true,
    }));
  }

  /**
   * Generate a cache key for the given variables.
   */
  private getCacheKey(variables: PromptVariables): string {
    return JSON.stringify(variables);
  }
}
