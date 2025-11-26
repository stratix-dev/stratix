import { Result, Success, Failure } from '../result/Result.js';
import { DomainError } from '../errors/DomainError.js';

/**
 * Common validators for value objects and domain entities.
 *
 * These validators are reusable, composable, and return Results for type-safe error handling.
 *
 * @example
 * ```typescript
 * // Compose validators for a ProductName value object
 * static create(value: string): Result<ProductName, DomainError> {
 *   return Validators.compose(
 *     (v) => Validators.notEmpty(v, 'Product name'),
 *     (v) => Validators.length(v, { min: 3, max: 100 })
 *   )(value).map(validated => new ProductName(validated));
 * }
 * ```
 */
export const Validators = {
    /**
     * Validates that a string is not empty.
     *
     * @param value - The string to validate
     * @param fieldName - Name of the field for error messages
     * @returns Success with trimmed string or Failure
     *
     * @example
     * ```typescript
     * const result = Validators.notEmpty(name, 'Name');
     * ```
     */
    notEmpty(value: string, fieldName: string = 'Field'): Result<string, DomainError> {
        if (!value || value.trim().length === 0) {
            return Failure.create(
                new DomainError('EMPTY_VALUE', `${fieldName} cannot be empty`)
            );
        }
        return Success.create(value.trim());
    },

    /**
     * Validates string length.
     *
     * @param value - The string to validate
     * @param options - Validation options (min, max, fieldName)
     * @returns Success with trimmed string or Failure
     *
     * @example
     * ```typescript
     * const result = Validators.length(name, { min: 3, max: 50, fieldName: 'Name' });
     * ```
     */
    length(
        value: string,
        options: { min?: number; max?: number; fieldName?: string }
    ): Result<string, DomainError> {
        const { min, max, fieldName = 'Field' } = options;
        const trimmed = value.trim();

        if (min !== undefined && trimmed.length < min) {
            return Failure.create(
                new DomainError(
                    'TOO_SHORT',
                    `${fieldName} must be at least ${min} characters`
                )
            );
        }

        if (max !== undefined && trimmed.length > max) {
            return Failure.create(
                new DomainError('TOO_LONG', `${fieldName} cannot exceed ${max} characters`)
            );
        }

        return Success.create(trimmed);
    },

    /**
     * Validates number range.
     *
     * @param value - The number to validate
     * @param options - Validation options (min, max, fieldName)
     * @returns Success with number or Failure
     *
     * @example
     * ```typescript
     * const result = Validators.range(price, { min: 0, max: 10000, fieldName: 'Price' });
     * ```
     */
    range(
        value: number,
        options: { min?: number; max?: number; fieldName?: string }
    ): Result<number, DomainError> {
        const { min, max, fieldName = 'Field' } = options;

        if (min !== undefined && value < min) {
            return Failure.create(
                new DomainError('BELOW_MIN', `${fieldName} must be at least ${min}`)
            );
        }

        if (max !== undefined && value > max) {
            return Failure.create(
                new DomainError('ABOVE_MAX', `${fieldName} cannot exceed ${max}`)
            );
        }

        return Success.create(value);
    },

    /**
     * Validates against a regex pattern.
     *
     * @param value - The string to validate
     * @param regex - The regular expression pattern
     * @param errorMessage - Custom error message
     * @returns Success with string or Failure
     *
     * @example
     * ```typescript
     * const result = Validators.pattern(code, /^[A-Z]{3}$/, 'Code must be 3 uppercase letters');
     * ```
     */
    pattern(
        value: string,
        regex: RegExp,
        errorMessage: string = 'Invalid format'
    ): Result<string, DomainError> {
        if (!regex.test(value)) {
            return Failure.create(new DomainError('INVALID_FORMAT', errorMessage));
        }
        return Success.create(value);
    },

    /**
     * Validates email format.
     *
     * @param value - The email string to validate
     * @returns Success with email or Failure
     *
     * @example
     * ```typescript
     * const result = Validators.email('user@example.com');
     * ```
     */
    email(value: string): Result<string, DomainError> {
        return Validators.pattern(
            value,
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            'Invalid email format'
        );
    },

    /**
     * Validates URL format.
     *
     * @param value - The URL string to validate
     * @returns Success with URL or Failure
     *
     * @example
     * ```typescript
     * const result = Validators.url('https://example.com');
     * ```
     */
    url(value: string): Result<string, DomainError> {
        try {
            new URL(value);
            return Success.create(value);
        } catch {
            return Failure.create(new DomainError('INVALID_URL', 'Invalid URL format'));
        }
    },

    /**
     * Composes multiple validators into a single validator.
     * Validators are executed in order, stopping at first failure.
     *
     * @param validators - Array of validator functions
     * @returns A composed validator function
     *
     * @example
     * ```typescript
     * const emailValidator = Validators.compose(
     *   (v) => Validators.notEmpty(v, 'Email'),
     *   (v) => Validators.length(v, { max: 254 }),
     *   (v) => Validators.email(v)
     * );
     *
     * const result = emailValidator('user@example.com');
     * ```
     */
    compose<T>(
        ...validators: ((value: T) => Result<T, DomainError>)[]
    ): (value: T) => Result<T, DomainError> {
        return (value: T) => {
            let currentValue = value;
            for (const validator of validators) {
                const result = validator(currentValue);
                if (result.isFailure) {
                    return result;
                }
                currentValue = result.value; // Pass transformed value to next validator
            }
            return Success.create(currentValue);
        };
    },
};
