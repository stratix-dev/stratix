/**
 * A variable in a prompt template.
 */
export interface PromptVariable {
  /**
   * Variable name (without delimiters).
   */
  readonly name: string;

  /**
   * Optional default value.
   */
  readonly defaultValue?: string;

  /**
   * Whether this variable is required.
   * Default: true (variables without defaults are required)
   */
  readonly required?: boolean;

  /**
   * Optional description of this variable.
   */
  readonly description?: string;
}

/**
 * Values for prompt variables.
 */
export type PromptVariables = Record<string, string | number | boolean>;

/**
 * Helper functions for working with prompt variables.
 */
export const PromptVariableHelpers = {
  /**
   * Extract variable names from a template string.
   *
   * Supports both {{variable}} and {variable} syntax.
   *
   * @param template - The template string
   * @returns Array of unique variable names
   *
   * @example
   * ```typescript
   * const vars = PromptVariableHelpers.extractVariables(
   *   'Hello {{name}}, you are {{age}} years old'
   * );
   * // => ['name', 'age']
   * ```
   */
  extractVariables(template: string): string[] {
    const regex = /\{\{([^}]+)\}\}|\{([^}]+)\}/g;
    const matches = new Set<string>();

    let match;
    while ((match = regex.exec(template)) !== null) {
      const varName = (match[1] || match[2]).trim();
      matches.add(varName);
    }

    return Array.from(matches);
  },

  /**
   * Validate that all required variables are provided.
   *
   * @param template - The template string
   * @param variables - The variable values
   * @param requiredVars - Optional list of required variable names
   * @returns Array of missing variable names (empty if valid)
   *
   * @example
   * ```typescript
   * const errors = PromptVariableHelpers.validate(
   *   'Hello {{name}}',
   *   { age: 25 }
   * );
   * // => ['name']
   * ```
   */
  validate(
    template: string,
    variables: PromptVariables,
    requiredVars?: readonly string[]
  ): string[] {
    const templateVars = this.extractVariables(template);
    const required = requiredVars ?? templateVars;
    const missing: string[] = [];

    for (const varName of required) {
      if (!(varName in variables)) {
        missing.push(varName);
      }
    }

    return missing;
  },

  /**
   * Substitute variables in a template string.
   *
   * Supports both {{variable}} and {variable} syntax.
   *
   * @param template - The template string
   * @param variables - The variable values
   * @param strict - If true, throw on missing variables. Default: false
   * @returns Rendered string
   *
   * @example
   * ```typescript
   * const result = PromptVariableHelpers.substitute(
   *   'Hello {{name}}, you are {{age}} years old',
   *   { name: 'Alice', age: 25 }
   * );
   * // => 'Hello Alice, you are 25 years old'
   * ```
   */
  substitute(
    template: string,
    variables: PromptVariables,
    strict = false
  ): string {
    if (strict) {
      const missing = this.validate(template, variables);
      if (missing.length > 0) {
        throw new Error(`Missing required variables: ${missing.join(', ')}`);
      }
    }

    return template.replace(
      /\{\{([^}]+)\}\}|\{([^}]+)\}/g,
      (match: string, var1: string | undefined, var2: string | undefined) => {
        const varName = (var1 ?? var2 ?? '').trim();
        const value = variables[varName];

        if (value === undefined) {
          return match; // Keep original if not found
        }

        return String(value);
      }
    );
  },

  /**
   * Convert a value to a string for substitution.
   *
   * @param value - The value to convert
   * @returns String representation
   */
  valueToString(value: string | number | boolean): string {
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    return String(value);
  },
};
