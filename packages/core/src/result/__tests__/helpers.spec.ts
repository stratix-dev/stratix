import { describe, it, expect, vi } from 'vitest';
import { Results } from '../helpers.js';
import { Success, Failure } from '../Result.js';
import { DomainError } from '../../errors/DomainError.js';

describe('Results Helpers', () => {
  describe('combine', () => {
    it('should combine multiple successful results into tuple', () => {
      const result1 = Success.create(5);
      const result2 = Success.create('hello');
      const result3 = Success.create(true);

      const combined = Results.combine(result1, result2, result3);

      expect(combined.isSuccess).toBe(true);
      if (combined.isSuccess) {
        expect(combined.value).toEqual([5, 'hello', true]);
      }
    });

    it('should return first failure when any result fails', () => {
      const result1 = Success.create(5);
      const result2 = Failure.create(new DomainError('ERROR', 'Failed'));
      const result3 = Success.create(true);

      const combined = Results.combine(result1, result2, result3);

      expect(combined.isFailure).toBe(true);
      if (combined.isFailure) {
        expect(combined.error.code).toBe('ERROR');
      }
    });

    it('should work with two results', () => {
      const result1 = Success.create(10);
      const result2 = Success.create(20);

      const combined = Results.combine(result1, result2);

      expect(combined.isSuccess).toBe(true);
      if (combined.isSuccess) {
        expect(combined.value).toEqual([10, 20]);
      }
    });
  });

  describe('all', () => {
    it('should collect all successful results into array', () => {
      const results = [Success.create(1), Success.create(2), Success.create(3)];

      const all = Results.all(results);

      expect(all.isSuccess).toBe(true);
      if (all.isSuccess) {
        expect(all.value).toEqual([1, 2, 3]);
      }
    });

    it('should return first failure from array', () => {
      const results = [
        Success.create(1),
        Failure.create(new DomainError('ERROR1', 'First error')),
        Failure.create(new DomainError('ERROR2', 'Second error'))
      ];

      const all = Results.all(results);

      expect(all.isFailure).toBe(true);
      if (all.isFailure) {
        expect(all.error.code).toBe('ERROR1');
      }
    });

    it('should handle empty array', () => {
      const results: Success<number>[] = [];

      const all = Results.all(results);

      expect(all.isSuccess).toBe(true);
      if (all.isSuccess) {
        expect(all.value).toEqual([]);
      }
    });
  });

  describe('sequence', () => {
    it('should execute operations sequentially and collect results', async () => {
      const executionOrder: number[] = [];

      const operations = [
        async () => {
          executionOrder.push(1);
          return Success.create(1);
        },
        async () => {
          executionOrder.push(2);
          return Success.create(2);
        },
        async () => {
          executionOrder.push(3);
          return Success.create(3);
        }
      ];

      const result = await Results.sequence(operations);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value).toEqual([1, 2, 3]);
      }
      expect(executionOrder).toEqual([1, 2, 3]);
    });

    it('should stop on first failure', async () => {
      let executionCount = 0;

      const operations = [
        async () => {
          executionCount++;
          return Success.create(1);
        },
        async () => {
          executionCount++;
          return Failure.create(new DomainError('ERROR', 'Failed'));
        },
        async () => {
          executionCount++;
          return Success.create(3);
        }
      ];

      const result = await Results.sequence(operations);

      expect(result.isFailure).toBe(true);
      expect(executionCount).toBe(2); // Should stop after second operation
    });
  });

  describe('parallel', () => {
    it('should execute operations in parallel and collect results', async () => {
      const operations = [
        async () => Success.create(1),
        async () => Success.create(2),
        async () => Success.create(3)
      ];

      const result = await Results.parallel(operations);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value).toEqual([1, 2, 3]);
      }
    });

    it('should aggregate failures', async () => {
      const operations = [
        async () => Success.create(1),
        async () => Failure.create(new DomainError('ERROR1', 'First error')),
        async () => Failure.create(new DomainError('ERROR2', 'Second error'))
      ];

      const result = await Results.parallel(operations);

      expect(result.isFailure).toBe(true);
      if (result.isFailure) {
        expect(result.error.code).toBe('MULTIPLE_FAILURES');
        expect(result.error.message).toContain('First error');
        expect(result.error.message).toContain('Second error');
      }
    });
  });

  describe('retry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn(async () => Success.create(42));

      const result = await Results.retry(operation);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value).toBe(42);
      }
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry and eventually succeed', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          return Failure.create(new DomainError('TEMP_ERROR', 'Temporary error'));
        }
        return Success.create('success');
      };

      const result = await Results.retry(operation, { maxRetries: 3, delay: 10 });

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value).toBe('success');
      }
      expect(attempts).toBe(3);
    });

    it('should fail after max retries', async () => {
      const operation = async () =>
        Failure.create(new DomainError('PERSISTENT_ERROR', 'Always fails'));

      const result = await Results.retry(operation, { maxRetries: 2, delay: 10 });

      expect(result.isFailure).toBe(true);
      if (result.isFailure) {
        expect(result.error.code).toBe('MAX_RETRIES_EXCEEDED');
      }
    });
  });

  describe('toOptional', () => {
    it('should return value for success', () => {
      const result = Success.create(42);

      const optional = Results.toOptional(result);

      expect(optional).toBe(42);
    });

    it('should return null for failure', () => {
      const result = Failure.create(new DomainError('ERROR', 'Failed'));

      const optional = Results.toOptional(result);

      expect(optional).toBeNull();
    });
  });

  describe('unwrapOrThrow', () => {
    it('should return value for success', () => {
      const result = Success.create(42);

      const value = Results.unwrapOrThrow(result);

      expect(value).toBe(42);
    });

    it('should throw error for failure', () => {
      const error = new DomainError('ERROR', 'Failed');
      const result = Failure.create(error);

      expect(() => Results.unwrapOrThrow(result)).toThrow(error);
    });
  });
});
