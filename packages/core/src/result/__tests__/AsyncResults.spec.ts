import { describe, it, expect } from 'vitest';
import { AsyncResults } from '../AsyncResults.js';
import { Success, Failure } from '../Result.js';
import { DomainError } from '../../errors/DomainError.js';

describe('AsyncResults', () => {
    describe('fromPromise', () => {
        it('should convert successful promise to Success', async () => {
            const promise = Promise.resolve(42);

            const result = await AsyncResults.fromPromise(promise);

            expect(result.isSuccess).toBe(true);
            if (result.isSuccess) {
                expect(result.value).toBe(42);
            }
        });

        it('should convert rejected promise to Failure', async () => {
            const promise = Promise.reject(new Error('Test error'));

            const result = await AsyncResults.fromPromise(promise);

            expect(result.isFailure).toBe(true);
            if (result.isFailure) {
                expect(result.error).toBeInstanceOf(DomainError);
                expect(result.error.code).toBe('OPERATION_FAILED');
            }
        });

        it('should use custom error mapper', async () => {
            const promise = Promise.reject(new Error('Test error'));

            const result = await AsyncResults.fromPromise(
                promise,
                (error) => new DomainError('CUSTOM_ERROR', `Custom: ${error}`)
            );

            expect(result.isFailure).toBe(true);
            if (result.isFailure) {
                expect(result.error.code).toBe('CUSTOM_ERROR');
                expect(result.error.message).toContain('Custom');
            }
        });

        it('should handle thrown errors', async () => {
            const promise = new Promise(() => {
                throw new Error('Thrown error');
            });

            const result = await AsyncResults.fromPromise(promise);

            expect(result.isFailure).toBe(true);
        });
    });

    describe('map', () => {
        it('should map over successful result', async () => {
            const result = Promise.resolve(Success.create(5));

            const mapped = await AsyncResults.map(result, (n) => n * 2);

            expect(mapped.isSuccess).toBe(true);
            if (mapped.isSuccess) {
                expect(mapped.value).toBe(10);
            }
        });

        it('should pass through failure', async () => {
            const error = new DomainError('TEST_ERROR', 'Test');
            const result = Promise.resolve(Failure.create(error));

            const mapped = await AsyncResults.map(result, (n: number) => n * 2);

            expect(mapped.isFailure).toBe(true);
            if (mapped.isFailure) {
                expect(mapped.error).toBe(error);
            }
        });

        it('should handle async mapping function', async () => {
            const result = Promise.resolve(Success.create(5));

            const mapped = await AsyncResults.map(result, async (n) => {
                await new Promise((resolve) => setTimeout(resolve, 10));
                return n * 2;
            });

            expect(mapped.isSuccess).toBe(true);
            if (mapped.isSuccess) {
                expect(mapped.value).toBe(10);
            }
        });

        it('should handle type transformation', async () => {
            const result = Promise.resolve(Success.create(42));

            const mapped = await AsyncResults.map(result, (n) => `Number: ${n}`);

            expect(mapped.isSuccess).toBe(true);
            if (mapped.isSuccess) {
                expect(mapped.value).toBe('Number: 42');
            }
        });
    });

    describe('flatMap', () => {
        it('should chain successful results', async () => {
            const result = Promise.resolve(Success.create(5));

            const chained = await AsyncResults.flatMap(result, async (n) =>
                Success.create(n * 2)
            );

            expect(chained.isSuccess).toBe(true);
            if (chained.isSuccess) {
                expect(chained.value).toBe(10);
            }
        });

        it('should pass through initial failure', async () => {
            const error = new DomainError('INITIAL_ERROR', 'Initial');
            const result = Promise.resolve(Failure.create(error));

            const chained = await AsyncResults.flatMap(result, async (n: number) =>
                Success.create(n * 2)
            );

            expect(chained.isFailure).toBe(true);
            if (chained.isFailure) {
                expect(chained.error).toBe(error);
            }
        });

        it('should propagate failure from chained operation', async () => {
            const result = Promise.resolve(Success.create(5));
            const chainError = new DomainError('CHAIN_ERROR', 'Chain');

            const chained = await AsyncResults.flatMap(result, async () =>
                Failure.create(chainError)
            );

            expect(chained.isFailure).toBe(true);
            if (chained.isFailure) {
                expect(chained.error).toBe(chainError);
            }
        });

        it('should allow type transformation', async () => {
            const result = Promise.resolve(Success.create(42));

            const chained = await AsyncResults.flatMap(result, async (n) =>
                Success.create(`Number: ${n}`)
            );

            expect(chained.isSuccess).toBe(true);
            if (chained.isSuccess) {
                expect(chained.value).toBe('Number: 42');
            }
        });
    });

    describe('sequence', () => {
        it('should execute operations in sequence', async () => {
            const operations = [
                async () => Success.create(1),
                async () => Success.create(2),
                async () => Success.create(3),
            ];

            const result = await AsyncResults.sequence(operations);

            expect(result.isSuccess).toBe(true);
            if (result.isSuccess) {
                expect(result.value).toEqual([1, 2, 3]);
            }
        });

        it('should short-circuit on first failure', async () => {
            const error = new DomainError('SECOND_FAILED', 'Second operation failed');
            let thirdCalled = false;

            const operations = [
                async () => Success.create(1),
                async () => Failure.create(error),
                async () => {
                    thirdCalled = true;
                    return Success.create(3);
                },
            ];

            const result = await AsyncResults.sequence(operations);

            expect(result.isFailure).toBe(true);
            if (result.isFailure) {
                expect(result.error).toBe(error);
            }
            expect(thirdCalled).toBe(false);
        });

        it('should handle empty array', async () => {
            const result = await AsyncResults.sequence([]);

            expect(result.isSuccess).toBe(true);
            if (result.isSuccess) {
                expect(result.value).toEqual([]);
            }
        });
    });

    describe('parallel', () => {
        it('should execute operations in parallel', async () => {
            const operations = [
                async () => {
                    await new Promise((resolve) => setTimeout(resolve, 10));
                    return Success.create(1);
                },
                async () => {
                    await new Promise((resolve) => setTimeout(resolve, 10));
                    return Success.create(2);
                },
                async () => {
                    await new Promise((resolve) => setTimeout(resolve, 10));
                    return Success.create(3);
                },
            ];

            const result = await AsyncResults.parallel(operations);

            expect(result.isSuccess).toBe(true);
            if (result.isSuccess) {
                expect(result.value).toEqual([1, 2, 3]);
            }
        });

        it('should return failure if any operation fails', async () => {
            const error = new DomainError('PARALLEL_ERROR', 'One failed');

            const operations = [
                async () => Success.create(1),
                async () => Failure.create(error),
                async () => Success.create(3),
            ];

            const result = await AsyncResults.parallel(operations);

            expect(result.isFailure).toBe(true);
            if (result.isFailure) {
                expect(result.error.code).toBe('PARALLEL_ERROR');
            }
        });

        it('should handle empty array', async () => {
            const result = await AsyncResults.parallel([]);

            expect(result.isSuccess).toBe(true);
            if (result.isSuccess) {
                expect(result.value).toEqual([]);
            }
        });
    });

    describe('real-world scenarios', () => {
        it('should handle repository operations', async () => {
            // Simulate repository that might throw
            const repository = {
                findById: async (id: string) => {
                    if (id === 'valid') {
                        return { id, name: 'Test User' };
                    }
                    throw new Error('Not found');
                },
            };

            const result = await AsyncResults.fromPromise(
                repository.findById('valid'),
                (error) => new DomainError('NOT_FOUND', String(error))
            );

            expect(result.isSuccess).toBe(true);
        });

        it('should chain multiple async operations', async () => {
            const getUserId = async () => Success.create('user-123');
            const loadUser = async (id: string) =>
                Success.create({ id, name: 'John' });
            const formatUser = async (user: { id: string; name: string }) =>
                Success.create(`${user.name} (${user.id})`);

            const result = await AsyncResults.flatMap(
                getUserId(),
                async (userId) =>
                    await AsyncResults.flatMap(loadUser(userId), formatUser)
            );

            expect(result.isSuccess).toBe(true);
            if (result.isSuccess) {
                expect(result.value).toBe('John (user-123)');
            }
        });
    });
});
