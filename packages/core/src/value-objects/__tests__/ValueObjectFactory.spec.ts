import { describe, it, expect } from 'vitest';
import { ValueObjectFactory } from '../ValueObjectFactory.js';
import { ValueObject } from '../../core/ValueObject.js';
import { Validators } from '../../validation/Validators.js';
import { DomainError } from '../../errors/DomainError.js';
import { Success, Failure } from '../../result/Result.js';

// Test Value Objects
class TestStringVO extends ValueObject {
  constructor(readonly value: string) {
    super();
  }

  protected getEqualityComponents(): unknown[] {
    return [this.value];
  }
}

class TestNumberVO extends ValueObject {
  constructor(readonly value: number) {
    super();
  }

  protected getEqualityComponents(): unknown[] {
    return [this.value];
  }
}

class TestEmail extends ValueObject {
  constructor(readonly value: string) {
    super();
  }

  static create(value: string) {
    return ValueObjectFactory.createString(value, TestEmail, [
      (v) => Validators.notEmpty(v, 'Email'),
      (v) => Validators.email(v)
    ]);
  }

  protected getEqualityComponents(): unknown[] {
    return [this.value];
  }
}

class TestPrice extends ValueObject {
  constructor(readonly value: number) {
    super();
  }

  static create(value: number) {
    return ValueObjectFactory.createNumber(value, TestPrice, [
      (v) => Validators.range(v, { min: 0, max: 1000000, fieldName: 'Price' })
    ]);
  }

  protected getEqualityComponents(): unknown[] {
    return [this.value];
  }
}

describe('ValueObjectFactory', () => {
  describe('createString', () => {
    it('should create Value Object with valid string', () => {
      const result = ValueObjectFactory.createString('test', TestStringVO);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value).toBeInstanceOf(TestStringVO);
        expect(result.value.value).toBe('test');
      }
    });

    it('should apply string validators', () => {
      const result = ValueObjectFactory.createString('test value', TestStringVO, [
        (v) => Validators.notEmpty(v, 'Test'),
        (v) => Validators.length(v, { min: 5, max: 20, fieldName: 'Test' })
      ]);

      expect(result.isSuccess).toBe(true);
    });

    it('should fail on invalid string validation', () => {
      const result = ValueObjectFactory.createString('ab', TestStringVO, [
        (v) => Validators.length(v, { min: 5, fieldName: 'Test' })
      ]);

      expect(result.isFailure).toBe(true);
      if (result.isFailure) {
        expect(result.error).toBeInstanceOf(DomainError);
      }
    });

    it('should pass transformed value between validators', () => {
      const result = ValueObjectFactory.createString('  test  ', TestStringVO, [
        (v) => Success.create(v.trim()),
        (v) => Validators.length(v, { min: 4, max: 4, fieldName: 'Test' })
      ]);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.value).toBe('test');
      }
    });

    it('should work without validators', () => {
      const result = ValueObjectFactory.createString('anything', TestStringVO, []);

      expect(result.isSuccess).toBe(true);
    });

    it('should work with omitted validators', () => {
      const result = ValueObjectFactory.createString('anything', TestStringVO);

      expect(result.isSuccess).toBe(true);
    });
  });

  describe('createNumber', () => {
    it('should create Value Object with valid number', () => {
      const result = ValueObjectFactory.createNumber(42, TestNumberVO);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value).toBeInstanceOf(TestNumberVO);
        expect(result.value.value).toBe(42);
      }
    });

    it('should apply number validators', () => {
      const result = ValueObjectFactory.createNumber(50, TestNumberVO, [
        (v) => Validators.range(v, { min: 0, max: 100, fieldName: 'Test' })
      ]);

      expect(result.isSuccess).toBe(true);
    });

    it('should fail on invalid number validation', () => {
      const result = ValueObjectFactory.createNumber(150, TestNumberVO, [
        (v) => Validators.range(v, { min: 0, max: 100, fieldName: 'Test' })
      ]);

      expect(result.isFailure).toBe(true);
      if (result.isFailure) {
        expect(result.error).toBeInstanceOf(DomainError);
      }
    });

    it('should pass transformed value between validators', () => {
      const result = ValueObjectFactory.createNumber(42.7, TestNumberVO, [
        (v) => Success.create(Math.floor(v)),
        (v) =>
          v === 42 ? Success.create(v) : Failure.create(new DomainError('NOT_42', 'Must be 42'))
      ]);

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.value).toBe(42);
      }
    });

    it('should work without validators', () => {
      const result = ValueObjectFactory.createNumber(999, TestNumberVO, []);

      expect(result.isSuccess).toBe(true);
    });
  });

  describe('create (custom)', () => {
    class HexColor extends ValueObject {
      constructor(readonly hex: string) {
        super();
      }

      static create(hex: string) {
        return ValueObjectFactory.create(hex, HexColor, (value) => {
          if (!/^#[0-9A-F]{6}$/i.test(value)) {
            return Failure.create(new DomainError('INVALID_COLOR', 'Must be valid hex color'));
          }
          return Success.create(value.toUpperCase());
        });
      }

      protected getEqualityComponents(): unknown[] {
        return [this.hex];
      }
    }

    it('should create Value Object with custom validation', () => {
      const result = HexColor.create('#FF5733');

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.hex).toBe('#FF5733');
      }
    });

    it('should fail custom validation', () => {
      const result = HexColor.create('not-a-color');

      expect(result.isFailure).toBe(true);
      if (result.isFailure) {
        expect(result.error.code).toBe('INVALID_COLOR');
      }
    });

    it('should transform value in custom validation', () => {
      const result = HexColor.create('#ff5733');

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value.hex).toBe('#FF5733');
      }
    });
  });

  describe('real-world Value Objects', () => {
    it('should create Email with validation', () => {
      const validResult = TestEmail.create('user@example.com');
      expect(validResult.isSuccess).toBe(true);

      const invalidResult = TestEmail.create('not-an-email');
      expect(invalidResult.isFailure).toBe(true);

      const emptyResult = TestEmail.create('');
      expect(emptyResult.isFailure).toBe(true);
    });

    it('should create Price with range validation', () => {
      const validResult = TestPrice.create(99.99);
      expect(validResult.isSuccess).toBe(true);

      const negativeResult = TestPrice.create(-10);
      expect(negativeResult.isFailure).toBe(true);

      const tooHighResult = TestPrice.create(2000000);
      expect(tooHighResult.isFailure).toBe(true);
    });
  });

  describe('Value Object equality', () => {
    it('should support Value Object equality checks', () => {
      const email1Result = TestEmail.create('test@example.com');
      const email2Result = TestEmail.create('test@example.com');
      const email3Result = TestEmail.create('other@example.com');

      expect(email1Result.isSuccess).toBe(true);
      expect(email2Result.isSuccess).toBe(true);
      expect(email3Result.isSuccess).toBe(true);

      if (email1Result.isSuccess && email2Result.isSuccess && email3Result.isSuccess) {
        expect(email1Result.value.equals(email2Result.value)).toBe(true);
        expect(email1Result.value.equals(email3Result.value)).toBe(false);
      }
    });

    it('should support Price equality', () => {
      const price1Result = TestPrice.create(99.99);
      const price2Result = TestPrice.create(99.99);
      const price3Result = TestPrice.create(199.99);

      if (price1Result.isSuccess && price2Result.isSuccess && price3Result.isSuccess) {
        expect(price1Result.value.equals(price2Result.value)).toBe(true);
        expect(price1Result.value.equals(price3Result.value)).toBe(false);
      }
    });
  });
});
