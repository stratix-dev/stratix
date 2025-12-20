import Handlebars from 'handlebars';
import {
  type PromptTemplate,
  type PromptVariable,
  type PromptMetadata,
  type PromptValidationResult,
} from '@stratix/core/ai-agents';
import { Success, Failure, type Result } from '@stratix/core';

/**
 * Configuration for creating a Handlebars prompt template
 * @category AI Agents
 */
export interface HandlebarsPromptTemplateConfig {
  /**
   * Unique identifier
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
   * Template string with {{variable}} placeholders
   */
  readonly template: string;

  /**
   * Variable definitions
   */
  readonly variables: PromptVariable[];

  /**
   * Template metadata
   */
  readonly metadata?: Partial<PromptMetadata>;

  /**
   * Custom Handlebars helpers
   */
  readonly helpers?: Record<string, Handlebars.HelperDelegate>;

  /**
   * Custom Handlebars partials
   */
  readonly partials?: Record<string, Handlebars.Template>;
}

/**
 * Prompt template implementation using Handlebars
 *
 * Provides variable substitution using Handlebars syntax with:
 * - Built-in helpers (if, each, unless, with, etc.)
 * - Custom helpers support
 * - Partials support
 * - Type validation
 *
 * @example
 * ```typescript
 * const template = new HandlebarsPromptTemplate({
 *   id: 'greeting',
 *   name: 'Greeting Template',
 *   version: '1.0.0',
 *   template: 'Hello {{userName}}! {{#if premium}}You are a premium user.{{/if}}',
 *   variables: [
 *     { name: 'userName', type: 'string', required: true },
 *     { name: 'premium', type: 'boolean', required: false, default: false }
 *   ],
 *   helpers: {
 *     uppercase: (str: string) => str.toUpperCase()
 *   }
 * });
 *
 * const result = template.render({ userName: 'Alice', premium: true });
 * if (result.isSuccess) {
 *   console.log(result.value); // "Hello Alice! You are a premium user."
 * }
 * ```
 */
export class HandlebarsPromptTemplate implements PromptTemplate {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly template: string;
  readonly variables: PromptVariable[];
  readonly metadata: PromptMetadata;

  private readonly compiledTemplate: Handlebars.TemplateDelegate;
  private readonly handlebarsInstance: typeof Handlebars;

  constructor(config: HandlebarsPromptTemplateConfig) {
    this.id = config.id;
    this.name = config.name;
    this.version = config.version;
    this.template = config.template;
    this.variables = config.variables;

    // Build metadata
    const now = new Date();
    this.metadata = {
      description: config.metadata?.description,
      author: config.metadata?.author,
      tags: config.metadata?.tags || [],
      model: config.metadata?.model,
      maxTokens: config.metadata?.maxTokens,
      temperature: config.metadata?.temperature,
      createdAt: config.metadata?.createdAt || now,
      updatedAt: config.metadata?.updatedAt || now,
      ...config.metadata,
    };

    // Create isolated Handlebars instance to avoid global pollution
    this.handlebarsInstance = Handlebars.create();

    // Register custom helpers
    if (config.helpers) {
      for (const [name, helper] of Object.entries(config.helpers)) {
        this.handlebarsInstance.registerHelper(name, helper);
      }
    }

    // Register partials
    if (config.partials) {
      for (const [name, partial] of Object.entries(config.partials)) {
        this.handlebarsInstance.registerPartial(name, partial);
      }
    }

    // Compile template
    try {
      this.compiledTemplate = this.handlebarsInstance.compile(config.template, {
        noEscape: true, // Don't HTML-escape output
        strict: false, // Allow undefined variables
      });
    } catch (error) {
      throw new Error(
        `Failed to compile Handlebars template "${config.id}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Render template with provided variables
   */
  render(variables: Record<string, unknown>): Result<string, Error> {
    // Validate first
    const validation = this.validate(variables);
    if (!validation.valid) {
      const errorMessages = [
        ...validation.missingRequired.map((name: string) => `Missing required variable: ${name}`),
        ...Object.entries(validation.typeMismatches).map(
          ([name, mismatch]) => {
            const { expected, actual } = mismatch as { expected: string; actual: string };
            return `Type mismatch for ${name}: expected ${expected}, got ${actual}`;
          }
        ),
        ...Object.entries(validation.errors).map(([name, error]) => `${name}: ${error}`),
      ];

      return new Failure(new Error(`Validation failed: ${errorMessages.join(', ')}`));
    }

    // Apply defaults for missing optional variables
    const mergedVariables = this.applyDefaults(variables);

    // Render template
    try {
      const rendered = this.compiledTemplate(mergedVariables);
      return new Success(rendered);
    } catch (error) {
      return new Failure(
        new Error(
          `Failed to render template: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }
  }

  /**
   * Validate variables before rendering
   */
  validate(variables: Record<string, unknown>): PromptValidationResult {
    const errors: Record<string, string> = {};
    const missingRequired: string[] = [];
    const typeMismatches: Record<string, { expected: string; actual: string }> = {};

    for (const varDef of this.variables) {
      const value = variables[varDef.name];

      // Check required
      if (varDef.required && (value === undefined || value === null)) {
        missingRequired.push(varDef.name);
        continue;
      }

      // Skip validation if optional and not provided
      if (!varDef.required && (value === undefined || value === null)) {
        continue;
      }

      // Type check
      const actualType = this.getType(value);
      if (actualType !== varDef.type) {
        typeMismatches[varDef.name] = {
          expected: varDef.type,
          actual: actualType,
        };
        continue;
      }

      // Custom validator
      if (varDef.validator && !varDef.validator(value)) {
        errors[varDef.name] = 'Failed custom validation';
      }
    }

    return {
      valid: missingRequired.length === 0 && Object.keys(typeMismatches).length === 0 && Object.keys(errors).length === 0,
      errors,
      missingRequired,
      typeMismatches,
    };
  }

  /**
   * Apply default values for missing optional variables
   */
  private applyDefaults(variables: Record<string, unknown>): Record<string, unknown> {
    const result = { ...variables };

    for (const varDef of this.variables) {
      if (varDef.default !== undefined && (result[varDef.name] === undefined || result[varDef.name] === null)) {
        result[varDef.name] = varDef.default;
      }
    }

    return result;
  }

  /**
   * Get type of a value matching PromptVariable.type
   */
  private getType(value: unknown): PromptVariable['type'] {
    if (Array.isArray(value)) return 'array';
    if (value === null) return 'object';

    const type = typeof value;
    if (type === 'string') return 'string';
    if (type === 'number') return 'number';
    if (type === 'boolean') return 'boolean';
    if (type === 'object') return 'object';

    return 'object'; // fallback
  }

  /**
   * Clone template with updated metadata
   */
  clone(updates: {
    id?: string;
    name?: string;
    version?: string;
    metadata?: Partial<PromptMetadata>;
  }): HandlebarsPromptTemplate {
    return new HandlebarsPromptTemplate({
      id: updates.id || this.id,
      name: updates.name || this.name,
      version: updates.version || this.version,
      template: this.template,
      variables: this.variables,
      metadata: {
        ...this.metadata,
        ...updates.metadata,
        updatedAt: new Date(),
      },
    });
  }
}
