import { describe, it, expect } from 'vitest';
import { Percentage } from '../value-objects/Percentage.js';

describe('Percentage', () => {
  describe('creation from decimal', () => {
    it('should create percentage from valid decimal', () => {
      const result = Percentage.fromDecimal(0.25);

      expect(result.isSuccess).toBe(true);
      expect(result.value.asDecimal()).toBe(0.25);
      expect(result.value.asPercentage()).toBe(25);
    });

    it('should create percentage from zero', () => {
      const result = Percentage.fromDecimal(0);

      expect(result.isSuccess).toBe(true);
      expect(result.value.asPercentage()).toBe(0);
    });

    it('should create percentage from one', () => {
      const result = Percentage.fromDecimal(1);

      expect(result.isSuccess).toBe(true);
      expect(result.value.asPercentage()).toBe(100);
    });

    it('should create percentage from decimal with many decimals', () => {
      const result = Percentage.fromDecimal(0.123456);

      expect(result.isSuccess).toBe(true);
      expect(result.value.asDecimal()).toBe(0.123456);
    });

    it('should reject negative decimal', () => {
      const result = Percentage.fromDecimal(-0.1);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('PERCENTAGE_OUT_OF_RANGE');
    });

    it('should reject decimal greater than 1', () => {
      const result = Percentage.fromDecimal(1.5);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('PERCENTAGE_OUT_OF_RANGE');
    });

    it('should reject Infinity', () => {
      const result = Percentage.fromDecimal(Infinity);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('INVALID_PERCENTAGE');
    });

    it('should reject NaN', () => {
      const result = Percentage.fromDecimal(NaN);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('INVALID_PERCENTAGE');
    });
  });

  describe('creation from percentage', () => {
    it('should create percentage from valid percentage value', () => {
      const result = Percentage.fromPercentage(25);

      expect(result.isSuccess).toBe(true);
      expect(result.value.asPercentage()).toBe(25);
      expect(result.value.asDecimal()).toBe(0.25);
    });

    it('should create percentage from zero', () => {
      const result = Percentage.fromPercentage(0);

      expect(result.isSuccess).toBe(true);
      expect(result.value.asPercentage()).toBe(0);
    });

    it('should create percentage from 100', () => {
      const result = Percentage.fromPercentage(100);

      expect(result.isSuccess).toBe(true);
      expect(result.value.asPercentage()).toBe(100);
    });

    it('should create percentage with decimal places', () => {
      const result = Percentage.fromPercentage(25.5);

      expect(result.isSuccess).toBe(true);
      expect(result.value.asPercentage()).toBe(25.5);
    });

    it('should reject negative percentage', () => {
      const result = Percentage.fromPercentage(-10);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('PERCENTAGE_OUT_OF_RANGE');
    });

    it('should reject percentage greater than 100', () => {
      const result = Percentage.fromPercentage(150);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('PERCENTAGE_OUT_OF_RANGE');
    });

    it('should reject Infinity', () => {
      const result = Percentage.fromPercentage(Infinity);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('INVALID_PERCENTAGE');
    });

    it('should reject NaN', () => {
      const result = Percentage.fromPercentage(NaN);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('INVALID_PERCENTAGE');
    });
  });

  describe('factory methods', () => {
    it('should create zero percentage', () => {
      const zero = Percentage.zero();

      expect(zero.asPercentage()).toBe(0);
      expect(zero.asDecimal()).toBe(0);
      expect(zero.isZero()).toBe(true);
      expect(zero.isFull()).toBe(false);
    });

    it('should create full percentage', () => {
      const full = Percentage.full();

      expect(full.asPercentage()).toBe(100);
      expect(full.asDecimal()).toBe(1);
      expect(full.isZero()).toBe(false);
      expect(full.isFull()).toBe(true);
    });
  });

  describe('applying to amounts', () => {
    it('should calculate percentage of amount', () => {
      const pct = Percentage.fromPercentage(20).value;
      const result = pct.of(100);

      expect(result).toBe(20);
    });

    it('should calculate percentage of decimal amount', () => {
      const pct = Percentage.fromPercentage(15).value;
      const result = pct.of(50.5);

      expect(result).toBeCloseTo(7.575, 3);
    });

    it('should calculate zero percentage', () => {
      const pct = Percentage.zero();
      const result = pct.of(100);

      expect(result).toBe(0);
    });

    it('should calculate full percentage', () => {
      const pct = Percentage.full();
      const result = pct.of(75);

      expect(result).toBe(75);
    });

    it('should work with negative amounts', () => {
      const pct = Percentage.fromPercentage(25).value;
      const result = pct.of(-100);

      expect(result).toBe(-25);
    });
  });

  describe('arithmetic operations', () => {
    it('should add two percentages', () => {
      const a = Percentage.fromPercentage(25).value;
      const b = Percentage.fromPercentage(30).value;
      const result = a.add(b);

      expect(result.isSuccess).toBe(true);
      expect(result.value.asPercentage()).toBeCloseTo(55, 10);
    });

    it('should add to zero', () => {
      const a = Percentage.zero();
      const b = Percentage.fromPercentage(50).value;
      const result = a.add(b);

      expect(result.isSuccess).toBe(true);
      expect(result.value.asPercentage()).toBe(50);
    });

    it('should add to reach 100%', () => {
      const a = Percentage.fromPercentage(60).value;
      const b = Percentage.fromPercentage(40).value;
      const result = a.add(b);

      expect(result.isSuccess).toBe(true);
      expect(result.value.asPercentage()).toBe(100);
    });

    it('should reject addition that exceeds 100%', () => {
      const a = Percentage.fromPercentage(60).value;
      const b = Percentage.fromPercentage(50).value;
      const result = a.add(b);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('PERCENTAGE_OVERFLOW');
    });

    it('should subtract percentages', () => {
      const a = Percentage.fromPercentage(50).value;
      const b = Percentage.fromPercentage(20).value;
      const result = a.subtract(b);

      expect(result.isSuccess).toBe(true);
      expect(result.value.asPercentage()).toBe(30);
    });

    it('should subtract to zero', () => {
      const a = Percentage.fromPercentage(25).value;
      const b = Percentage.fromPercentage(25).value;
      const result = a.subtract(b);

      expect(result.isSuccess).toBe(true);
      expect(result.value.asPercentage()).toBe(0);
    });

    it('should reject subtraction that results in negative', () => {
      const a = Percentage.fromPercentage(20).value;
      const b = Percentage.fromPercentage(30).value;
      const result = a.subtract(b);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('PERCENTAGE_UNDERFLOW');
    });

    it('should multiply percentage by factor', () => {
      const pct = Percentage.fromPercentage(25).value;
      const result = pct.multiply(2);

      expect(result.isSuccess).toBe(true);
      expect(result.value.asPercentage()).toBe(50);
    });

    it('should multiply by decimal factor', () => {
      const pct = Percentage.fromPercentage(40).value;
      const result = pct.multiply(0.5);

      expect(result.isSuccess).toBe(true);
      expect(result.value.asPercentage()).toBe(20);
    });

    it('should multiply by zero', () => {
      const pct = Percentage.fromPercentage(50).value;
      const result = pct.multiply(0);

      expect(result.isSuccess).toBe(true);
      expect(result.value.asPercentage()).toBe(0);
    });

    it('should reject multiplication that exceeds 100%', () => {
      const pct = Percentage.fromPercentage(60).value;
      const result = pct.multiply(2);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('PERCENTAGE_OUT_OF_RANGE');
    });

    it('should reject negative multiplication result', () => {
      const pct = Percentage.fromPercentage(50).value;
      const result = pct.multiply(-1);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('PERCENTAGE_OUT_OF_RANGE');
    });

    it('should reject infinite factor', () => {
      const pct = Percentage.fromPercentage(50).value;
      const result = pct.multiply(Infinity);

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('INVALID_FACTOR');
    });
  });

  describe('formatting', () => {
    it('should format with default 2 decimals', () => {
      const pct = Percentage.fromDecimal(0.2575).value;
      expect(pct.format()).toBe('25.75%');
    });

    it('should format with 0 decimals', () => {
      const pct = Percentage.fromDecimal(0.2575).value;
      expect(pct.format(0)).toBe('26%');
    });

    it('should format with 1 decimal', () => {
      const pct = Percentage.fromDecimal(0.2575).value;
      expect(pct.format(1)).toBe('25.8%');
    });

    it('should format with 3 decimals', () => {
      const pct = Percentage.fromDecimal(0.2575).value;
      expect(pct.format(3)).toBe('25.750%');
    });

    it('should format zero', () => {
      const pct = Percentage.zero();
      expect(pct.format()).toBe('0.00%');
    });

    it('should format full percentage', () => {
      const pct = Percentage.full();
      expect(pct.format()).toBe('100.00%');
    });

    it('should format as string with toString', () => {
      const pct = Percentage.fromPercentage(50).value;
      expect(pct.toString()).toBe('50.00%');
    });
  });

  describe('equality', () => {
    it('should be equal to percentage with same value', () => {
      const pct1 = Percentage.fromPercentage(25).value;
      const pct2 = Percentage.fromPercentage(25).value;

      expect(pct1.equals(pct2)).toBe(true);
    });

    it('should be equal when created from different methods', () => {
      const pct1 = Percentage.fromDecimal(0.5).value;
      const pct2 = Percentage.fromPercentage(50).value;

      expect(pct1.equals(pct2)).toBe(true);
    });

    it('should not be equal to percentage with different value', () => {
      const pct1 = Percentage.fromPercentage(25).value;
      const pct2 = Percentage.fromPercentage(50).value;

      expect(pct1.equals(pct2)).toBe(false);
    });

    it('should not be equal to zero when non-zero', () => {
      const pct = Percentage.fromPercentage(25).value;
      const zero = Percentage.zero();

      expect(pct.equals(zero)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should serialize to decimal in JSON', () => {
      const pct = Percentage.fromPercentage(25).value;
      expect(pct.toJSON()).toBe(0.25);
    });

    it('should serialize correctly in JSON.stringify', () => {
      const pct = Percentage.fromPercentage(50).value;
      const json = JSON.stringify({ discount: pct });

      expect(json).toBe('{"discount":0.5}');
    });

    it('should serialize zero', () => {
      const pct = Percentage.zero();
      expect(pct.toJSON()).toBe(0);
    });

    it('should serialize full', () => {
      const pct = Percentage.full();
      expect(pct.toJSON()).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle very small percentages', () => {
      const result = Percentage.fromPercentage(0.001);

      expect(result.isSuccess).toBe(true);
      expect(result.value.asPercentage()).toBeCloseTo(0.001, 6);
    });

    it('should handle percentage close to boundaries', () => {
      const min = Percentage.fromDecimal(0.0001).value;
      const max = Percentage.fromDecimal(0.9999).value;

      expect(min.asPercentage()).toBeCloseTo(0.01, 2);
      expect(max.asPercentage()).toBeCloseTo(99.99, 2);
    });

    it('should handle floating point precision', () => {
      const pct = Percentage.fromPercentage(33.333333).value;
      expect(pct.asDecimal()).toBeCloseTo(0.33333333, 8);
    });
  });

  describe('real-world scenarios', () => {
    it('should calculate discount amount', () => {
      const discount = Percentage.fromPercentage(15).value;
      const price = 100;
      const discountAmount = discount.of(price);
      const finalPrice = price - discountAmount;

      expect(discountAmount).toBe(15);
      expect(finalPrice).toBe(85);
    });

    it('should calculate tax', () => {
      const tax = Percentage.fromPercentage(8.5).value;
      const subtotal = 50;
      const taxAmount = tax.of(subtotal);
      const total = subtotal + taxAmount;

      expect(taxAmount).toBeCloseTo(4.25, 2);
      expect(total).toBeCloseTo(54.25, 2);
    });

    it('should calculate completion progress', () => {
      const completed = 75;
      const total = 100;
      const progress = Percentage.fromDecimal(completed / total).value;

      expect(progress.format(0)).toBe('75%');
    });

    it('should handle multiple discount tiers', () => {
      const tier1 = Percentage.fromPercentage(10).value;
      const tier2 = Percentage.fromPercentage(5).value;
      const combined = tier1.add(tier2);

      expect(combined.isSuccess).toBe(true);
      expect(combined.value.asPercentage()).toBeCloseTo(15, 10);
    });

    it('should calculate compound interest rate reduction', () => {
      const original = Percentage.fromPercentage(5).value;
      const reduced = original.multiply(0.8);

      expect(reduced.isSuccess).toBe(true);
      expect(reduced.value.asPercentage()).toBeCloseTo(4, 10);
    });
  });
});
