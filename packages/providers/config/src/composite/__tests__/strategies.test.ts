import { describe, it, expect } from 'vitest';
import {
  firstWins,
  lastWins,
  merge,
  applyStrategy,
} from '../strategies.js';

describe('Configuration Merge Strategies', () => {
  describe('firstWins', () => {
    it('should return first non-undefined value', () => {
      expect(firstWins([undefined, 'second', 'third'])).toBe('second');
      expect(firstWins(['first', 'second', 'third'])).toBe('first');
    });

    it('should return undefined if all values are undefined', () => {
      expect(firstWins([undefined, undefined, undefined])).toBeUndefined();
    });

    it('should handle empty array', () => {
      expect(firstWins([])).toBeUndefined();
    });
  });

  describe('lastWins', () => {
    it('should return last non-undefined value', () => {
      expect(lastWins(['first', 'second', undefined])).toBe('second');
      expect(lastWins(['first', 'second', 'third'])).toBe('third');
    });

    it('should return undefined if all values are undefined', () => {
      expect(lastWins([undefined, undefined, undefined])).toBeUndefined();
    });

    it('should handle empty array', () => {
      expect(lastWins([])).toBeUndefined();
    });
  });

  describe('merge', () => {
    it('should deep merge objects', () => {
      const result = merge([
        { a: 1, b: { x: 10 } },
        { b: { y: 20 }, c: 3 },
      ]);

      expect(result).toEqual({
        a: 1,
        b: { x: 10, y: 20 },
        c: 3,
      });
    });

    it('should use last-wins for primitives', () => {
      const result = merge([
        { port: 3000 },
        { port: 8080 },
      ]);

      expect(result).toEqual({ port: 8080 });
    });

    it('should use last-wins for arrays', () => {
      const result = merge([
        { tags: ['a', 'b'] },
        { tags: ['c', 'd'] },
      ]);

      expect(result).toEqual({ tags: ['c', 'd'] });
    });

    it('should handle nested objects', () => {
      const result = merge([
        {
          database: {
            host: 'localhost',
            port: 5432,
            pool: {
              min: 2,
              max: 10,
            },
          },
        },
        {
          database: {
            port: 5433,
            pool: {
              max: 20,
            },
          },
        },
      ]);

      expect(result).toEqual({
        database: {
          host: 'localhost',
          port: 5433,
          pool: {
            min: 2,
            max: 20,
          },
        },
      });
    });

    it('should filter out undefined values', () => {
      const result = merge([
        { a: 1 },
        undefined,
        { b: 2 },
      ]);

      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should return undefined if all values are undefined', () => {
      expect(merge([undefined, undefined])).toBeUndefined();
    });

    it('should return single value if only one defined', () => {
      expect(merge([{ a: 1 }])).toEqual({ a: 1 });
    });
  });

  describe('applyStrategy', () => {
    const values = ['first', 'second', 'third'];

    it('should apply first-wins strategy', () => {
      expect(applyStrategy('first-wins', values)).toBe('first');
    });

    it('should apply last-wins strategy', () => {
      expect(applyStrategy('last-wins', values)).toBe('third');
    });

    it('should apply merge strategy for objects', () => {
      const objects = [
        { a: 1, b: 2 },
        { b: 3, c: 4 },
      ];
      expect(applyStrategy('merge', objects)).toEqual({
        a: 1,
        b: 3,
        c: 4,
      });
    });

    it('should throw error for unknown strategy', () => {
      // @ts-expect-error Testing invalid strategy
      expect(() => applyStrategy('unknown', values)).toThrow();
    });
  });
});
