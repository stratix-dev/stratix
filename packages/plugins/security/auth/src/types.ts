/**
 * Authenticated user representation.
 */
export interface User {
  id: string;
  email?: string;
  roles: string[];
  permissions: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Authentication context for requests.
 */
export interface AuthContext {
  user: User;
  token: string;
  isAuthenticated: boolean;
}

/**
 * JWT token payload structure.
 */
export interface JWTPayload {
  sub: string;
  email?: string;
  roles: string[];
  permissions: string[];
  iat?: number;
  exp?: number;
  metadata?: Record<string, unknown>;
}

/**
 * JWT configuration options.
 */
export interface JWTOptions {
  secret: string;
  expiresIn?: string | number;
  algorithm?: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';
  issuer?: string;
  audience?: string;
}

/**
 * Role definition with permissions.
 */
export interface Role {
  name: string;
  description?: string;
  permissions: string[];
}

/**
 * Permission definition for RBAC.
 */
export interface Permission {
  resource: string;
  action: string;
}

/**
 * Configuration options for Auth plugin.
 */
export interface AuthPluginOptions {
  jwt: JWTOptions;
  roles?: Role[];
  passwordHashRounds?: number;
}

/**
 * Password hashing service interface.
 */
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

/**
 * Token service interface for JWT operations.
 */
export interface TokenService {
  sign(payload: JWTPayload): string;
  verify(token: string): JWTPayload;
  decode(token: string): JWTPayload | null;
}
