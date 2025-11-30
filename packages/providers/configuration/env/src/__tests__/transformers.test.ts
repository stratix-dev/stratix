import { describe, it, expect } from 'vitest';
import {
  toNumber,
  toInt,
  toFloat,
  toBoolean,
  toArray,
  toJSON,
  autoTransform,
} from '../transformers.js';

describe('Transformers', () => {
  describe('toNumber', () => {
    it('should convert string to number', () => {
      expect(toNumber('123')).toBe(123);
      expect(toNumber('123.45')).toBe(123.45);
      expect(toNumber('-99')).toBe(-99);
    });

    it('should throw on invalid number', () => {
      expect(() => toNumber('abc')).toThrow();
      expect(() => toNumber('12abc')).toThrow();
    });
  });

  describe('toInt', () => {
    it('should convert string to integer', () => {
      expect(toInt('123')).toBe(123);
      expect(toInt('123.99')).toBe(123); // Truncates
      expect(toInt('-99')).toBe(-99);
    });

    it('should throw on invalid integer', () => {
      expect(() => toInt('abc')).toThrow();
    });
  });

  describe('toFloat', () => {
    it('should convert string to float', () => {
      expect(toFloat('123.45')).toBe(123.45);
      expect(toFloat('123')).toBe(123);
      expect(toFloat('-99.99')).toBe(-99.99);
    });

    it('should throw on invalid float', () => {
      expect(() => toFloat('abc')).toThrow();
    });
  });

  describe('toBoolean', () => {
    it('should convert truthy strings to true', () => {
      expect(toBoolean('true')).toBe(true);
      expect(toBoolean('TRUE')).toBe(true);
      expect(toBoolean('1')).toBe(true);
      expect(toBoolean('yes')).toBe(true);
      expect(toBoolean('YES')).toBe(true);
      expect(toBoolean('on')).toBe(true);
      expect(toBoolean('ON')).toBe(true);
    });

    it('should convert falsy strings to false', () => {
      expect(toBoolean('false')).toBe(false);
      expect(toBoolean('FALSE')).toBe(false);
      expect(toBoolean('0')).toBe(false);
      expect(toBoolean('no')).toBe(false);
      expect(toBoolean('NO')).toBe(false);
      expect(toBoolean('off')).toBe(false);
      expect(toBoolean('OFF')).toBe(false);
    });

    it('should throw on invalid boolean', () => {
      expect(() => toBoolean('maybe')).toThrow();
      expect(() => toBoolean('2')).toThrow();
    });
  });

  describe('toArray', () => {
    it('should split comma-separated values', () => {
      expect(toArray('a,b,c')).toEqual(['a', 'b', 'c']);
      expect(toArray('one, two, three')).toEqual(['one', 'two', 'three']);
    });

    it('should handle empty values', () => {
      expect(toArray('')).toEqual([]);
      expect(toArray('a,,b')).toEqual(['a', 'b']);
    });

    it('should trim whitespace', () => {
      expect(toArray(' a , b , c ')).toEqual(['a', 'b', 'c']);
    });
  });

  describe('toJSON', () => {
    it('should parse JSON object', () => {
      expect(toJSON('{"key":"value"}')).toEqual({ key: 'value' });
    });

    it('should parse JSON array', () => {
      expect(toJSON('[1,2,3]')).toEqual([1, 2, 3]);
    });

    it('should throw on invalid JSON', () => {
      expect(() => toJSON('invalid')).toThrow();
      expect(() => toJSON('{key:value}')).toThrow();
    });
  });

  describe('autoTransform', () => {
    it('should detect and convert booleans', () => {
      expect(autoTransform('true')).toBe(true);
      expect(autoTransform('false')).toBe(false);
      expect(autoTransform('TRUE')).toBe(true);
      expect(autoTransform('FALSE')).toBe(false);
    });

    it('should detect and convert numbers', () => {
      expect(autoTransform('123')).toBe(123);
      expect(autoTransform('123.45')).toBe(123.45);
      expect(autoTransform('-99')).toBe(-99);
    });

    it('should detect and convert JSON arrays', () => {
      expect(autoTransform('[1,2,3]')).toEqual([1, 2, 3]);
      expect(autoTransform('["a","b"]')).toEqual(['a', 'b']);
    });

    it('should detect and convert JSON objects', () => {
      expect(autoTransform('{"key":"value"}')).toEqual({ key: 'value' });
    });

    it('should detect and convert comma-separated arrays', () => {
      expect(autoTransform('a,b,c')).toEqual(['a', 'b', 'c']);
    });

    it('should keep strings as-is when no pattern matches', () => {
      expect(autoTransform('hello')).toBe('hello');
      expect(autoTransform('hello world')).toBe('hello world');
    });

    it('should handle edge cases', () => {
      expect(autoTransform('')).toBe('');
      expect(autoTransform('0')).toBe(0);
      expect(autoTransform('1')).toBe(1);
    });
  });
});
