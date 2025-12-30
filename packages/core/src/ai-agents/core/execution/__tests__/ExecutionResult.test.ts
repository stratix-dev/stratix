import { describe, it, expect, vi } from 'vitest';
import {
  ExecutionResult,
  ExecutionResultHelpers,
} from '../ExecutionResult.js';
import { Success, Failure } from '../../../../result/Result.js';
import { ExecutionMetadataHelpers } from '../../../shared/ExecutionMetadata.js';
import { TokenUsageHelpers } from '../../../shared/TokenUsage.js';

describe('ExecutionResult', () => {
  describe('success', () => {
    it('should create successful result', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const result = ExecutionResult.success('hello', metadata);

      expect(result.success).toBe(true);
      expect(result.value).toBe('hello');
      expect(result.error).toBeUndefined();
      expect(result.metadata).toBe(metadata);
      expect(result.warnings).toEqual([]);
      expect(result.partial).toBe(false);
    });

    it('should create successful result with warnings', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const warnings = ['Warning 1', 'Warning 2'];
      const result = ExecutionResult.success('hello', metadata, warnings);

      expect(result.isSuccess()).toBe(true);
      expect(result.warnings).toEqual(warnings);
      expect(result.partial).toBe(false);
    });

    it('should freeze warnings array', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const warnings = ['Warning 1'];
      const result = ExecutionResult.success('hello', metadata, warnings);

      expect(Object.isFrozen(result.warnings)).toBe(true);
    });
  });

  describe('partial', () => {
    it('should create partial result', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const warnings = ['Result truncated'];
      const result = ExecutionResult.partial('partial data', metadata, warnings);

      expect(result.success).toBe(true);
      expect(result.value).toBe('partial data');
      expect(result.error).toBeUndefined();
      expect(result.warnings).toEqual(warnings);
      expect(result.partial).toBe(true);
    });

    it('should throw if no warnings provided', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');

      expect(() => {
        ExecutionResult.partial('data', metadata, []);
      }).toThrow('Partial results must have at least one warning');
    });

    it('should require at least one warning', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');

      // Should not throw
      const result = ExecutionResult.partial('data', metadata, ['Warning']);

      expect(result.warnings).toHaveLength(1);
    });
  });

  describe('failure', () => {
    it('should create failed result', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const error = new Error('Something went wrong');
      const result = ExecutionResult.failure(error, metadata);

      expect(result.success).toBe(false);
      expect(result.value).toBeUndefined();
      expect(result.error).toBe(error);
      expect(result.metadata).toBe(metadata);
      expect(result.warnings).toEqual([]);
      expect(result.partial).toBe(false);
    });

    it('should create failed result with partial value', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const error = new Error('Failed halfway');
      const result = ExecutionResult.failure(error, metadata, 'partial data');

      expect(result.isFailure()).toBe(true);
      expect(result.value).toBe('partial data');
      expect(result.error).toBe(error);
      expect(result.partial).toBe(true);
    });

    it('should not mark as partial without partial value', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const error = new Error('Failed');
      const result = ExecutionResult.failure(error, metadata);

      expect(result.partial).toBe(false);
    });
  });

  describe('type guards', () => {
    it('isSuccess should narrow type', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const result = ExecutionResult.success('hello', metadata);

      if (result.isSuccess()) {
        // TypeScript should know value exists
        const value: string = result.value;
        expect(value).toBe('hello');
      } else {
        throw new Error('Should be success');
      }
    });

    it('isFailure should narrow type', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const error = new Error('Failed');
      const result = ExecutionResult.failure<string>(error, metadata);

      if (result.isFailure()) {
        // TypeScript should know error exists
        const err: Error = result.error;
        expect(err).toBe(error);
      } else {
        throw new Error('Should be failure');
      }
    });

    it('isSuccess should return false for failures', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const result = ExecutionResult.failure(new Error('Failed'), metadata);

      expect(result.isSuccess()).toBe(false);
    });

    it('isFailure should return false for successes', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const result = ExecutionResult.success('hello', metadata);

      expect(result.isFailure()).toBe(false);
    });
  });

  describe('hasWarnings', () => {
    it('should return true when warnings exist', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const result = ExecutionResult.success('hello', metadata, ['Warning']);

      expect(result.hasWarnings()).toBe(true);
    });

    it('should return false when no warnings', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const result = ExecutionResult.success('hello', metadata);

      expect(result.hasWarnings()).toBe(false);
    });
  });

  describe('isPartial', () => {
    it('should return true for partial results', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const result = ExecutionResult.partial('data', metadata, ['Warning']);

      expect(result.isPartial()).toBe(true);
    });

    it('should return false for complete successes', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const result = ExecutionResult.success('data', metadata);

      expect(result.isPartial()).toBe(false);
    });

    it('should return true for failures with partial value', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const result = ExecutionResult.failure(
        new Error('Failed'),
        metadata,
        'partial data'
      );

      expect(result.isPartial()).toBe(true);
    });
  });

  describe('unwrap', () => {
    it('should return value for success', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const result = ExecutionResult.success('hello', metadata);

      expect(result.unwrap()).toBe('hello');
    });

    it('should throw error for failure', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const error = new Error('Failed');
      const result = ExecutionResult.failure(error, metadata);

      expect(() => result.unwrap()).toThrow(error);
    });
  });

  describe('unwrapOr', () => {
    it('should return value for success', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const result = ExecutionResult.success('hello', metadata);

      expect(result.unwrapOr('default')).toBe('hello');
    });

    it('should return default for failure', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const result = ExecutionResult.failure(new Error('Failed'), metadata);

      expect(result.unwrapOr('default')).toBe('default');
    });
  });

  describe('unwrapOrElse', () => {
    it('should return value for success', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const result = ExecutionResult.success('hello', metadata);

      expect(result.unwrapOrElse(() => 'default')).toBe('hello');
    });

    it('should compute default for failure', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const error = new Error('Failed');
      const result = ExecutionResult.failure<string>(error, metadata);

      const value = result.unwrapOrElse((e) => `Error: ${e.message}`);

      expect(value).toBe('Error: Failed');
    });

    it('should receive error in callback', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const error = new Error('Custom error');
      const result = ExecutionResult.failure<string>(error, metadata);

      const callback = vi.fn((e: Error) => e.message);
      result.unwrapOrElse(callback);

      expect(callback).toHaveBeenCalledWith(error);
    });
  });

  describe('map', () => {
    it('should transform success value', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const result = ExecutionResult.success(5, metadata);

      const mapped = result.map((n) => n * 2);

      expect(mapped.isSuccess()).toBe(true);
      expect(mapped.value).toBe(10);
      expect(mapped.metadata).toBe(metadata);
    });

    it('should preserve warnings and partial status', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const result = ExecutionResult.partial(5, metadata, ['Warning']);

      const mapped = result.map((n) => n * 2);

      expect(mapped.value).toBe(10);
      expect(mapped.warnings).toEqual(['Warning']);
      expect(mapped.partial).toBe(true);
    });

    it('should pass through failures', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const error = new Error('Failed');
      const result = ExecutionResult.failure<number>(error, metadata);

      const mapped = result.map((n) => n * 2);

      expect(mapped.isFailure()).toBe(true);
      expect(mapped.error).toBe(error);
    });

    it('should catch errors and return failure', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const result = ExecutionResult.success(5, metadata);

      const mapped = result.map(() => {
        throw new Error('Mapping failed');
      });

      expect(mapped.isFailure()).toBe(true);
      expect(mapped.error?.message).toBe('Mapping failed');
    });

    it('should allow type transformation', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const result = ExecutionResult.success(42, metadata);

      const mapped = result.map((n) => n.toString());

      expect(mapped.isSuccess()).toBe(true);
      expect(mapped.value).toBe('42');
      expect(typeof mapped.value).toBe('string');
    });
  });

  describe('flatMap', () => {
    it('should chain success results', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const result = ExecutionResult.success(5, metadata);

      const chained = result.flatMap((n) =>
        ExecutionResult.success(n * 2, metadata)
      );

      expect(chained.isSuccess()).toBe(true);
      expect(chained.value).toBe(10);
    });

    it('should short-circuit on failure', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const result = ExecutionResult.success(5, metadata);

      const chained = result.flatMap(() =>
        ExecutionResult.failure(new Error('Inner failure'), metadata)
      );

      expect(chained.isFailure()).toBe(true);
      expect(chained.error?.message).toBe('Inner failure');
    });

    it('should pass through failures', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const error = new Error('Outer failure');
      const result = ExecutionResult.failure<number>(error, metadata);

      const callback = vi.fn();
      const chained = result.flatMap(callback);

      expect(callback).not.toHaveBeenCalled();
      expect(chained.isFailure()).toBe(true);
      expect(chained.error).toBe(error);
    });

    it('should catch errors and return failure', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const result = ExecutionResult.success(5, metadata);

      const chained = result.flatMap(() => {
        throw new Error('FlatMap failed');
      });

      expect(chained.isFailure()).toBe(true);
      expect(chained.error?.message).toBe('FlatMap failed');
    });
  });

  describe('mapError', () => {
    it('should transform error', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const error = new Error('Original error');
      const result = ExecutionResult.failure<string>(error, metadata);

      const mapped = result.mapError((e) => new Error(`Wrapped: ${e.message}`));

      expect(mapped.isFailure()).toBe(true);
      expect(mapped.error?.message).toBe('Wrapped: Original error');
    });

    it('should pass through successes', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const result = ExecutionResult.success('hello', metadata);

      const mapped = result.mapError(() => new Error('Should not be called'));

      expect(mapped.isSuccess()).toBe(true);
      expect(mapped.value).toBe('hello');
    });
  });

  describe('tap', () => {
    it('should call function on success', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const result = ExecutionResult.success('hello', metadata);

      const callback = vi.fn();
      const returned = result.tap(callback);

      expect(callback).toHaveBeenCalledWith('hello');
      expect(returned).toBe(result);
    });

    it('should not call function on failure', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const result = ExecutionResult.failure(new Error('Failed'), metadata);

      const callback = vi.fn();
      result.tap(callback);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should allow chaining', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const result = ExecutionResult.success(5, metadata);

      const values: number[] = [];
      result
        .tap((n) => values.push(n))
        .map((n) => n * 2)
        .tap((n) => values.push(n));

      expect(values).toEqual([5, 10]);
    });
  });

  describe('tapError', () => {
    it('should call function on failure', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const error = new Error('Failed');
      const result = ExecutionResult.failure(error, metadata);

      const callback = vi.fn();
      const returned = result.tapError(callback);

      expect(callback).toHaveBeenCalledWith(error);
      expect(returned).toBe(result);
    });

    it('should not call function on success', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const result = ExecutionResult.success('hello', metadata);

      const callback = vi.fn();
      result.tapError(callback);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('recover', () => {
    it('should convert failure to success', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const error = new Error('Failed');
      const result = ExecutionResult.failure<string>(error, metadata);

      const recovered = result.recover(() => 'fallback');

      expect(recovered.isSuccess()).toBe(true);
      expect(recovered.value).toBe('fallback');
      expect(recovered.warnings).toContain('Recovered from error: Failed');
    });

    it('should pass through successes', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const result = ExecutionResult.success('hello', metadata);

      const recovered = result.recover(() => 'fallback');

      expect(recovered.isSuccess()).toBe(true);
      expect(recovered.value).toBe('hello');
      expect(recovered.warnings).toEqual([]);
    });

    it('should handle recovery function errors', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const error = new Error('Original error');
      const result = ExecutionResult.failure<string>(error, metadata);

      const recovered = result.recover(() => {
        throw new Error('Recovery failed');
      });

      expect(recovered.isFailure()).toBe(true);
      expect(recovered.error?.message).toBe('Recovery failed');
    });
  });

  describe('toResult', () => {
    it('should convert success to Result', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const execResult = ExecutionResult.success('hello', metadata);

      const result = execResult.toResult();

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe('hello');
    });

    it('should convert failure to Result', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const error = new Error('Failed');
      const execResult = ExecutionResult.failure<string>(error, metadata);

      const result = execResult.toResult();

      expect(result.isSuccess).toBe(false);
      expect(result.error).toBe(error);
    });

    it('should lose metadata and warnings', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4', {
        usage: TokenUsageHelpers.create(100, 50),
      });
      const execResult = ExecutionResult.success('hello', metadata, ['Warning']);

      const result = execResult.toResult();

      // Standard Result doesn't have metadata or warnings
      expect((result as any).metadata).toBeUndefined();
      expect((result as any).warnings).toBeUndefined();
    });
  });

  describe('fromResult', () => {
    it('should convert Success to ExecutionResult', () => {
      const standardResult = Success.create('hello');
      const metadata = ExecutionMetadataHelpers.create('gpt-4');

      const execResult = ExecutionResult.fromResult(standardResult, metadata);

      expect(execResult.isSuccess()).toBe(true);
      expect(execResult.value).toBe('hello');
      expect(execResult.metadata).toBe(metadata);
    });

    it('should convert Failure to ExecutionResult', () => {
      const error = new Error('Failed');
      const standardResult = Failure.create(error);
      const metadata = ExecutionMetadataHelpers.create('gpt-4');

      const execResult = ExecutionResult.fromResult(standardResult, metadata);

      expect(execResult.isFailure()).toBe(true);
      expect(execResult.error).toBe(error);
      expect(execResult.metadata).toBe(metadata);
    });
  });

  describe('toJSON', () => {
    it('should serialize success', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4', {
        usage: TokenUsageHelpers.create(100, 50),
        cost: 0.0075,
      });
      const result = ExecutionResult.success('hello', metadata, ['Warning']);

      const json = result.toJSON();

      expect(json).toHaveProperty('success', true);
      expect(json).toHaveProperty('value', 'hello');
      expect(json).toHaveProperty('error', undefined);
      expect(json).toHaveProperty('metadata');
      expect(json).toHaveProperty('warnings', ['Warning']);
      expect(json).toHaveProperty('partial', false);
    });

    it('should serialize failure with error details', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const error = new Error('Failed');
      error.stack = 'Error stack trace';
      const result = ExecutionResult.failure(error, metadata);

      const json: any = result.toJSON();

      expect(json.success).toBe(false);
      expect(json.error.name).toBe('Error');
      expect(json.error.message).toBe('Failed');
      expect(json.error.stack).toBe('Error stack trace');
    });

    it('should handle partial results', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const result = ExecutionResult.partial('data', metadata, ['Truncated']);

      const json: any = result.toJSON();

      expect(json.partial).toBe(true);
      expect(json.warnings).toEqual(['Truncated']);
    });
  });
});

