/**
 * Validation error details
 */
export interface ValidationError {
  /**
   * Path to the field with error (dot notation)
   */
  path: string;

  /**
   * Error message
   */
  message: string;

  /**
   * Error code (if available)
   */
  code?: string;
}

/**
 * Validation result
 * @category Configuration
 */
export interface ValidationResult<T> {
  /**
   * Whether validation succeeded
   */
  success: boolean;

  /**
   * Validated data (only if success is true)
   */
  data?: T;

  /**
   * Validation errors (only if success is false)
   */
  errors?: ValidationError[];
}

/**
 * Configuration schema for validation
 *
 * Implementations can use any validation library (Zod, Joi, etc.)
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 *
 * const schema = z.object({
 *   port: z.number().int().positive(),
 *   host: z.string().default('localhost'),
 * });
 *
 * class ZodConfigSchema implements ConfigSchema<MyConfig> {
 *   async validate(data: unknown): Promise<ValidationResult<MyConfig>> {
 *     const result = schema.safeParse(data);
 *     if (result.success) {
 *       return { success: true, data: result.data };
 *     }
 *     return {
 *       success: false,
 *       errors: result.error.errors.map(e => ({
 *         path: e.path.join('.'),
 *         message: e.message,
 *       })),
 *     };
 *   }
 * }
 * ```
 */
export interface ConfigSchema<T = unknown> {
  /**
   * Validate configuration data
   *
   * @param data - The data to validate
   * @returns Validation result with validated data or errors
   */
  validate(data: unknown): Promise<ValidationResult<T>>;
}

/**
 * Configuration provider options
 */
export interface ConfigProviderOptions<T = unknown> {
  /**
   * Validation schema (optional)
   */
  schema?: ConfigSchema<T>;

  /**
   * Cache configuration values
   * @default true
   */
  cache?: boolean;

  /**
   * Cache TTL in milliseconds
   * @default undefined (no expiration)
   */
  cacheTTL?: number;

  /**
   * Prefix for all keys
   */
  prefix?: string;

  /**
   * Enable hot reload (if supported)
   * @default false
   */
  watch?: boolean;

  /**
   * Transformation functions for specific keys
   *
   * @example
   * ```typescript
   * {
   *   transformers: {
   *     'port': (value) => parseInt(value, 10),
   *     'timeout': (value) => parseInt(value, 10),
   *   }
   * }
   * ```
   */
  transformers?: Record<string, (value: string) => unknown>;
}
