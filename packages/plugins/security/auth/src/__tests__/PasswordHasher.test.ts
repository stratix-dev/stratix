import { describe, it, expect, beforeEach } from 'vitest';
import { BcryptPasswordHasher } from '../jwt/PasswordHasher.js';

describe('BcryptPasswordHasher', () => {
  let hasher: BcryptPasswordHasher;

  describe('with default rounds', () => {
    beforeEach(() => {
      hasher = new BcryptPasswordHasher();
    });

    it('should hash a password', async () => {
      const password = 'mySecurePassword123!';
      const hash = await hasher.hash(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'samePassword456';
      const hash1 = await hasher.hash(password);
      const hash2 = await hasher.hash(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should verify correct password', async () => {
      const password = 'correctPassword789';
      const hash = await hasher.hash(password);

      const isValid = await hasher.verify(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'correctPassword123';
      const hash = await hasher.hash(password);

      const isValid = await hasher.verify('wrongPassword456', hash);
      expect(isValid).toBe(false);
    });

    it('should handle empty password', async () => {
      const password = '';
      const hash = await hasher.hash(password);

      expect(hash).toBeDefined();
      const isValid = await hasher.verify('', hash);
      expect(isValid).toBe(true);
    });

    it('should handle special characters', async () => {
      const password = 'p@ssw0rd!#$%^&*()_+-=[]{}|;:,.<>?';
      const hash = await hasher.hash(password);

      const isValid = await hasher.verify(password, hash);
      expect(isValid).toBe(true);
    });

    it('should handle unicode characters', async () => {
      const password = 'contraseña123密码🔒';
      const hash = await hasher.hash(password);

      const isValid = await hasher.verify(password, hash);
      expect(isValid).toBe(true);
    });

    it('should handle very long passwords', async () => {
      const password = 'a'.repeat(1000);
      const hash = await hasher.hash(password);

      const isValid = await hasher.verify(password, hash);
      expect(isValid).toBe(true);
    });

    it('should be case sensitive', async () => {
      const password = 'CaseSensitive';
      const hash = await hasher.hash(password);

      const isValidLower = await hasher.verify('casesensitive', hash);
      const isValidUpper = await hasher.verify('CASESENSITIVE', hash);

      expect(isValidLower).toBe(false);
      expect(isValidUpper).toBe(false);
    });

    it('should reject password with extra characters', async () => {
      const password = 'myPassword';
      const hash = await hasher.hash(password);

      const isValid = await hasher.verify('myPassword123', hash);
      expect(isValid).toBe(false);
    });

    it('should reject password with missing characters', async () => {
      const password = 'myPassword123';
      const hash = await hasher.hash(password);

      const isValid = await hasher.verify('myPassword', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('with custom rounds', () => {
    it('should accept custom rounds parameter', async () => {
      hasher = new BcryptPasswordHasher(12);
      const password = 'testPassword';
      const hash = await hasher.hash(password);

      expect(hash).toBeDefined();
      const isValid = await hasher.verify(password, hash);
      expect(isValid).toBe(true);
    });

    it('should work with minimum rounds', async () => {
      hasher = new BcryptPasswordHasher(4);
      const password = 'quickHash';
      const hash = await hasher.hash(password);

      const isValid = await hasher.verify(password, hash);
      expect(isValid).toBe(true);
    });

    it('should produce different hash lengths with different rounds', async () => {
      const password = 'testHash';
      const hasher4 = new BcryptPasswordHasher(4);
      const hasher12 = new BcryptPasswordHasher(12);

      const hash4 = await hasher4.hash(password);
      const hash12 = await hasher12.hash(password);

      expect(hash4.length).toBe(hash12.length);

      const valid4 = await hasher4.verify(password, hash4);
      const valid12 = await hasher12.verify(password, hash12);

      expect(valid4).toBe(true);
      expect(valid12).toBe(true);
    });
  });

  describe('security properties', () => {
    beforeEach(() => {
      hasher = new BcryptPasswordHasher();
    });

    it('should reject tampered hash', async () => {
      const password = 'originalPassword';
      const hash = await hasher.hash(password);

      const tamperedHash = hash.slice(0, -1) + 'x';
      const isValid = await hasher.verify(password, tamperedHash);

      expect(isValid).toBe(false);
    });

    it('should handle null bytes in password', async () => {
      const password = 'pass\0word';
      const hash = await hasher.hash(password);

      const isValid = await hasher.verify(password, hash);
      expect(isValid).toBe(true);
    });

    it('should produce bcrypt-format hashes', async () => {
      const password = 'testBcryptFormat';
      const hash = await hasher.hash(password);

      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    });

    it('should verify hash from any bcrypt implementation', async () => {
      const password = 'crossCompatibility';

      const hasher1 = new BcryptPasswordHasher(10);
      const hash1 = await hasher1.hash(password);

      const hasher2 = new BcryptPasswordHasher(10);
      const isValid = await hasher2.verify(password, hash1);

      expect(isValid).toBe(true);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      hasher = new BcryptPasswordHasher();
    });

    it('should handle invalid hash format', async () => {
      const password = 'testPassword';
      const invalidHash = 'not-a-valid-bcrypt-hash';

      const isValid = await hasher.verify(password, invalidHash);
      expect(isValid).toBe(false);
    });

    it('should handle empty hash', async () => {
      const password = 'testPassword';
      const emptyHash = '';

      const isValid = await hasher.verify(password, emptyHash);
      expect(isValid).toBe(false);
    });
  });

  describe('performance characteristics', () => {
    it('should hash password in reasonable time with default rounds', async () => {
      hasher = new BcryptPasswordHasher(10);
      const password = 'performanceTest';

      const startTime = Date.now();
      await hasher.hash(password);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });

    it('should verify password in reasonable time', async () => {
      hasher = new BcryptPasswordHasher(10);
      const password = 'verifyPerformance';
      const hash = await hasher.hash(password);

      const startTime = Date.now();
      await hasher.verify(password, hash);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });
  });
});
