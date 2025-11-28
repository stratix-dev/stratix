import { describe, it, expect, beforeEach } from 'vitest';
import { JWTService } from '../jwt/JWTService.js';
import type { JWTOptions, JWTPayload } from '../types.js';

describe('JWTService', () => {
  let jwtService: JWTService;
  const secret = 'test-secret-key-for-jwt';

  describe('with HS256 algorithm', () => {
    beforeEach(() => {
      const options: JWTOptions = {
        secret,
        algorithm: 'HS256',
        expiresIn: '1h',
        issuer: 'stratix-test',
        audience: 'test-app',
      };
      jwtService = new JWTService(options);
    });

    it('should sign a token with payload', () => {
      const payload: JWTPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        roles: ['admin'],
        permissions: ['read', 'write'],
        metadata: { department: 'engineering' },
      };

      const token = jwtService.sign(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should verify a valid token', () => {
      const payload: JWTPayload = {
        sub: 'user-456',
        email: 'user@example.com',
        roles: ['user'],
        permissions: ['read'],
      };

      const token = jwtService.sign(payload);
      const verified = jwtService.verify(token);

      expect(verified.sub).toBe(payload.sub);
      expect(verified.email).toBe(payload.email);
      expect(verified.roles).toEqual(payload.roles);
      expect(verified.permissions).toEqual(payload.permissions);
      expect(verified.iat).toBeDefined();
      expect(verified.exp).toBeDefined();
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.string';

      expect(() => jwtService.verify(invalidToken)).toThrow();
    });

    it('should throw error for expired token', () => {
      const shortLivedService = new JWTService({
        secret,
        algorithm: 'HS256',
        expiresIn: -1,
        issuer: 'stratix-test',
        audience: 'test-app',
      });

      const payload: JWTPayload = {
        sub: 'user-789',
        roles: [],
        permissions: [],
      };

      const token = shortLivedService.sign(payload);

      expect(() => jwtService.verify(token)).toThrow();
    });

    it('should decode token without verification', () => {
      const payload: JWTPayload = {
        sub: 'user-999',
        email: 'decode@example.com',
        roles: ['viewer'],
        permissions: ['read'],
        metadata: { team: 'alpha' },
      };

      const token = jwtService.sign(payload);
      const decoded = jwtService.decode(token);

      expect(decoded).not.toBeNull();
      expect(decoded!.sub).toBe(payload.sub);
      expect(decoded!.email).toBe(payload.email);
      expect(decoded!.roles).toEqual(payload.roles);
      expect(decoded!.permissions).toEqual(payload.permissions);
      expect(decoded!.metadata).toEqual(payload.metadata);
    });

    it('should return null for invalid token on decode', () => {
      const invalidToken = 'not-a-valid-jwt';
      const decoded = jwtService.decode(invalidToken);

      expect(decoded).toBeNull();
    });

    it('should include issuer and audience in token', () => {
      const payload: JWTPayload = {
        sub: 'user-111',
        roles: [],
        permissions: [],
      };

      const token = jwtService.sign(payload);
      const verified = jwtService.verify(token);

      expect(verified).toBeDefined();
    });

    it('should throw error for token with wrong issuer', () => {
      const payload: JWTPayload = {
        sub: 'user-222',
        roles: [],
        permissions: [],
      };

      const token = jwtService.sign(payload);

      const differentIssuerService = new JWTService({
        secret,
        algorithm: 'HS256',
        issuer: 'different-issuer',
        audience: 'test-app',
      });

      expect(() => differentIssuerService.verify(token)).toThrow();
    });

    it('should throw error for token with wrong audience', () => {
      const payload: JWTPayload = {
        sub: 'user-333',
        roles: [],
        permissions: [],
      };

      const token = jwtService.sign(payload);

      const differentAudienceService = new JWTService({
        secret,
        algorithm: 'HS256',
        issuer: 'stratix-test',
        audience: 'different-app',
      });

      expect(() => differentAudienceService.verify(token)).toThrow();
    });

    it('should handle empty roles and permissions', () => {
      const payload: JWTPayload = {
        sub: 'user-444',
        roles: [],
        permissions: [],
      };

      const token = jwtService.sign(payload);
      const verified = jwtService.verify(token);

      expect(verified.roles).toEqual([]);
      expect(verified.permissions).toEqual([]);
    });

    it('should handle missing optional fields', () => {
      const payload: JWTPayload = {
        sub: 'user-555',
        roles: ['user'],
        permissions: ['read'],
      };

      const token = jwtService.sign(payload);
      const verified = jwtService.verify(token);

      expect(verified.sub).toBe('user-555');
      expect(verified.email).toBeUndefined();
      expect(verified.metadata).toBeUndefined();
    });
  });

  describe('with default options', () => {
    it('should use HS256 as default algorithm', () => {
      const service = new JWTService({
        secret,
        issuer: 'test-issuer',
        audience: 'test-audience'
      });
      const payload: JWTPayload = {
        sub: 'user-666',
        roles: [],
        permissions: [],
      };

      const token = service.sign(payload);
      const verified = service.verify(token);

      expect(verified.sub).toBe('user-666');
    });

    it('should use 24h as default expiration', () => {
      const service = new JWTService({
        secret,
        issuer: 'test-issuer',
        audience: 'test-audience'
      });
      const payload: JWTPayload = {
        sub: 'user-777',
        roles: [],
        permissions: [],
      };

      const token = service.sign(payload);
      const verified = service.verify(token);

      expect(verified.exp).toBeDefined();
      expect(verified.iat).toBeDefined();

      const duration = verified.exp! - verified.iat!;
      expect(duration).toBe(86400);
    });
  });

  describe('with different algorithms', () => {
    it('should work with HS384', () => {
      const service = new JWTService({
        secret,
        algorithm: 'HS384',
        issuer: 'test-issuer',
        audience: 'test-audience'
      });

      const payload: JWTPayload = {
        sub: 'user-888',
        roles: [],
        permissions: [],
      };

      const token = service.sign(payload);
      const verified = service.verify(token);

      expect(verified.sub).toBe('user-888');
    });

    it('should work with HS512', () => {
      const service = new JWTService({
        secret,
        algorithm: 'HS512',
        issuer: 'test-issuer',
        audience: 'test-audience'
      });

      const payload: JWTPayload = {
        sub: 'user-999',
        roles: [],
        permissions: [],
      };

      const token = service.sign(payload);
      const verified = service.verify(token);

      expect(verified.sub).toBe('user-999');
    });
  });

  describe('security validation', () => {
    it('should throw error when verifying with wrong secret', () => {
      const service1 = new JWTService({
        secret: 'secret-1',
        issuer: 'test-issuer',
        audience: 'test-audience'
      });
      const service2 = new JWTService({
        secret: 'secret-2',
        issuer: 'test-issuer',
        audience: 'test-audience'
      });

      const payload: JWTPayload = {
        sub: 'user-1000',
        roles: [],
        permissions: [],
      };

      const token = service1.sign(payload);

      expect(() => service2.verify(token)).toThrow();
    });

    it('should preserve metadata through sign and verify', () => {
      const service = new JWTService({
        secret,
        issuer: 'test-issuer',
        audience: 'test-audience'
      });
      const payload: JWTPayload = {
        sub: 'user-1001',
        roles: ['admin'],
        permissions: ['all'],
        metadata: {
          sessionId: 'session-123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      };

      const token = service.sign(payload);
      const verified = service.verify(token);

      expect(verified.metadata).toEqual(payload.metadata);
    });
  });
});
