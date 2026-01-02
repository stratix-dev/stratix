
import { Result, Success, Failure } from '@stratix/core';
import { MetadataStorage } from '../../runtime/MetadataStorage.js';

/**
 * Validator function type.
 */
export type ValidatorFn<T = any> = (value: T) => Result<T, Error> | T;

/**
 * Decorator to add validation to a property.
 *
 * The validator function is called whenever the property is set.
 * If validation fails, an error is thrown.
 *
 * Note: Uses accessor decorator approach for Stage 3 decorators.
 *
 * @param validator - Function that validates the value
 *
 * @example
 * ```typescript
 * @Aggregate()
 * export class User {
 *   @Validate((email: Email) =>
 *     email.isValid()
 *       ? Success(email)
 *       : Failure(new DomainError('Invalid email'))
 *   )
 *   accessor email!: Email;
 *
 *   @Validate(Validators.minLength(2))
 *   accessor name!: string;
 * }
 * ```
 *
 * @category Domain Decorators
 */
export function Validate<T>(validator: ValidatorFn<T>) {
  return function (
    target: ClassAccessorDecoratorTarget<any, T>,
    context: ClassAccessorDecoratorContext<any, T>
  ): ClassAccessorDecoratorResult<any, T> {
    // Store the validator in metadata
    if (context.metadata) {
      context.metadata[`validate:${String(context.name)}`] = validator;
    }

    // Register in global storage during initialization
    context.addInitializer(function(this: any) {
      MetadataStorage.registerValidator(this.constructor, {
        target: this.constructor,
        propertyKey: context.name as string,
        validator,
      });
    });

    // Return accessor descriptor with validation
    return {
      get(this: any) {
        return target.get.call(this);
      },
      set(this: any, value: T) {
        // Run validator
        const result = validator(value);

        // Check if result is a Result object
        if (result && typeof result === 'object' && 'isSuccess' in result) {
          const typedResult = result as Result<T, Error>;

          if (typedResult.isFailure) {
            throw typedResult.error;
          }

          target.set.call(this, typedResult.value);
        } else {
          // Validator returned the value directly (truthy = valid)
          if (!result) {
            throw new Error(`Validation failed for ${String(context.name)}`);
          }

          target.set.call(this, value);
        }
      },
    };
  };
}

/**
 * Built-in validators for common use cases.
 */
export const Validators = {
  /**
   * Validates minimum string length.
   */
  minLength: (min: number) => (value: string) =>
    value.length >= min
      ? Success.create(value)
      : Failure.create(new Error(`Minimum length is ${min}`)),

  /**
   * Validates maximum string length.
   */
  maxLength: (max: number) => (value: string) =>
    value.length <= max
      ? Success.create(value)
      : Failure.create(new Error(`Maximum length is ${max}`)),

  /**
   * Validates string length range.
   */
  stringLength: (min: number, max: number) => (value: string) =>
    value.length >= min && value.length <= max
      ? Success.create(value)
      : Failure.create(new Error(`Length must be between ${min} and ${max}`)),

  /**
   * Validates numeric range.
   */
  range: (min: number, max: number) => (value: number) =>
    value >= min && value <= max
      ? Success.create(value)
      : Failure.create(new Error(`Value must be between ${min} and ${max}`)),

  /**
   * Validates email format.
   */
  email: () => (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ? Success.create(value)
      : Failure.create(new Error('Invalid email format')),

  /**
   * Validates non-empty value.
   */
  required: () => (value: any) =>
    value !== null && value !== undefined && value !== ''
      ? Success.create(value)
      : Failure.create(new Error('Value is required')),

  /**
   * Validates positive number.
   */
  positive: () => (value: number) =>
    value > 0
      ? Success.create(value)
      : Failure.create(new Error('Value must be positive')),

  /**
   * Validates that value is one of the allowed values.
   */
  oneOf: <T>(allowed: T[]) => (value: T) =>
    allowed.includes(value)
      ? Success.create(value)
      : Failure.create(new Error(`Value must be one of: ${allowed.join(', ')}`)),
};
