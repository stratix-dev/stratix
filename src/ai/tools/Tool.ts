import type { ToolDefinition } from '../llm/LLMProvider.js';

/**
 * Result of tool execution.
 */
export type ToolResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Tool execution context.
 */
export interface ToolContext {
  /**
   * User ID (if available).
   */
  readonly userId?: string;

  /**
   * Session ID.
   */
  readonly sessionId: string;

  /**
   * Additional metadata.
   */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Abstract base class for tools that AI agents can use.
 *
 * Tools are functions that agents can call to perform actions or retrieve information.
 * Each tool has a name, description, parameter schema, and execute method.
 *
 * @example
 * ```TypeScript
 * class WeatherTool extends Tool<{ location: string }, { temperature: number }> {
 *   get name(): string {
 *     return 'get_weather';
 *   }
 *
 *   get description(): string {
 *     return 'Get current weather for a location';
 *   }
 *
 *   get parameters() {
 *     return {
 *       type: 'object' as const,
 *       properties: {
 *         location: {
 *           type: 'string',
 *           description: 'City name'
 *         }
 *       },
 *       required: ['location']
 *     };
 *   }
 *
 *   async execute(params: { location: string }, context: ToolContext): Promise<ToolResult<{ temperature: number }>> {
 *     const weather = await fetchWeather(params.location);
 *     return { success: true, data: { temperature: weather.temp } };
 *   }
 * }
 * ```
 */
export abstract class Tool<TParams = unknown, TResult = unknown> {
  /**
   * Tool name (must be valid identifier).
   */
  abstract get name(): string;

  /**
   * Human-readable description of what the tool does.
   */
  abstract get description(): string;

  /**
   * JSON schema for tool parameters.
   */
  abstract get parameters(): {
    readonly type: 'object';
    readonly properties: Record<string, unknown>;
    readonly required?: readonly string[];
    readonly additionalProperties?: boolean;
  };

  /**
   * Whether this tool requires strict parameter validation.
   * Default: false
   */
  get strict(): boolean {
    return false;
  }

  /**
   * Execute the tool with the given parameters.
   *
   * @param params - Validated parameters
   * @param context - Execution context
   * @returns Tool execution result
   */
  abstract execute(params: TParams, context: ToolContext): Promise<ToolResult<TResult>>;

  /**
   * Get the tool definition for LLM function calling.
   */
  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters,
      strict: this.strict
    };
  }

  /**
   * Validate parameters against the schema.
   * Basic validation - can be overridden for custom validation.
   *
   * @param params - Parameters to validate
   * @returns Validation errors (empty if valid)
   */
  validate(params: unknown): string[] {
    const errors: string[] = [];

    if (typeof params !== 'object' || params === null) {
      errors.push('Parameters must be an object');
      return errors;
    }

    const paramsObj = params as Record<string, unknown>;

    // Check required fields
    if (this.parameters.required) {
      for (const field of this.parameters.required) {
        if (!(field in paramsObj)) {
          errors.push(`Required parameter missing: ${field}`);
        }
      }
    }

    // Check for unknown fields if additionalProperties is false
    if (this.parameters.additionalProperties === false) {
      const allowedKeys = Object.keys(this.parameters.properties);
      for (const key of Object.keys(paramsObj)) {
        if (!allowedKeys.includes(key)) {
          errors.push(`Unknown parameter: ${key}`);
        }
      }
    }

    return errors;
  }

  /**
   * Check if parameters are valid.
   */
  isValid(params: unknown): boolean {
    return this.validate(params).length === 0;
  }

  /**
   * Execute with automatic validation.
   * Returns error result if validation fails.
   */
  async executeValidated(params: unknown, context: ToolContext): Promise<ToolResult<TResult>> {
    const errors = this.validate(params);
    if (errors.length > 0) {
      return {
        success: false,
        error: `Validation failed: ${errors.join(', ')}`
      };
    }

    try {
      return await this.execute(params as TParams, context);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Create a success result.
   */
  protected success(data: TResult): ToolResult<TResult> {
    return { success: true, data };
  }

  /**
   * Create an error result.
   */
  protected error(message: string): ToolResult<TResult> {
    return { success: false, error: message };
  }

  /**
   * String representation of the tool.
   */
  toString(): string {
    return `Tool(${this.name})`;
  }

  /**
   * JSON representation of the tool.
   */
  toJSON() {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters,
      strict: this.strict
    };
  }
}

/**
 * Helper functions for working with tools.
 */
export const ToolHelpers = {
  /**
   * Create a tool result from a promise.
   * Catches errors and returns error result.
   */
  async fromPromise<T>(promise: Promise<T>): Promise<ToolResult<T>> {
    try {
      const data = await promise;
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },

  /**
   * Combine multiple tool results.
   * Returns success only if all results are successful.
   */
  combine<T extends readonly ToolResult[]>(
    ...results: T
  ): ToolResult<{ [K in keyof T]: T[K] extends ToolResult<infer U> ? U : never }> {
    const errors: string[] = [];
    const data: unknown[] = [];

    for (const result of results) {
      if (!result.success) {
        errors.push(result.error);
      } else {
        data.push(result.data);
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: errors.join('; ')
      };
    }

    return {
      success: true,
      data: data as { [K in keyof T]: T[K] extends ToolResult<infer U> ? U : never }
    };
  },

  /**
   * Transform a successful result.
   */
  map<T, U>(result: ToolResult<T>, fn: (data: T) => U): ToolResult<U> {
    if (!result.success) {
      return result;
    }
    return { success: true, data: fn(result.data) };
  },

  /**
   * Chain tool results (flatMap).
   */
  flatMap<T, U>(result: ToolResult<T>, fn: (data: T) => ToolResult<U>): ToolResult<U> {
    if (!result.success) {
      return result;
    }
    return fn(result.data);
  },

  /**
   * Provide a default value if result is error.
   */
  orDefault<T>(result: ToolResult<T>, defaultValue: T): T {
    return result.success ? result.data : defaultValue;
  },

  /**
   * Unwrap result or throw error.
   */
  unwrap<T>(result: ToolResult<T>): T {
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }
};