describe('ExecutionResultHelpers', () => {
  describe('combine', () => {
    it('should combine multiple successes', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const results = [
        ExecutionResult.success(1, metadata),
        ExecutionResult.success(2, metadata),
        ExecutionResult.success(3, metadata),
      ];

      const combined = ExecutionResultHelpers.combine(results);

      expect(combined.isSuccess()).toBe(true);
      expect(combined.value).toEqual([1, 2, 3]);
    });

    it('should return first failure', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const error1 = new Error('First error');
      const error2 = new Error('Second error');

      const results = [
        ExecutionResult.success(1, metadata),
        ExecutionResult.failure<number>(error1, metadata),
        ExecutionResult.failure<number>(error2, metadata),
      ];

      const combined = ExecutionResultHelpers.combine(results);

      expect(combined.isFailure()).toBe(true);
      expect(combined.error).toBe(error1);
    });

    it('should combine warnings from all results', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const results = [
        ExecutionResult.success(1, metadata, ['Warning 1']),
        ExecutionResult.success(2, metadata, ['Warning 2', 'Warning 3']),
        ExecutionResult.success(3, metadata),
      ];

      const combined = ExecutionResultHelpers.combine(results);

      expect(combined.warnings).toEqual(['Warning 1', 'Warning 2', 'Warning 3']);
    });

    it('should detect partial results', () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const results = [
        ExecutionResult.success(1, metadata),
        ExecutionResult.partial(2, metadata, ['Partial']),
        ExecutionResult.success(3, metadata),
      ];

      const combined = ExecutionResultHelpers.combine(results);

      expect(combined.isSuccess()).toBe(true);
      expect(combined.isPartial()).toBe(true);
    });

    it('should handle empty array', () => {
      const combined = ExecutionResultHelpers.combine([]);

      expect(combined.isSuccess()).toBe(true);
      expect(combined.value).toEqual([]);
    });
  });

  describe('sequence', () => {
    it('should execute functions in sequence', async () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const executionOrder: number[] = [];

      const fns = [
        async () => {
          executionOrder.push(1);
          return ExecutionResult.success(1, metadata);
        },
        async () => {
          executionOrder.push(2);
          return ExecutionResult.success(2, metadata);
        },
        async () => {
          executionOrder.push(3);
          return ExecutionResult.success(3, metadata);
        },
      ];

      const result = await ExecutionResultHelpers.sequence(fns);

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toEqual([1, 2, 3]);
      expect(executionOrder).toEqual([1, 2, 3]);
    });

    it('should stop at first failure', async () => {
      const metadata = ExecutionMetadataHelpers.create('gpt-4');
      const executionOrder: number[] = [];

      const fns = [
        async () => {
          executionOrder.push(1);
          return ExecutionResult.success(1, metadata);
        },
        async () => {
          executionOrder.push(2);
          return ExecutionResult.failure(new Error('Failed'), metadata);
        },
        async () => {
          executionOrder.push(3);
          return ExecutionResult.success(3, metadata);
        },
      ];

      const result = await ExecutionResultHelpers.sequence(fns);

      expect(result.isFailure()).toBe(true);
      expect(executionOrder).toEqual([1, 2]); // Stopped after failure
    });

    it('should handle empty array', async () => {
      const result = await ExecutionResultHelpers.sequence([]);

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toEqual([]);
    });
  });
});
