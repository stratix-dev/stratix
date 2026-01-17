import { Result, Success } from '../result/Result.js';
import { DomainError } from '../domain/DomainError.js';
import { ValueObject } from '../domain/ValueObject.js';
/**
 * Factory helpers for creating Value Objects with less boilerplate.
 *
 * Simplifies the creation of string and number-based Value Objects by handling
 * validation and construction in a standardized way.
 *
 * @example
 * ```typescript
 * class ProductName extends ValueObject {
 *   private constructor(readonly value: string) {
 *     super();
 *   }
 *
 *   static create(value: string): Result<ProductName, DomainError> {
 *     return ValueObjectFactory.createString(
 *       value,
 *       ProductName,
 *       [
 *         (v) => Validators.notEmpty(v, 'Product name'),
 *         (v) => Validators.length(v, { min: 3, max: 100 })
 *       ]
 *     );
 *   }
 *
 *   protected getEqualityComponents(): unknown[] {
 *     return [this.value];
 *   }
 * }
 * ```
 */
export class ValueObjectFactory {
  /**
   * Creates a string-based Value Object with validation.
   *
   * Runs all validators in sequence and creates the Value Object if all pass.
   * Validators receive the raw value and should return Results.
   *
   * @param value - The raw string value
   * @param ValueObjectClass - The Value Object class constructor
   * @param validators - Array of validation functions
   * @returns Result with the created Value Object or validation error
   *
   * @example
   * ```typescript
   * class Email extends ValueObject {
   *   private constructor(readonly value: string) { super(); }
   *
   *   static create(value: string): Result<Email, DomainError> {
   *     return ValueObjectFactory.createString(value, Email, [
   *       (v) => Validators.notEmpty(v, 'Email'),
   *       (v) => Validators.email(v)
   *     ]);
   *   }
   *
   *   protected getEqualityComponents() { return [this.value]; }
   * }
   * ```
   */
  static createString<T extends ValueObject>(
    value: string,
    ValueObjectClass: new (value: string) => T,
    validators: ((v: string) => Result<string, DomainError>)[] = []
  ): Result<T, DomainError> {
    // Run all validators
    let currentValue = value;
    for (const validator of validators) {
      const result = validator(currentValue);
      if (result.isFailure) {
        return result;
      }
      // Pass through transformed value (validators might trim, etc.)
      currentValue = result.value;
    }

    // Create the Value Object with the validated value
    return Success.create(new ValueObjectClass(currentValue));
  }

  /**
   * Creates a number-based Value Object with validation.
   *
   * Runs all validators in sequence and creates the Value Object if all pass.
   * Validators receive the raw number and should return Results.
   *
   * @param value - The raw number value
   * @param ValueObjectClass - The Value Object class constructor
   * @param validators - Array of validation functions
   * @returns Result with the created Value Object or validation error
   *
   * @example
   * ```typescript
   * class Price extends ValueObject {
   *   private constructor(readonly value: number) { super(); }
   *
   *   static create(value: number): Result<Price, DomainError> {
   *     return ValueObjectFactory.createNumber(value, Price, [
   *       (v) => Validators.range(v, { min: 0, max: 1000000, fieldName: 'Price' })
   *     ]);
   *   }
   *
   *   protected getEqualityComponents() { return [this.value]; }
   * }
   * ```
   */
  static createNumber<T extends ValueObject>(
    value: number,
    ValueObjectClass: new (value: number) => T,
    validators: ((v: number) => Result<number, DomainError>)[] = []
  ): Result<T, DomainError> {
    // Run all validators
    let currentValue = value;
    for (const validator of validators) {
      const result = validator(currentValue);
      if (result.isFailure) {
        return result;
      }
      // Pass through transformed value
      currentValue = result.value;
    }

    // Create the Value Object with the validated value
    return Success.create(new ValueObjectClass(currentValue));
  }

  /**
   * Creates a Value Object from a primitive with custom validation logic.
   *
   * More flexible than createString/createNumber when you need custom validation
   * that doesn't fit the standard validator pattern.
   *
   * @param value - The raw value
   * @param ValueObjectClass - The Value Object class constructor
   * @param validate - Custom validation function
   * @returns Result with the created Value Object or validation error
   *
   * @example
   * ```typescript
   * class Color extends ValueObject {
   *   private constructor(readonly hex: string) { super(); }
   *
   *   static create(hex: string): Result<Color, DomainError> {
   *     return ValueObjectFactory.create(hex, Color, (value) => {
   *       if (!/^#[0-9A-F]{6}$/i.test(value)) {
   *         return Failure.create(
   *           new DomainError('INVALID_COLOR', 'Must be valid hex color')
   *         );
   *       }
   *       return Success.create(value);
   *     });
   *   }
   *
   *   protected getEqualityComponents() { return [this.hex]; }
   * }
   * ```
   */
  static create<TValue, T extends ValueObject>(
    value: TValue,
    ValueObjectClass: new (value: TValue) => T,
    validate: (value: TValue) => Result<TValue, DomainError>
  ): Result<T, DomainError> {
    const validationResult = validate(value);
    if (validationResult.isFailure) {
      return validationResult;
    }

    return Success.create(new ValueObjectClass(validationResult.value));
  }
}
