import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryPromptRegistry } from '../InMemoryPromptRegistry.js';
import { HandlebarsPromptTemplate } from '../HandlebarsPromptTemplate.js';
import type { PromptTemplate } from '@stratix/core/ai-agents';

describe('InMemoryPromptRegistry', () => {
  let registry: InMemoryPromptRegistry;
  let template1: PromptTemplate;
  let template2: PromptTemplate;
  let template1v2: PromptTemplate;

  beforeEach(() => {
    registry = new InMemoryPromptRegistry();

    template1 = new HandlebarsPromptTemplate({
      id: 'greeting',
      name: 'Greeting',
      version: '1.0.0',
      template: 'Hello {{name}}!',
      variables: [{ name: 'name', type: 'string', required: true }],
      metadata: {
        tags: ['support', 'greeting'],
        model: 'gpt-4',
      },
    });

    template2 = new HandlebarsPromptTemplate({
      id: 'farewell',
      name: 'Farewell',
      version: '1.0.0',
      template: 'Goodbye {{name}}!',
      variables: [{ name: 'name', type: 'string', required: true }],
      metadata: {
        tags: ['support', 'farewell'],
        model: 'gpt-3.5-turbo',
      },
    });

    template1v2 = new HandlebarsPromptTemplate({
      id: 'greeting',
      name: 'Greeting v2',
      version: '2.0.0',
      template: 'Hi {{name}}, welcome!',
      variables: [{ name: 'name', type: 'string', required: true }],
      metadata: {
        tags: ['support', 'greeting', 'v2'],
        model: 'gpt-4',
      },
    });
  });

  describe('register', () => {
    it('should register a template', () => {
      registry.register(template1);

      expect(registry.has('greeting')).toBe(true);
      expect(registry.get('greeting')).toBe(template1);
    });

    it('should register multiple templates', () => {
      registry.register(template1);
      registry.register(template2);

      expect(registry.size).toBe(2);
      expect(registry.has('greeting')).toBe(true);
      expect(registry.has('farewell')).toBe(true);
    });

    it('should register multiple versions of same template', () => {
      registry.register(template1);
      registry.register(template1v2);

      expect(registry.size).toBe(1);
      expect(registry.totalVersions).toBe(2);
      expect(registry.get('greeting', '1.0.0')).toBe(template1);
      expect(registry.get('greeting', '2.0.0')).toBe(template1v2);
    });

    it('should replace existing version when re-registered', () => {
      registry.register(template1);

      const updated = new HandlebarsPromptTemplate({
        id: 'greeting',
        name: 'Updated Greeting',
        version: '1.0.0',
        template: 'Hey {{name}}!',
        variables: [{ name: 'name', type: 'string', required: true }],
      });

      registry.register(updated);

      expect(registry.totalVersions).toBe(1);
      expect(registry.get('greeting', '1.0.0')).toBe(updated);
    });
  });

  describe('get', () => {
    beforeEach(() => {
      registry.register(template1);
      registry.register(template1v2);
    });

    it('should get template by ID and version', () => {
      const result = registry.get('greeting', '1.0.0');

      expect(result).toBe(template1);
    });

    it('should get latest version when no version specified', () => {
      const result = registry.get('greeting');

      expect(result).toBe(template1v2); // v2 is latest
    });

    it('should return undefined for non-existent ID', () => {
      const result = registry.get('nonexistent');

      expect(result).toBeUndefined();
    });

    it('should return undefined for non-existent version', () => {
      const result = registry.get('greeting', '3.0.0');

      expect(result).toBeUndefined();
    });
  });

  describe('getLatest', () => {
    it('should return latest version by semantic versioning', () => {
      const v1_0_0 = new HandlebarsPromptTemplate({
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        template: 'v1.0.0',
        variables: [],
      });

      const v1_1_0 = new HandlebarsPromptTemplate({
        id: 'test',
        name: 'Test',
        version: '1.1.0',
        template: 'v1.1.0',
        variables: [],
      });

      const v2_0_0 = new HandlebarsPromptTemplate({
        id: 'test',
        name: 'Test',
        version: '2.0.0',
        template: 'v2.0.0',
        variables: [],
      });

      registry.register(v1_0_0);
      registry.register(v2_0_0);
      registry.register(v1_1_0);

      const latest = registry.getLatest('test');

      expect(latest).toBe(v2_0_0);
    });

    it('should return undefined for non-existent prompt', () => {
      const latest = registry.getLatest('nonexistent');

      expect(latest).toBeUndefined();
    });
  });

  describe('list', () => {
    it('should list all registered templates', () => {
      registry.register(template1);
      registry.register(template2);
      registry.register(template1v2);

      const all = registry.list();

      expect(all).toHaveLength(3);
      expect(all).toContain(template1);
      expect(all).toContain(template2);
      expect(all).toContain(template1v2);
    });

    it('should return empty array when registry is empty', () => {
      const all = registry.list();

      expect(all).toHaveLength(0);
    });
  });

  describe('findByTags', () => {
    beforeEach(() => {
      registry.register(template1);
      registry.register(template2);
      registry.register(template1v2);
    });

    it('should find templates by single tag', () => {
      const results = registry.findByTags(['greeting']);

      expect(results).toHaveLength(2); // template1 and template1v2
      expect(results).toContain(template1);
      expect(results).toContain(template1v2);
    });

    it('should find templates by multiple tags (OR logic)', () => {
      const results = registry.findByTags(['greeting', 'farewell']);

      expect(results).toHaveLength(3); // All templates match either tag
    });

    it('should be case-insensitive', () => {
      const results = registry.findByTags(['SUPPORT']);

      expect(results).toHaveLength(3); // All have 'support' tag
    });

    it('should return empty array when no matches', () => {
      const results = registry.findByTags(['nonexistent']);

      expect(results).toHaveLength(0);
    });
  });

  describe('findByModel', () => {
    beforeEach(() => {
      registry.register(template1);
      registry.register(template2);
      registry.register(template1v2);
    });

    it('should find templates by model', () => {
      const results = registry.findByModel('gpt-4');

      expect(results).toHaveLength(2); // template1 and template1v2
    });

    it('should be case-insensitive', () => {
      const results = registry.findByModel('GPT-4');

      expect(results).toHaveLength(2);
    });

    it('should return empty array when no matches', () => {
      const results = registry.findByModel('claude-2');

      expect(results).toHaveLength(0);
    });
  });

  describe('has', () => {
    beforeEach(() => {
      registry.register(template1);
      registry.register(template1v2);
    });

    it('should return true when template exists', () => {
      expect(registry.has('greeting')).toBe(true);
    });

    it('should return true when specific version exists', () => {
      expect(registry.has('greeting', '1.0.0')).toBe(true);
      expect(registry.has('greeting', '2.0.0')).toBe(true);
    });

    it('should return false when template does not exist', () => {
      expect(registry.has('nonexistent')).toBe(false);
    });

    it('should return false when version does not exist', () => {
      expect(registry.has('greeting', '3.0.0')).toBe(false);
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      registry.register(template1);
      registry.register(template1v2);
      registry.register(template2);
    });

    it('should remove specific version', () => {
      const removed = registry.remove('greeting', '1.0.0');

      expect(removed).toBe(true);
      expect(registry.has('greeting', '1.0.0')).toBe(false);
      expect(registry.has('greeting', '2.0.0')).toBe(true);
      expect(registry.size).toBe(2); // greeting and farewell
    });

    it('should remove all versions when no version specified', () => {
      const removed = registry.remove('greeting');

      expect(removed).toBe(true);
      expect(registry.has('greeting')).toBe(false);
      expect(registry.size).toBe(1); // Only farewell remains
    });

    it('should return false when trying to remove non-existent template', () => {
      const removed = registry.remove('nonexistent');

      expect(removed).toBe(false);
    });

    it('should clean up empty version maps', () => {
      registry.remove('greeting', '1.0.0');
      registry.remove('greeting', '2.0.0');

      expect(registry.has('greeting')).toBe(false);
      expect(registry.size).toBe(1);
    });
  });

  describe('getVersions', () => {
    it('should return all versions sorted newest first', () => {
      const v1 = new HandlebarsPromptTemplate({
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        template: 'v1',
        variables: [],
      });

      const v2 = new HandlebarsPromptTemplate({
        id: 'test',
        name: 'Test',
        version: '2.0.0',
        template: 'v2',
        variables: [],
      });

      const v1_5 = new HandlebarsPromptTemplate({
        id: 'test',
        name: 'Test',
        version: '1.5.0',
        template: 'v1.5',
        variables: [],
      });

      registry.register(v1);
      registry.register(v2);
      registry.register(v1_5);

      const versions = registry.getVersions('test');

      expect(versions).toHaveLength(3);
      expect(versions[0]).toBe(v2);
      expect(versions[1]).toBe(v1_5);
      expect(versions[2]).toBe(v1);
    });

    it('should return empty array for non-existent prompt', () => {
      const versions = registry.getVersions('nonexistent');

      expect(versions).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should remove all templates', () => {
      registry.register(template1);
      registry.register(template2);

      registry.clear();

      expect(registry.size).toBe(0);
      expect(registry.totalVersions).toBe(0);
      expect(registry.list()).toHaveLength(0);
    });
  });

  describe('statistics', () => {
    it('should return size and totalVersions', () => {
      registry.register(template1);
      registry.register(template1v2);
      registry.register(template2);

      expect(registry.size).toBe(2); // 2 unique IDs
      expect(registry.totalVersions).toBe(3); // 3 total versions
    });
  });

  describe('getGrouped', () => {
    it('should return templates grouped by ID', () => {
      registry.register(template1);
      registry.register(template1v2);
      registry.register(template2);

      const grouped = registry.getGrouped();

      expect(grouped.size).toBe(2);
      expect(grouped.get('greeting')).toHaveLength(2);
      expect(grouped.get('farewell')).toHaveLength(1);
    });

    it('should sort versions newest first within each group', () => {
      registry.register(template1);
      registry.register(template1v2);

      const grouped = registry.getGrouped();
      const greetingVersions = grouped.get('greeting')!;

      expect(greetingVersions[0].version).toBe('2.0.0');
      expect(greetingVersions[1].version).toBe('1.0.0');
    });
  });

  describe('searchByName', () => {
    beforeEach(() => {
      registry.register(template1);
      registry.register(template2);
    });

    it('should find templates by partial name match', () => {
      const results = registry.searchByName('greet');

      expect(results).toHaveLength(1);
      expect(results[0]).toBe(template1);
    });

    it('should be case-insensitive', () => {
      const results = registry.searchByName('GREETING');

      expect(results).toHaveLength(1);
    });

    it('should return empty array when no matches', () => {
      const results = registry.searchByName('nonexistent');

      expect(results).toHaveLength(0);
    });
  });

  describe('getStatistics', () => {
    it('should return comprehensive statistics', () => {
      registry.register(template1);
      registry.register(template1v2);
      registry.register(template2);

      const stats = registry.getStatistics();

      expect(stats.totalPrompts).toBe(2);
      expect(stats.totalVersions).toBe(3);
      expect(stats.averageVersionsPerPrompt).toBe(1.5);
      expect(stats.promptsWithMultipleVersions).toBe(1);
      expect(stats.totalTags).toBe(4); // support, greeting, farewell, v2
      expect(stats.totalModels).toBe(2); // gpt-4, gpt-3.5-turbo
      expect(stats.tags).toContain('support');
      expect(stats.tags).toContain('greeting');
      expect(stats.models).toContain('gpt-4');
      expect(stats.models).toContain('gpt-3.5-turbo');
    });

    it('should handle empty registry', () => {
      const stats = registry.getStatistics();

      expect(stats.totalPrompts).toBe(0);
      expect(stats.totalVersions).toBe(0);
      expect(stats.averageVersionsPerPrompt).toBe(0);
      expect(stats.promptsWithMultipleVersions).toBe(0);
      expect(stats.totalTags).toBe(0);
      expect(stats.totalModels).toBe(0);
    });
  });
});
