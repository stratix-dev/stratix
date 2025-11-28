import { describe, it, expect, beforeEach } from 'vitest';
import { RBACService } from '../rbac/RBACService.js';
import type { Role, User } from '../types.js';

describe('RBACService', () => {
  let rbacService: RBACService;

  const adminRole: Role = {
    name: 'admin',
    description: 'Administrator role',
    permissions: ['read:users', 'write:users', 'delete:users', 'read:posts', 'write:posts'],
  };

  const editorRole: Role = {
    name: 'editor',
    description: 'Editor role',
    permissions: ['read:posts', 'write:posts'],
  };

  const viewerRole: Role = {
    name: 'viewer',
    description: 'Viewer role',
    permissions: ['read:posts'],
  };

  describe('role management', () => {
    beforeEach(() => {
      rbacService = new RBACService();
    });

    it('should add a role', () => {
      rbacService.addRole(adminRole);

      const role = rbacService.getRole('admin');
      expect(role).toBeDefined();
      expect(role?.name).toBe('admin');
      expect(role?.permissions).toEqual(adminRole.permissions);
    });

    it('should initialize with roles', () => {
      rbacService = new RBACService([adminRole, editorRole]);

      expect(rbacService.getRole('admin')).toBeDefined();
      expect(rbacService.getRole('editor')).toBeDefined();
    });

    it('should get all roles', () => {
      rbacService.addRole(adminRole);
      rbacService.addRole(editorRole);
      rbacService.addRole(viewerRole);

      const roles = rbacService.getRoles();
      expect(roles).toHaveLength(3);
      expect(roles.map(r => r.name)).toContain('admin');
      expect(roles.map(r => r.name)).toContain('editor');
      expect(roles.map(r => r.name)).toContain('viewer');
    });

    it('should return undefined for non-existent role', () => {
      const role = rbacService.getRole('non-existent');
      expect(role).toBeUndefined();
    });

    it('should override role with same name', () => {
      rbacService.addRole(adminRole);

      const modifiedAdmin: Role = {
        name: 'admin',
        permissions: ['read:users'],
      };
      rbacService.addRole(modifiedAdmin);

      const role = rbacService.getRole('admin');
      expect(role?.permissions).toEqual(['read:users']);
    });
  });

  describe('role checking', () => {
    beforeEach(() => {
      rbacService = new RBACService([adminRole, editorRole, viewerRole]);
    });

    it('should check if user has role', () => {
      const user: User = {
        id: 'user-1',
        email: 'admin@example.com',
        roles: ['admin'],
        permissions: [],
      };

      expect(rbacService.hasRole(user, 'admin')).toBe(true);
      expect(rbacService.hasRole(user, 'editor')).toBe(false);
    });

    it('should check if user has any of the roles', () => {
      const user: User = {
        id: 'user-2',
        roles: ['editor'],
        permissions: [],
      };

      expect(rbacService.hasAnyRole(user, ['admin', 'editor'])).toBe(true);
      expect(rbacService.hasAnyRole(user, ['admin', 'viewer'])).toBe(false);
    });

    it('should check if user has all roles', () => {
      const user: User = {
        id: 'user-3',
        roles: ['admin', 'editor'],
        permissions: [],
      };

      expect(rbacService.hasAllRoles(user, ['admin', 'editor'])).toBe(true);
      expect(rbacService.hasAllRoles(user, ['admin', 'editor', 'viewer'])).toBe(false);
    });
  });

  describe('permission checking', () => {
    beforeEach(() => {
      rbacService = new RBACService([adminRole, editorRole, viewerRole]);
    });

    it('should check if user has direct permission', () => {
      const user: User = {
        id: 'user-4',
        roles: [],
        permissions: ['read:comments', 'write:comments'],
      };

      expect(rbacService.hasPermission(user, 'read:comments')).toBe(true);
      expect(rbacService.hasPermission(user, 'write:comments')).toBe(true);
      expect(rbacService.hasPermission(user, 'delete:comments')).toBe(false);
    });

    it('should check permission for resource and action', () => {
      const user: User = {
        id: 'user-5',
        roles: [],
        permissions: ['read:posts', 'write:posts'],
      };

      expect(rbacService.hasPermissionForResource(user, 'posts', 'read')).toBe(true);
      expect(rbacService.hasPermissionForResource(user, 'posts', 'write')).toBe(true);
      expect(rbacService.hasPermissionForResource(user, 'posts', 'delete')).toBe(false);
    });

    it('should check if user has any permission', () => {
      const user: User = {
        id: 'user-6',
        roles: [],
        permissions: ['read:posts'],
      };

      expect(rbacService.hasAnyPermission(user, ['read:posts', 'write:posts'])).toBe(true);
      expect(rbacService.hasAnyPermission(user, ['write:posts', 'delete:posts'])).toBe(false);
    });

    it('should check if user has all permissions', () => {
      const user: User = {
        id: 'user-7',
        roles: [],
        permissions: ['read:posts', 'write:posts', 'delete:posts'],
      };

      expect(rbacService.hasAllPermissions(user, ['read:posts', 'write:posts'])).toBe(true);
      expect(rbacService.hasAllPermissions(user, ['read:posts', 'update:posts'])).toBe(false);
    });
  });

  describe('combined permissions from roles and direct permissions', () => {
    beforeEach(() => {
      rbacService = new RBACService([adminRole, editorRole, viewerRole]);
    });

    it('should get all user permissions from roles', () => {
      const user: User = {
        id: 'user-8',
        roles: ['editor'],
        permissions: [],
      };

      const permissions = rbacService.getUserPermissions(user);
      expect(permissions).toContain('read:posts');
      expect(permissions).toContain('write:posts');
      expect(permissions).toHaveLength(2);
    });

    it('should combine permissions from multiple roles', () => {
      const user: User = {
        id: 'user-9',
        roles: ['editor', 'viewer'],
        permissions: [],
      };

      const permissions = rbacService.getUserPermissions(user);
      expect(permissions).toContain('read:posts');
      expect(permissions).toContain('write:posts');
      expect(permissions.filter(p => p === 'read:posts')).toHaveLength(1);
    });

    it('should combine direct permissions with role permissions', () => {
      const user: User = {
        id: 'user-10',
        roles: ['viewer'],
        permissions: ['write:comments', 'read:comments'],
      };

      const permissions = rbacService.getUserPermissions(user);
      expect(permissions).toContain('read:posts');
      expect(permissions).toContain('write:comments');
      expect(permissions).toContain('read:comments');
    });

    it('should deduplicate permissions', () => {
      const user: User = {
        id: 'user-11',
        roles: ['editor'],
        permissions: ['read:posts'],
      };

      const permissions = rbacService.getUserPermissions(user);
      const readPostsCount = permissions.filter(p => p === 'read:posts').length;
      expect(readPostsCount).toBe(1);
    });

    it('should handle user with non-existent roles', () => {
      const user: User = {
        id: 'user-12',
        roles: ['non-existent-role'],
        permissions: ['read:posts'],
      };

      const permissions = rbacService.getUserPermissions(user);
      expect(permissions).toEqual(['read:posts']);
    });

    it('should return empty array for user with no roles or permissions', () => {
      const user: User = {
        id: 'user-13',
        roles: [],
        permissions: [],
      };

      const permissions = rbacService.getUserPermissions(user);
      expect(permissions).toEqual([]);
    });
  });

  describe('complex scenarios', () => {
    beforeEach(() => {
      rbacService = new RBACService([adminRole, editorRole, viewerRole]);
    });

    it('should support hierarchical permission checks', () => {
      const adminUser: User = {
        id: 'admin-1',
        roles: ['admin'],
        permissions: [],
      };

      const editorUser: User = {
        id: 'editor-1',
        roles: ['editor'],
        permissions: [],
      };

      expect(rbacService.hasPermission(adminUser, 'delete:users')).toBe(false);
      expect(rbacService.hasPermission(editorUser, 'delete:users')).toBe(false);

      const adminPermissions = rbacService.getUserPermissions(adminUser);
      expect(adminPermissions).toContain('delete:users');
    });

    it('should handle user with multiple roles and custom permissions', () => {
      const superUser: User = {
        id: 'super-1',
        roles: ['admin', 'editor'],
        permissions: ['execute:scripts', 'manage:system'],
      };

      const permissions = rbacService.getUserPermissions(superUser);

      expect(permissions).toContain('read:users');
      expect(permissions).toContain('write:users');
      expect(permissions).toContain('delete:users');
      expect(permissions).toContain('read:posts');
      expect(permissions).toContain('write:posts');
      expect(permissions).toContain('execute:scripts');
      expect(permissions).toContain('manage:system');
    });

    it('should support resource-based access control', () => {
      const user: User = {
        id: 'user-14',
        roles: ['editor'],
        permissions: [],
      };

      expect(rbacService.hasPermissionForResource(user, 'posts', 'read')).toBe(false);
      expect(rbacService.hasPermissionForResource(user, 'posts', 'write')).toBe(false);

      const permissions = rbacService.getUserPermissions(user);
      const canReadPosts = permissions.includes('read:posts');
      const canWritePosts = permissions.includes('write:posts');

      expect(canReadPosts).toBe(true);
      expect(canWritePosts).toBe(true);
    });
  });
});
