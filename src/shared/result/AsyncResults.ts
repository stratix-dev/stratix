import { DomainError } from '../../ddd/DomainError.js';
import { Result, Success, Failure } from './Result.js';

/**
 * Helpers for working with async operations that return Results.
 *
 * These helpers simplify common patterns when dealing with Promises and Results,
 * reducing boilerplate code and improving error handling.
 *
 * @example
 * ```TypeScript
 * // Wrap async operation that might throw
 * const result = await AsyncResults.fromPromise(
 *   fetch('/api/users'),
 *   (error) => new DomainError('FETCH_ERROR', String(error))
 * );
 *
 * // Chain async operations
 * const finalResult = await AsyncResults.flatMap(
 *   AsyncResults.fromPromise(getUserId()),
 *   async (userId) => getUserData(userId)
 * );
 * ```
 */
export const AsyncResults = {
  /**
   * Wraps a Promise that might throw into a Result.
   *
   * Catches any errors from the promise and converts them to Failure with DomainError.
   *
   * @param promise - The promise to wrap
   * @param errorMapper - Optional function to map error to DomainError
   * @returns Promise resolving to Success or Failure
   *
   * @example
   * ```TypeScript
   * const result = await AsyncResults.fromPromise(
   *   repository.findById(id),
   *   (error) => new DomainError('DB_ERROR', `Database error: ${error}`)
   * );
   *
   * if (result.isSuccess) {
   *   console.log('Found:', result.value);
   * }
   * ```
   */
  async fromPromise<T>(
    promise: Promise<T>,
    errorMapper?: (error: unknown) => DomainError
  ): Promise<Result<T, DomainError>> {
    try {
      const value = await promise;
      return Success.create(value);
    } catch (error) {
      const domainError = errorMapper
        ? errorMapper(error)
        : new DomainError('OPERATION_FAILED', String(error));
      return Failure.create(domainError);
    }
  },

  /**
   * Maps over an async Result, transforming the success value.
   *
   * If the Result is a Failure, it's returned as-is.
   * The mapping function can be sync or async.
   *
   * @param result - Promise of Result to map over
   * @param fn - Mapping function (sync or async)
   * @returns Promise of mapped Result
   *
   * @example
   * ```TypeScript
   * const userResult = await getUserById(id);
   * const nameResult = await AsyncResults.map(
   *   userResult,
   *   (user) => user.name.toUpperCase()
   * );
   * ```
   */
  async map<T, U>(
    result: Promise<Result<T, DomainError>>,
    fn: (value: T) => U | Promise<U>
  ): Promise<Result<U, DomainError>> {
    const awaited = await result;
    if (awaited.isFailure) {
      return awaited;
    }
    const mapped = await fn(awaited.value);
    return Success.create(mapped);
  },

  /**
   * Flat maps over an async Result, chaining async operations that return Results.
   *
   * If the Result is a Failure, it's returned as-is without calling the function.
   * Useful for chaining async operations that can fail.
   *
   * @param result - Promise of Result to flat map over
   * @param fn - Function returning Promise of Result
   * @returns Promise of final Result
   *
   * @example
   * ```TypeScript
   * const result = await AsyncResults.flatMap(
   *   AsyncResults.fromPromise(getUserId()),
   *   async (userId) => {
   *     const user = await repository.findById(userId);
   *     return user ? Success.create(user) : Failure.create(notFoundError);
   *   }
   * );
   * ```
   */
  async flatMap<T, U>(
    result: Promise<Result<T, DomainError>>,
    fn: (value: T) => Promise<Result<U, DomainError>>
  ): Promise<Result<U, DomainError>> {
    const awaited = await result;
    if (awaited.isFailure) {
      return awaited;
    }
    return await fn(awaited.value);
  },

  /**
   * Executes multiple async Results in sequence, collecting all results.
   *
   * Similar to Results.sequence but for async operations.
   * Short-circuits on first failure.
   *
   * @param operations - Array of async operation functions
   * @returns Promise of Result with array of all success values
   *
   * @example
   * ```TypeScript
   * const results = await AsyncResults.sequence([
   *   () => saveUser(user1),
   *   () => saveUser(user2),
   *   () => saveUser(user3)
   * ]);
   *
   * if (results.isSuccess) {
   *   console.log('All saved:', results.value);
   * }
   * ```
   */
  async sequence<T>(
    operations: (() => Promise<Result<T, DomainError>>)[]
  ): Promise<Result<T[], DomainError>> {
    const results: T[] = [];

    for (const operation of operations) {
      const result = await operation();
      if (result.isFailure) {
        return result;
      }
      results.push(result.value);
    }

    return Success.create(results);
  },

  /**
   * Executes multiple async Results in parallel, collecting all results.
   *
   * Similar to Results.parallel but waits for all promises.
   * Returns first encountered failure, or success with all values.
   *
   * @param operations - Array of async operation functions
   * @returns Promise of Result with array of all success values
   *
   * @example
   * ```TypeScript
   * const results = await AsyncResults.parallel([
   *   () => fetchUser(id1),
   *   () => fetchUser(id2),
   *   () => fetchUser(id3)
   * ]);
   *
   * if (results.isSuccess) {
   *   console.log('All fetched:', results.value);
   * }
   * ```
   */
  async parallel<T>(
    operations: (() => Promise<Result<T, DomainError>>)[]
  ): Promise<Result<T[], DomainError>> {
    const promises = operations.map((op) => op());
    const results = await Promise.all(promises);

    const values: T[] = [];
    for (const result of results) {
      if (result.isFailure) {
        return result;
      }
      values.push(result.value);
    }

    return Success.create(values);
  }
};
