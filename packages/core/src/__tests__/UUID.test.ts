import { describe, it, expect } from 'vitest';
import { UUID } from '../value-objects/UUID.js';

describe('UUID', () => {
  describe('generation', () => {
    it('should generate a valid UUID', () => {
      const uuid = UUID.generate();

      expect(uuid.value).toBeDefined();
      expect(typeof uuid.value).toBe('string');
      expect(UUID.isValid(uuid.value)).toBe(true);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = UUID.generate();
      const uuid2 = UUID.generate();

      expect(uuid1.value).not.toBe(uuid2.value);
    });

    it('should generate version 4 UUIDs', () => {
      const uuid = UUID.generate();

      expect(uuid.version()).toBe(4);
    });

    it('should generate RFC4122 variant UUIDs', () => {
      const uuid = UUID.generate();

      expect(uuid.variant()).toBe('RFC4122');
    });

    it('should generate multiple unique UUIDs', () => {
      const uuids = Array.from({ length: 100 }, () => UUID.generate().value);
      const uniqueUuids = new Set(uuids);

      expect(uniqueUuids.size).toBe(100);
    });
  });

  describe('creation from string', () => {
    it('should create UUID from valid string', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const result = UUID.create(validUUID);

      expect(result.isSuccess).toBe(true);
      expect(result.value.value).toBe(validUUID);
    });

    it('should create UUID from uppercase string', () => {
      const upperCaseUUID = '550E8400-E29B-41D4-A716-446655440000';
      const result = UUID.create(upperCaseUUID);

      expect(result.isSuccess).toBe(true);
      expect(result.value.value).toBe(upperCaseUUID.toLowerCase());
    });

    it('should create UUID from mixed case string', () => {
      const mixedCaseUUID = '550e8400-E29b-41D4-a716-446655440000';
      const result = UUID.create(mixedCaseUUID);

      expect(result.isSuccess).toBe(true);
      expect(result.value.value).toBe(mixedCaseUUID.toLowerCase());
    });

    it('should trim whitespace', () => {
      const uuidWithSpaces = '  550e8400-e29b-41d4-a716-446655440000  ';
      const result = UUID.create(uuidWithSpaces);

      expect(result.isSuccess).toBe(true);
      expect(result.value.value).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should reject empty string', () => {
      const result = UUID.create('');

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('EMPTY_UUID');
    });

    it('should reject whitespace-only string', () => {
      const result = UUID.create('   ');

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('EMPTY_UUID');
    });

    it('should reject invalid format', () => {
      const result = UUID.create('not-a-uuid');

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('INVALID_UUID_FORMAT');
    });

    it('should reject UUID without hyphens', () => {
      const result = UUID.create('550e8400e29b41d4a716446655440000');

      expect(result.isFailure).toBe(true);
      expect(result.error.code).toBe('INVALID_UUID_FORMAT');
    });

    it('should reject UUID with wrong hyphen positions', () => {
      const result = UUID.create('550e8400-e29b41d4-a716-446655440000');

      expect(result.isFailure).toBe(true);
    });

    it('should reject UUID with invalid characters', () => {
      const result = UUID.create('550e8400-e29b-41d4-a716-44665544000g');

      expect(result.isFailure).toBe(true);
    });

    it('should reject too short UUID', () => {
      const result = UUID.create('550e8400-e29b-41d4-a716-4466554400');

      expect(result.isFailure).toBe(true);
    });

    it('should reject too long UUID', () => {
      const result = UUID.create('550e8400-e29b-41d4-a716-4466554400001');

      expect(result.isFailure).toBe(true);
    });
  });

  describe('validation', () => {
    it('should validate version 1 UUID', () => {
      const v1UUID = '550e8400-e29b-11d4-a716-446655440000';

      expect(UUID.isValid(v1UUID)).toBe(true);
    });

    it('should validate version 2 UUID', () => {
      const v2UUID = '550e8400-e29b-21d4-a716-446655440000';

      expect(UUID.isValid(v2UUID)).toBe(true);
    });

    it('should validate version 3 UUID', () => {
      const v3UUID = '550e8400-e29b-31d4-a716-446655440000';

      expect(UUID.isValid(v3UUID)).toBe(true);
    });

    it('should validate version 4 UUID', () => {
      const v4UUID = '550e8400-e29b-41d4-a716-446655440000';

      expect(UUID.isValid(v4UUID)).toBe(true);
    });

    it('should validate version 5 UUID', () => {
      const v5UUID = '550e8400-e29b-51d4-a716-446655440000';

      expect(UUID.isValid(v5UUID)).toBe(true);
    });

    it('should reject invalid version 0', () => {
      const v0UUID = '550e8400-e29b-01d4-a716-446655440000';

      expect(UUID.isValid(v0UUID)).toBe(false);
    });

    it('should reject invalid version 6', () => {
      const v6UUID = '550e8400-e29b-61d4-a716-446655440000';

      expect(UUID.isValid(v6UUID)).toBe(false);
    });

    it('should reject malformed UUID', () => {
      expect(UUID.isValid('not-a-uuid')).toBe(false);
    });
  });

  describe('version detection', () => {
    it('should detect version 1', () => {
      const uuid = UUID.create('550e8400-e29b-11d4-a716-446655440000').value;

      expect(uuid.version()).toBe(1);
    });

    it('should detect version 3', () => {
      const uuid = UUID.create('550e8400-e29b-31d4-a716-446655440000').value;

      expect(uuid.version()).toBe(3);
    });

    it('should detect version 4', () => {
      const uuid = UUID.generate();

      expect(uuid.version()).toBe(4);
    });

    it('should detect version 5', () => {
      const uuid = UUID.create('550e8400-e29b-51d4-a716-446655440000').value;

      expect(uuid.version()).toBe(5);
    });
  });

  describe('variant detection', () => {
    it('should detect RFC4122 variant', () => {
      const uuid = UUID.create('550e8400-e29b-41d4-a716-446655440000').value;

      expect(uuid.variant()).toBe('RFC4122');
    });

    it('should detect RFC4122 variant for generated UUIDs', () => {
      const uuid = UUID.generate();

      expect(uuid.variant()).toBe('RFC4122');
    });
  });

  describe('formatting', () => {
    it('should convert to uppercase', () => {
      const uuid = UUID.create('550e8400-e29b-41d4-a716-446655440000').value;

      expect(uuid.toUpperCase()).toBe('550E8400-E29B-41D4-A716-446655440000');
    });

    it('should convert to compact format', () => {
      const uuid = UUID.create('550e8400-e29b-41d4-a716-446655440000').value;

      expect(uuid.toCompact()).toBe('550e8400e29b41d4a716446655440000');
    });

    it('should convert generated UUID to compact format', () => {
      const uuid = UUID.generate();
      const compact = uuid.toCompact();

      expect(compact.length).toBe(32);
      expect(compact).not.toContain('-');
    });
  });

  describe('equality', () => {
    it('should be equal to UUID with same value', () => {
      const uuid1 = UUID.create('550e8400-e29b-41d4-a716-446655440000').value;
      const uuid2 = UUID.create('550e8400-e29b-41d4-a716-446655440000').value;

      expect(uuid1.equals(uuid2)).toBe(true);
    });

    it('should be equal regardless of case', () => {
      const uuid1 = UUID.create('550e8400-e29b-41d4-a716-446655440000').value;
      const uuid2 = UUID.create('550E8400-E29B-41D4-A716-446655440000').value;

      expect(uuid1.equals(uuid2)).toBe(true);
    });

    it('should not be equal to UUID with different value', () => {
      const uuid1 = UUID.create('550e8400-e29b-41d4-a716-446655440000').value;
      const uuid2 = UUID.create('550e8400-e29b-41d4-a716-446655440001').value;

      expect(uuid1.equals(uuid2)).toBe(false);
    });

    it('should not be equal to generated UUID', () => {
      const uuid1 = UUID.create('550e8400-e29b-41d4-a716-446655440000').value;
      const uuid2 = UUID.generate();

      expect(uuid1.equals(uuid2)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should serialize to string with toString', () => {
      const uuid = UUID.create('550e8400-e29b-41d4-a716-446655440000').value;

      expect(uuid.toString()).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should serialize to JSON', () => {
      const uuid = UUID.create('550e8400-e29b-41d4-a716-446655440000').value;

      expect(uuid.toJSON()).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should serialize correctly in JSON.stringify', () => {
      const uuid = UUID.create('550e8400-e29b-41d4-a716-446655440000').value;
      const json = JSON.stringify({ id: uuid });

      expect(json).toBe('{"id":"550e8400-e29b-41d4-a716-446655440000"}');
    });

    it('should serialize generated UUID', () => {
      const uuid = UUID.generate();
      const json = JSON.stringify({ id: uuid });

      expect(json).toContain('"id":"');
      expect(UUID.isValid(JSON.parse(json).id)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle all valid RFC4122 variant bits', () => {
      const variants = [
        '550e8400-e29b-41d4-8716-446655440000',
        '550e8400-e29b-41d4-9716-446655440000',
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-b716-446655440000',
      ];

      variants.forEach(v => {
        const result = UUID.create(v);
        expect(result.isSuccess).toBe(true);
        expect(result.value.variant()).toBe('RFC4122');
      });
    });

    it('should preserve case in value property', () => {
      const upperCaseUUID = '550E8400-E29B-41D4-A716-446655440000';
      const uuid = UUID.create(upperCaseUUID).value;

      expect(uuid.value).toBe(upperCaseUUID.toLowerCase());
    });

    it('should handle boundary values', () => {
      const boundaryUUIDs = [
        '00000000-0000-1000-8000-000000000000',
        'ffffffff-ffff-5fff-bfff-ffffffffffff',
      ];

      boundaryUUIDs.forEach(v => {
        const result = UUID.create(v);
        expect(result.isSuccess).toBe(true);
      });
    });
  });

  describe('real-world usage', () => {
    it('should work as entity identifier', () => {
      const userId = UUID.generate();
      const orderId = UUID.generate();

      expect(userId.equals(orderId)).toBe(false);
      expect(UUID.isValid(userId.value)).toBe(true);
      expect(UUID.isValid(orderId.value)).toBe(true);
    });

    it('should work in collections', () => {
      const uuids = [
        UUID.generate(),
        UUID.generate(),
        UUID.generate(),
      ];

      const values = uuids.map(u => u.value);
      const uniqueValues = new Set(values);

      expect(uniqueValues.size).toBe(3);
    });

    it('should work with database roundtrip simulation', () => {
      const original = UUID.generate();
      const serialized = original.toJSON();
      const deserialized = UUID.create(serialized).value;

      expect(original.equals(deserialized)).toBe(true);
    });
  });
});
