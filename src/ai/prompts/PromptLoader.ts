import { PromptTemplate } from './PromptTemplate.js';
import type { PromptMetadata, PromptVariable } from './PromptTemplate.js';

/**
 * Serialized prompt template format.
 *
 * This is the JSON format for storing/loading prompts.
 */
export interface SerializedPrompt {
  /**
   * Template metadata.
   */
  readonly metadata: PromptMetadata;

  /**
   * Template string.
   */
  readonly template: string;

  /**
   * Template variables.
   */
  readonly variables?: readonly PromptVariable[];
}

/**
 * Loader for prompt templates.
 *
 * Handles loading prompts from various sources:
 * - JSON objects
 * - JSON strings
 * - Files (in runtime, not core)
 *
 * @example
 * ```TypeScript
 * const loader = new PromptLoader();
 *
 * // Load from JSON object
 * const template = loader.fromObject({
 *   metadata: { name: 'greeting' },
 *   template: 'Hello {{name}}!',
 *   variables: [{ name: 'name', required: true }]
 * });
 *
 * // Load from JSON string
 * const template2 = loader.fromJSON(jsonString);
 * ```
 */
export class PromptLoader {
  /**
   * Load a template from a serialized object.
   *
   * @param data - Serialized prompt data
   * @returns Prompt template
   *
   * @example
   * ```TypeScript
   * const template = loader.fromObject({
   *   metadata: { name: 'greeting', version: '1.0' },
   *   template: 'Hello {{name}}!',
   *   variables: [{ name: 'name', required: true }]
   * });
   * ```
   */
  fromObject(data: SerializedPrompt): PromptTemplate {
    this.validate(data);

    return new PromptTemplate({
      metadata: data.metadata,
      template: data.template,
      variables: data.variables
    });
  }

  /**
   * Load a template from a JSON string.
   *
   * @param json - JSON string
   * @returns Prompt template
   *
   * @example
   * ```TypeScript
   * const json = JSON.stringify({
   *   metadata: { name: 'greeting' },
   *   template: 'Hello {{name}}!'
   * });
   * const template = loader.fromJSON(json);
   * ```
   */
  fromJSON(json: string): PromptTemplate {
    try {
      const data = JSON.parse(json) as SerializedPrompt;
      return this.fromObject(data);
    } catch (error) {
      throw new Error(
        `Failed to parse prompt JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Load multiple templates from an array.
   *
   * @param dataArray - Array of serialized prompts
   * @returns Array of prompt templates
   *
   * @example
   * ```TypeScript
   * const templates = loader.fromArray([prompt1, prompt2, prompt3]);
   * ```
   */
  fromArray(dataArray: readonly SerializedPrompt[]): PromptTemplate[] {
    return dataArray.map((data) => this.fromObject(data));
  }

  /**
   * Serialize a template to an object.
   *
   * @param template - Template to serialize
   * @returns Serialized prompt data
   *
   * @example
   * ```TypeScript
   * const data = loader.toObject(template);
   * console.log(JSON.stringify(data, null, 2));
   * ```
   */
  toObject(template: PromptTemplate): SerializedPrompt {
    return {
      metadata: template.getMetadata(),
      template: template.getTemplate(),
      variables: template.getVariables()
    };
  }

  /**
   * Serialize a template to a JSON string.
   *
   * @param template - Template to serialize
   * @param pretty - Whether to pretty-print (default: false)
   * @returns JSON string
   *
   * @example
   * ```TypeScript
   * const json = loader.toJSON(template, true);
   * ```
   */
  toJSON(template: PromptTemplate, pretty = false): string {
    const data = this.toObject(template);
    return JSON.stringify(data, null, pretty ? 2 : undefined);
  }

  /**
   * Serialize multiple templates to an array.
   *
   * @param templates - Templates to serialize
   * @returns Array of serialized prompts
   *
   * @example
   * ```TypeScript
   * const data = loader.toArray([template1, template2]);
   * ```
   */
  toArray(templates: readonly PromptTemplate[]): SerializedPrompt[] {
    return templates.map((template) => this.toObject(template));
  }

  /**
   * Validate serialized prompt data.
   *
   * @param data - Data to validate
   * @returns Array of validation errors (empty if valid)
   *
   * @example
   * ```TypeScript
   * const errors = loader.validate(data);
   * if (errors.length > 0) {
   *   console.error('Validation errors:', errors);
   * }
   * ```
   */
  validate(data: SerializedPrompt): string[] {
    const errors: string[] = [];

    if (!data.metadata) {
      errors.push('Missing metadata');
    } else {
      if (!data.metadata.name) {
        errors.push('Missing metadata.name');
      }
    }

    if (!data.template) {
      errors.push('Missing template');
    } else if (typeof data.template !== 'string') {
      errors.push('Template must be a string');
    }

    if (data.variables) {
      if (!Array.isArray(data.variables)) {
        errors.push('Variables must be an array');
      } else {
        for (let i = 0; i < data.variables.length; i++) {
          const variable = data.variables[i] as Record<string, unknown>;
          if (!variable.name || typeof variable.name !== 'string') {
            errors.push(`Variable at index ${i} missing name`);
          }
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Prompt validation failed: ${errors.join(', ')}`);
    }

    return errors;
  }
}
