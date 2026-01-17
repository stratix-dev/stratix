/**
 * Tool definition for LLM function calling.
 *
 * This is the SINGLE SOURCE OF TRUTH for tool definitions.
 * Used by both:
 * - Tool implementations (AgentTool)
 * - LLM providers (for function calling)
 *
 * Follows JSON Schema format for parameter definitions.
 *
 * @example
 * ```typescript
 * const definition: ToolDefinition = {
 *   name: 'search_knowledge_base',
 *   description: 'Search the company knowledge base for relevant articles',
 *   parameters: {
 *     type: 'object',
 *     properties: {
 *       query: {
 *         type: 'string',
 *         description: 'The search query'
 *       },
 *       limit: {
 *         type: 'number',
 *         description: 'Maximum number of results',
 *         minimum: 1,
 *         maximum: 100
 *       }
 *     },
 *     required: ['query']
 *   }
 * };
 * ```
 */
export interface ToolDefinition {
  /**
   * Unique name of the tool.
   * Should be snake_case and descriptive.
   *
   * @example 'search_knowledge_base', 'create_ticket', 'send_email'
   */
  readonly name: string;

  /**
   * Human-readable description of what the tool does.
   * This helps the LLM understand when to use this tool.
   *
   * Should be clear and concise (1-2 sentences).
   */
  readonly description: string;

  /**
   * JSON Schema definition for tool parameters.
   * Must be an object type with properties.
   */
  readonly parameters: ParameterSchema;
}

/**
 * JSON Schema for tool parameters.
 *
 * Top-level must be an object type.
 */
export interface ParameterSchema {
  /**
   * Type must be 'object' for tool parameters
   */
  readonly type: 'object';

  /**
   * Property definitions
   */
  readonly properties: Record<string, PropertySchema>;

  /**
   * Required property names
   */
  readonly required?: readonly string[];

  /**
   * Whether additional properties are allowed
   * @default false
   */
  readonly additionalProperties?: boolean;

  /**
   * Description of the parameters object
   */
  readonly description?: string;
}

/**
 * Property schema types.
 *
 * Supports basic JSON Schema types with validation constraints.
 */
export type PropertySchema =
  | StringPropertySchema
  | NumberPropertySchema
  | BooleanPropertySchema
  | ArrayPropertySchema
  | ObjectPropertySchema;

/**
 * String property schema
 */
export interface StringPropertySchema {
  readonly type: 'string';
  readonly description?: string;
  readonly enum?: readonly string[];
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
  readonly format?: 'date-time' | 'email' | 'uri' | 'uuid';
}

/**
 * Number property schema
 */
export interface NumberPropertySchema {
  readonly type: 'number' | 'integer';
  readonly description?: string;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly exclusiveMinimum?: number;
  readonly exclusiveMaximum?: number;
  readonly multipleOf?: number;
}

/**
 * Boolean property schema
 */
export interface BooleanPropertySchema {
  readonly type: 'boolean';
  readonly description?: string;
}

/**
 * Array property schema
 */
export interface ArrayPropertySchema {
  readonly type: 'array';
  readonly description?: string;
  readonly items: PropertySchema;
  readonly minItems?: number;
  readonly maxItems?: number;
  readonly uniqueItems?: boolean;
}

/**
 * Object property schema
 */
export interface ObjectPropertySchema {
  readonly type: 'object';
  readonly description?: string;
  readonly properties: Record<string, PropertySchema>;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean;
}

/**
 * Helper functions for working with tool definitions
 */
export const ToolDefinitionHelpers = {
  /**
   * Validate a tool definition.
   *
   * Checks for:
   * - Valid name format (snake_case, no spaces)
   * - Non-empty description
   * - Valid parameters schema
   *
   * @param definition - The tool definition to validate
   * @returns Array of validation errors (empty if valid)
   */
  validate(definition: ToolDefinition): string[] {
    const errors: string[] = [];

    // Validate name
    if (!definition.name || definition.name.trim().length === 0) {
      errors.push('Tool name cannot be empty');
    } else if (!/^[a-z][a-z0-9_]*$/.test(definition.name)) {
      errors.push('Tool name must be snake_case (lowercase letters, numbers, underscores)');
    }

    // Validate description
    if (!definition.description || definition.description.trim().length === 0) {
      errors.push('Tool description cannot be empty');
    } else if (definition.description.length > 500) {
      errors.push('Tool description should be concise (<500 characters)');
    }

    // Validate parameters
    if (definition.parameters.type !== 'object') {
      errors.push('Tool parameters must be an object type');
    }

    if (!definition.parameters.properties) {
      errors.push('Tool parameters must have properties defined');
    }

    return errors;
  },

  /**
   * Create a simple tool definition with minimal configuration.
   *
   * @param name - Tool name (snake_case)
   * @param description - Tool description
   * @param properties - Parameter properties
   * @param required - Required parameter names
   * @returns A valid ToolDefinition
   */
  create(
    name: string,
    description: string,
    properties: Record<string, PropertySchema>,
    required?: string[]
  ): ToolDefinition {
    return {
      name,
      description,
      parameters: {
        type: 'object',
        properties,
        required
      }
    };
  },

  /**
   * Check if a tool definition is valid.
   *
   * @param definition - The tool definition to check
   * @returns true if valid, false otherwise
   */
  isValid(definition: ToolDefinition): boolean {
    return this.validate(definition).length === 0;
  }
};
