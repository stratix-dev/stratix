import { Result, Success, Failure } from './Result.js';
import { DomainError } from '../errors/DomainError.js';

/**
 * Advanced result helpers for common patterns.
 *
 * These helpers simplify working with Results, especially in command handlers
 * and complex business logic flows.
 *
 * @example
 * ```typescript
 * // Combine multiple Results
 * const nameResult = ProductName.create(command.name);
 * const priceResult = Money.create(command.price);
 *
 * return Results.combine(nameResult, priceResult)
 *   .map(([name, price]) => Product.create(name, price));
 * ```
 */
export const Results = {
    /**
     * Combines multiple Results into one.
     * Returns Failure if any Result is Failure, otherwise Success with tuple of values.
     *
     * @param results - Results to combine
     * @returns Combined Result with tuple of values
     *
     * @example
     * ```typescript
     * const result = Results.combine(
     *   ProductName.create('Laptop'),
     *   Money.create(999, 'USD')
     * );
     * // result is Success<[ProductName, Money]> or Failure<DomainError>
     * ```
     */
    combine<T extends unknown[]>(
        ...results: { [K in keyof T]: Result<T[K], DomainError> }
    ): Result<T, DomainError> {
        const values: T = [] as unknown as T;
        for (const result of results) {
            if (result.isFailure) {
                return result;
            }
            values.push(result.value);
        }
        return Success.create(values);
    },

    /**
     * Maps over an array of Results, collecting successes or returning first failure.
     *
     * @param results - Array of Results
     * @returns Result with array of values or first failure
     *
     * @example
     * ```typescript
     * const emailResults = emails.map(e => Email.create(e));
     * const validEmails = Results.all(emailResults);
     * // validEmails is Success<Email[]> or Failure<DomainError>
     * ```
     */
    all<T>(results: Result<T, DomainError>[]): Result<T[], DomainError> {
        const values: T[] = [];
        for (const result of results) {
            if (result.isFailure) {
                return result;
            }
            values.push(result.value);
        }
        return Success.create(values);
    },

    /**
     * Executes async operations sequentially, stopping on first failure.
     *
     * @param operations - Array of async operation functions
     * @returns Result with array of values or first failure
     *
     * @example
     * ```typescript
     * const result = await Results.sequence([
     *   () => validateUser(userId),
     *   () => checkPermissions(userId),
     *   () => performAction()
     * ]);
     * ```
     */
    async sequence<T>(
        operations: (() => Promise<Result<T, DomainError>>)[]
    ): Promise<Result<T[], DomainError>> {
        const results: T[] = [];
        for (const op of operations) {
            const result = await op();
            if (result.isFailure) {
                return result;
            }
            results.push(result.value);
        }
        return Success.create(results);
    },

    /**
     * Executes async operations in parallel, collecting all failures.
     *
     * @param operations - Array of async operation functions
     * @returns Result with array of values or aggregated failure
     *
     * @example
     * ```typescript
     * const result = await Results.parallel([
     *   () => fetchUser(id1),
     *   () => fetchUser(id2),
     *   () => fetchUser(id3)
     * ]);
     * ```
     */
    async parallel<T>(
        operations: (() => Promise<Result<T, DomainError>>)[]
    ): Promise<Result<T[], DomainError>> {
        const results = await Promise.all(operations.map((op) => op()));
        const failures = results.filter((r) => r.isFailure);

        if (failures.length > 0) {
            const messages = failures.map((f) => f.error.message).join(', ');
            return Failure.create(
                new DomainError('MULTIPLE_FAILURES', `Multiple failures: ${messages}`)
            );
        }

        return Success.create(results.map((r) => (r as Success<T>).value));
    },

    /**
     * Retries an operation with exponential backoff.
     *
     * @param operation - The operation to retry
     * @param options - Retry options (maxRetries, delay)
     * @returns Result of the operation after retries
     *
     * @example
     * ```typescript
     * const result = await Results.retry(
     *   () => callExternalAPI(),
     *   { maxRetries: 3, delay: 100 }
     * );
     * ```
     */
    async retry<T>(
        operation: () => Promise<Result<T, DomainError>>,
        options: { maxRetries?: number; delay?: number } = {}
    ): Promise<Result<T, DomainError>> {
        const { maxRetries = 3, delay = 100 } = options;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const result = await operation();
            if (result.isSuccess) {
                return result;
            }

            if (attempt < maxRetries) {
                await new Promise((resolve) =>
                    setTimeout(resolve, delay * Math.pow(2, attempt))
                );
            }
        }

        return Failure.create(
            new DomainError('MAX_RETRIES_EXCEEDED', 'Operation failed after retries')
        );
    },

    /**
     * Converts a Result to an optional value.
     *
     * @param result - The Result to convert
     * @returns The value if Success, null if Failure
     *
     * @example
     * ```typescript
     * const email: string | null = Results.toOptional(emailResult);
     * ```
     */
    toOptional<T>(result: Result<T, DomainError>): T | null {
        return result.isSuccess ? result.value : null;
    },

    /**
     * Throws if Failure, returns value if Success.
     * Use with caution - prefer explicit error handling.
     *
     * @param result - The Result to unwrap
     * @returns The success value
     * @throws The error if Failure
     *
     * @example
     * ```typescript
     * const value = Results.unwrapOrThrow(result); // throws if failure
     * ```
     */
    unwrapOrThrow<T>(result: Result<T, DomainError>): T {
        if (result.isSuccess) {
            return result.value;
        }
        throw result.error;
    },
};
