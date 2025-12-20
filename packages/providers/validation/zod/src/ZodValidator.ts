import type { ZodError } from 'zod';
import type { Validator, ValidationResult, ValidationError, Schema } from './types.js';

/**
 * Zod-based validator implementation.
 *
 * Provides type-safe validation using Zod schemas with Result pattern.
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 * import { ZodValidator } from '@stratix/validation';
 *
 * const userSchema = z.object({
 *   name: z.string().min(2),
 *   email: z.string().email(),
 *   age: z.number().int().positive()
 * });
 *
 * const validator = ZodValidator.create(userSchema);
 * const result = validator.validate({ name: 'John', email: 'john@example.com', age: 30 });
 *
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.errors);
 * }
 * ```
 */
export class ZodValidator<T> implements Validator<T> {
  constructor(private readonly schema: Schema<T>) {}

  /**
   * Validates data and returns a Result.
   */
  validate(data: unknown): ValidationResult<T> {
    return this.safeParse(data);
  }

  /**
   * Validates data asynchronously and returns a Result.
   */
  async validateAsync(data: unknown): Promise<ValidationResult<T>> {
    return this.safeParseAsync(data);
  }

  /**
   * Parses data, throws on validation error.
   */
  parse(data: unknown): T {
    return this.schema.parse(data);
  }

  /**
   * Parses data asynchronously, throws on validation error.
   */
  async parseAsync(data: unknown): Promise<T> {
    return this.schema.parseAsync(data);
  }

  safeParse(data: unknown): ValidationResult<T> {
    const result = this.schema.safeParse(data);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }

    return {
      success: false,
      errors: this.formatErrors(result.error),
    };
  }

  async safeParseAsync(data: unknown): Promise<ValidationResult<T>> {
    const result = await this.schema.safeParseAsync(data);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }

    return {
      success: false,
      errors: this.formatErrors(result.error),
    };
  }

  private formatErrors(error: ZodError): ValidationError[] {
    return error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));
  }

  /**
   * Creates a new validator from a Zod schema.
   */
  static create<T>(schema: Schema<T>): ZodValidator<T> {
    return new ZodValidator(schema);
  }
}
