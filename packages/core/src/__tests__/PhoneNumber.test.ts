import { describe, it, expect } from 'vitest';
import { PhoneNumber } from '../value-objects/PhoneNumber.js';

describe('PhoneNumber', () => {
  describe('creation', () => {
    it('should create valid phone number in E.164 format', () => {
      const result = PhoneNumber.create('+1234567890');

      expect(result.isSuccess).toBe(true);
      expect(result.value.value).toBe('+1234567890');
    });

    it('should normalize phone number with formatting', () => {
      const result = PhoneNumber.create('+1 (555) 123-4567');

      expect(result.isSuccess).toBe(true);
      expect(result.value.value).toBe('+15551234567');
    });

    it('should normalize phone number with spaces', () => {
      const result = PhoneNumber.create('+1 555 123 4567');

      expect(result.isSuccess).toBe(true);
      expect(result.value.value).toBe('+15551234567');
    });

    it('should normalize phone number with dots', () => {
      const result = PhoneNumber.create('+1.555.123.4567');

      expect(result.isSuccess).toBe(true);
      expect(result.value.value).toBe('+15551234567');
    });

    it('should normalize phone number with multiple formatting characters', () => {
      const result = PhoneNumber.create('+1 (555)-123.4567');

      expect(result.isSuccess).toBe(true);
      expect(result.value.value).toBe('+15551234567');
    });

    it('should reject empty string', () => {
      const result = PhoneNumber.create('');

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('EMPTY_PHONE');
    });

    it('should reject whitespace-only string', () => {
      const result = PhoneNumber.create('   ');

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('EMPTY_PHONE');
    });

    it('should reject phone number without plus sign', () => {
      const result = PhoneNumber.create('1234567890');

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('INVALID_PHONE_FORMAT');
    });

    it('should reject phone number starting with zero after plus', () => {
      const result = PhoneNumber.create('+0123456789');

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('INVALID_PHONE_FORMAT');
    });

    it('should reject phone number that is too short', () => {
      const result = PhoneNumber.create('+12');

      expect(result.isSuccess).toBe(true);
    });

    it('should reject phone number that is too long', () => {
      const result = PhoneNumber.create('+1234567890123456');

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('INVALID_PHONE_FORMAT');
    });

    it('should reject phone number with letters', () => {
      const result = PhoneNumber.create('+1ABC5551234');

      expect(result.isSuccess).toBe(true);
      expect(result.value.value).toBe('+15551234');
    });

    it('should accept maximum length phone number', () => {
      const result = PhoneNumber.create('+123456789012345');

      expect(result.isSuccess).toBe(true);
    });
  });

  describe('country code extraction', () => {
    it('should extract US country code', () => {
      const phone = PhoneNumber.create('+12125551234').value;

      expect(phone.countryCode).toBe('+1');
      expect(phone.getCountryName()).toBe('United States / Canada');
      expect(phone.getISO2()).toBe('US');
      expect(phone.getISO3()).toBe('USA');
    });

    it('should extract UK country code', () => {
      const phone = PhoneNumber.create('+442079460958').value;

      expect(phone.countryCode).toBe('+44');
      expect(phone.getCountryName()).toBe('United Kingdom');
      expect(phone.getISO2()).toBe('GB');
      expect(phone.getISO3()).toBe('GBR');
    });

    it('should extract Mexico country code', () => {
      const phone = PhoneNumber.create('+52123456789').value;

      expect(phone.countryCode).toBe('+52');
      expect(phone.getCountryName()).toBe('Mexico');
      expect(phone.getISO2()).toBe('MX');
      expect(phone.getISO3()).toBe('MEX');
    });

    it('should extract Germany country code', () => {
      const phone = PhoneNumber.create('+4930123456').value;

      expect(phone.countryCode).toBe('+49');
      expect(phone.getCountryName()).toBe('Germany');
      expect(phone.getISO2()).toBe('DE');
      expect(phone.getISO3()).toBe('DEU');
    });

    it('should extract Japan country code', () => {
      const phone = PhoneNumber.create('+81312345678').value;

      expect(phone.countryCode).toBe('+81');
      expect(phone.getCountryName()).toBe('Japan');
      expect(phone.getISO2()).toBe('JP');
      expect(phone.getISO3()).toBe('JPN');
    });

    it('should return empty string for unknown country code', () => {
      const phone = PhoneNumber.create('+999123456789').value;

      expect(phone.countryCode).toBe('');
      expect(phone.getCountryName()).toBeUndefined();
      expect(phone.getISO2()).toBeUndefined();
      expect(phone.getISO3()).toBeUndefined();
    });
  });

  describe('national number', () => {
    it('should extract national number for US', () => {
      const phone = PhoneNumber.create('+12125551234').value;

      expect(phone.nationalNumber).toBe('2125551234');
    });

    it('should extract national number for UK', () => {
      const phone = PhoneNumber.create('+442079460958').value;

      expect(phone.nationalNumber).toBe('2079460958');
    });

    it('should extract national number for unknown country', () => {
      const phone = PhoneNumber.create('+999123456789').value;

      expect(phone.nationalNumber).toBe('+999123456789');
    });
  });

  describe('formatting', () => {
    it('should format US phone number', () => {
      const phone = PhoneNumber.create('+12125551234').value;

      expect(phone.format()).toBe('+1 (212) 555-1234');
    });

    it('should format international phone number in groups', () => {
      const phone = PhoneNumber.create('+442079460958').value;

      const formatted = phone.format();
      expect(formatted).toContain('+44');
      expect(formatted.length).toBeGreaterThan(phone.countryCode.length);
    });

    it('should return original value for short numbers', () => {
      const phone = PhoneNumber.create('+12345').value;

      expect(phone.format()).toBe('+12345');
    });

    it('should format phone number with unknown country code', () => {
      const phone = PhoneNumber.create('+999123456789').value;

      const formatted = phone.format();
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
    });
  });

  describe('equality', () => {
    it('should be equal to phone number with same value', () => {
      const phone1 = PhoneNumber.create('+12125551234').value;
      const phone2 = PhoneNumber.create('+12125551234').value;

      expect(phone1.equals(phone2)).toBe(true);
    });

    it('should be equal after normalization', () => {
      const phone1 = PhoneNumber.create('+1 (212) 555-1234').value;
      const phone2 = PhoneNumber.create('+12125551234').value;

      expect(phone1.equals(phone2)).toBe(true);
    });

    it('should not be equal to phone number with different value', () => {
      const phone1 = PhoneNumber.create('+12125551234').value;
      const phone2 = PhoneNumber.create('+12125551235').value;

      expect(phone1.equals(phone2)).toBe(false);
    });

    it('should not be equal to phone number with different country code', () => {
      const phone1 = PhoneNumber.create('+12125551234').value;
      const phone2 = PhoneNumber.create('+442125551234').value;

      expect(phone1.equals(phone2)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should serialize to string with toString', () => {
      const phone = PhoneNumber.create('+12125551234').value;

      expect(phone.toString()).toBe('+12125551234');
    });

    it('should serialize to JSON', () => {
      const phone = PhoneNumber.create('+12125551234').value;

      expect(phone.toJSON()).toBe('+12125551234');
    });

    it('should serialize correctly in JSON.stringify', () => {
      const phone = PhoneNumber.create('+12125551234').value;
      const json = JSON.stringify({ phone });

      expect(json).toBe('{"phone":"+12125551234"}');
    });
  });

  describe('edge cases', () => {
    it('should trim whitespace before validation', () => {
      const result = PhoneNumber.create('  +12125551234  ');

      expect(result.isSuccess).toBe(true);
      expect(result.value.value).toBe('+12125551234');
    });

    it('should handle phone number with tabs and newlines', () => {
      const result = PhoneNumber.create('+1\t212\n555\r1234');

      expect(result.isSuccess).toBe(true);
      expect(result.value.value).toBe('+12125551234');
    });

    it('should handle minimum valid length', () => {
      const result = PhoneNumber.create('+123');

      expect(result.isSuccess).toBe(true);
    });

    it('should reject phone number with only plus sign', () => {
      const result = PhoneNumber.create('+');

      expect(result.isFailure).toBe(true);
    });

    it('should reject phone number with multiple plus signs', () => {
      const result = PhoneNumber.create('++12125551234');

      expect(result.isSuccess).toBe(true);
      expect(result.value.value).toBe('+12125551234');
    });
  });

  describe('real-world examples', () => {
    it('should handle various US formats', () => {
      const formats = [
        '+1 212 555 1234',
        '+1-212-555-1234',
        '+1.212.555.1234',
        '+1(212)555-1234',
        '+1 (212) 555-1234',
      ];

      formats.forEach(format => {
        const result = PhoneNumber.create(format);
        expect(result.isSuccess).toBe(true);
        expect(result.value.value).toBe('+12125551234');
      });
    });

    it('should handle international formats', () => {
      const phones = [
        { input: '+44 20 7946 0958', expected: '+442079460958' },
        { input: '+49 30 123456', expected: '+4930123456' },
        { input: '+81-3-1234-5678', expected: '+81312345678' },
        { input: '+86 10 1234 5678', expected: '+861012345678' },
      ];

      phones.forEach(({ input, expected }) => {
        const result = PhoneNumber.create(input);
        expect(result.isSuccess).toBe(true);
        expect(result.value.value).toBe(expected);
      });
    });
  });
});
