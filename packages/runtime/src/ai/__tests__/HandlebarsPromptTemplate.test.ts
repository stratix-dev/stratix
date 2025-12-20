import { describe, it, expect, beforeEach } from 'vitest';
import { HandlebarsPromptTemplate } from '../HandlebarsPromptTemplate.js';
import type { PromptVariable } from '@stratix/core/ai-agents';

describe('HandlebarsPromptTemplate', () => {
  describe('basic rendering', () => {
    it('should render simple template with variables', () => {
      const template = new HandlebarsPromptTemplate({
        id: 'greeting',
        name: 'Greeting',
        version: '1.0.0',
        template: 'Hello {{userName}}!',
        variables: [{ name: 'userName', type: 'string', required: true }],
      });

      const result = template.render({ userName: 'Alice' });

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value).toBe('Hello Alice!');
      }
    });

    it('should render template with multiple variables', () => {
      const template = new HandlebarsPromptTemplate({
        id: 'multi-var',
        name: 'Multi Variable',
        version: '1.0.0',
        template: 'Hello {{userName}}, you have {{messageCount}} messages',
        variables: [
          { name: 'userName', type: 'string', required: true },
          { name: 'messageCount', type: 'number', required: true },
        ],
      });

      const result = template.render({ userName: 'Bob', messageCount: 5 });

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value).toBe('Hello Bob, you have 5 messages');
      }
    });

    it('should use default values for optional variables', () => {
      const template = new HandlebarsPromptTemplate({
        id: 'with-defaults',
        name: 'With Defaults',
        version: '1.0.0',
        template: 'Hello {{userName}}, premium: {{premium}}',
        variables: [
          { name: 'userName', type: 'string', required: true },
          { name: 'premium', type: 'boolean', required: false, default: false },
        ],
      });

      const result = template.render({ userName: 'Charlie' });

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value).toBe('Hello Charlie, premium: false');
      }
    });
  });

  describe('Handlebars features', () => {
    it('should support conditionals', () => {
      const template = new HandlebarsPromptTemplate({
        id: 'conditional',
        name: 'Conditional',
        version: '1.0.0',
        template: 'Hello {{userName}}!{{#if premium}} You are a premium user.{{/if}}',
        variables: [
          { name: 'userName', type: 'string', required: true },
          { name: 'premium', type: 'boolean', required: false, default: false },
        ],
      });

      const result1 = template.render({ userName: 'Alice', premium: true });
      expect(result1.isSuccess).toBe(true);
      if (result1.isSuccess) {
        expect(result1.value).toBe('Hello Alice! You are a premium user.');
      }

      const result2 = template.render({ userName: 'Bob', premium: false });
      expect(result2.isSuccess).toBe(true);
      if (result2.isSuccess) {
        expect(result2.value).toBe('Hello Bob!');
      }
    });

    it('should support loops', () => {
      const template = new HandlebarsPromptTemplate({
        id: 'loop',
        name: 'Loop',
        version: '1.0.0',
        template: 'Items: {{#each items}}{{this}}, {{/each}}',
        variables: [{ name: 'items', type: 'array', required: true }],
      });

      const result = template.render({ items: ['apple', 'banana', 'cherry'] });

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value).toBe('Items: apple, banana, cherry, ');
      }
    });

    it('should support unless', () => {
      const template = new HandlebarsPromptTemplate({
        id: 'unless',
        name: 'Unless',
        version: '1.0.0',
        template: 'Status: {{#unless active}}Inactive{{/unless}}{{#if active}}Active{{/if}}',
        variables: [{ name: 'active', type: 'boolean', required: true }],
      });

      const result1 = template.render({ active: true });
      expect(result1.isSuccess).toBe(true);
      if (result1.isSuccess) {
        expect(result1.value).toBe('Status: Active');
      }

      const result2 = template.render({ active: false });
      expect(result2.isSuccess).toBe(true);
      if (result2.isSuccess) {
        expect(result2.value).toBe('Status: Inactive');
      }
    });

    it('should support custom helpers', () => {
      const template = new HandlebarsPromptTemplate({
        id: 'custom-helper',
        name: 'Custom Helper',
        version: '1.0.0',
        template: 'Hello {{uppercase userName}}!',
        variables: [{ name: 'userName', type: 'string', required: true }],
        helpers: {
          uppercase: (str: string) => str.toUpperCase(),
        },
      });

      const result = template.render({ userName: 'alice' });

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value).toBe('Hello ALICE!');
      }
    });
  });

  describe('validation', () => {
    let template: HandlebarsPromptTemplate;

    beforeEach(() => {
      template = new HandlebarsPromptTemplate({
        id: 'validation',
        name: 'Validation',
        version: '1.0.0',
        template: 'Hello {{userName}}, age: {{age}}',
        variables: [
          { name: 'userName', type: 'string', required: true },
          { name: 'age', type: 'number', required: true },
        ],
      });
    });

    it('should validate required variables', () => {
      const validation = template.validate({ userName: 'Alice' });

      expect(validation.valid).toBe(false);
      expect(validation.missingRequired).toContain('age');
    });

    it('should validate variable types', () => {
      const validation = template.validate({ userName: 'Alice', age: 'twenty' });

      expect(validation.valid).toBe(false);
      expect(validation.typeMismatches['age']).toEqual({
        expected: 'number',
        actual: 'string',
      });
    });

    it('should pass validation with correct variables', () => {
      const validation = template.validate({ userName: 'Alice', age: 30 });

      expect(validation.valid).toBe(true);
      expect(validation.missingRequired).toHaveLength(0);
      expect(Object.keys(validation.typeMismatches)).toHaveLength(0);
    });

    it('should validate custom validators', () => {
      const template = new HandlebarsPromptTemplate({
        id: 'custom-validator',
        name: 'Custom Validator',
        version: '1.0.0',
        template: 'Age: {{age}}',
        variables: [
          {
            name: 'age',
            type: 'number',
            required: true,
            validator: (value: unknown) =>
              typeof value === 'number' && value >= 18 && value <= 100,
          },
        ],
      });

      const validation1 = template.validate({ age: 25 });
      expect(validation1.valid).toBe(true);

      const validation2 = template.validate({ age: 15 });
      expect(validation2.valid).toBe(false);
      expect(validation2.errors['age']).toBe('Failed custom validation');

      const validation3 = template.validate({ age: 105 });
      expect(validation3.valid).toBe(false);
    });

    it('should fail rendering with invalid variables', () => {
      const result = template.render({ userName: 'Alice' });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.error.message).toContain('Missing required variable: age');
      }
    });

    it('should fail rendering with type mismatch', () => {
      const result = template.render({ userName: 'Alice', age: 'twenty' });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.error.message).toContain('Type mismatch');
      }
    });
  });

  describe('type detection', () => {
    it('should detect string type', () => {
      const template = new HandlebarsPromptTemplate({
        id: 'string-type',
        name: 'String Type',
        version: '1.0.0',
        template: '{{value}}',
        variables: [{ name: 'value', type: 'string', required: true }],
      });

      const validation = template.validate({ value: 'hello' });
      expect(validation.valid).toBe(true);
    });

    it('should detect number type', () => {
      const template = new HandlebarsPromptTemplate({
        id: 'number-type',
        name: 'Number Type',
        version: '1.0.0',
        template: '{{value}}',
        variables: [{ name: 'value', type: 'number', required: true }],
      });

      const validation = template.validate({ value: 42 });
      expect(validation.valid).toBe(true);
    });

    it('should detect boolean type', () => {
      const template = new HandlebarsPromptTemplate({
        id: 'boolean-type',
        name: 'Boolean Type',
        version: '1.0.0',
        template: '{{value}}',
        variables: [{ name: 'value', type: 'boolean', required: true }],
      });

      const validation = template.validate({ value: true });
      expect(validation.valid).toBe(true);
    });

    it('should detect array type', () => {
      const template = new HandlebarsPromptTemplate({
        id: 'array-type',
        name: 'Array Type',
        version: '1.0.0',
        template: '{{value}}',
        variables: [{ name: 'value', type: 'array', required: true }],
      });

      const validation = template.validate({ value: [1, 2, 3] });
      expect(validation.valid).toBe(true);
    });

    it('should detect object type', () => {
      const template = new HandlebarsPromptTemplate({
        id: 'object-type',
        name: 'Object Type',
        version: '1.0.0',
        template: '{{value.name}}',
        variables: [{ name: 'value', type: 'object', required: true }],
      });

      const validation = template.validate({ value: { name: 'test' } });
      expect(validation.valid).toBe(true);
    });
  });

  describe('metadata', () => {
    it('should store provided metadata', () => {
      const createdAt = new Date('2024-01-01');
      const template = new HandlebarsPromptTemplate({
        id: 'metadata',
        name: 'Metadata Test',
        version: '1.0.0',
        template: '{{value}}',
        variables: [],
        metadata: {
          description: 'Test template',
          author: 'Test Author',
          tags: ['test', 'example'],
          model: 'gpt-4',
          maxTokens: 1000,
          temperature: 0.7,
          createdAt,
        },
      });

      expect(template.metadata.description).toBe('Test template');
      expect(template.metadata.author).toBe('Test Author');
      expect(template.metadata.tags).toEqual(['test', 'example']);
      expect(template.metadata.model).toBe('gpt-4');
      expect(template.metadata.maxTokens).toBe(1000);
      expect(template.metadata.temperature).toBe(0.7);
      expect(template.metadata.createdAt).toEqual(createdAt);
    });

    it('should set default timestamps if not provided', () => {
      const template = new HandlebarsPromptTemplate({
        id: 'defaults',
        name: 'Defaults',
        version: '1.0.0',
        template: '{{value}}',
        variables: [],
      });

      expect(template.metadata.createdAt).toBeInstanceOf(Date);
      expect(template.metadata.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('clone', () => {
    it('should clone template with new version', () => {
      const original = new HandlebarsPromptTemplate({
        id: 'original',
        name: 'Original',
        version: '1.0.0',
        template: 'Hello {{name}}',
        variables: [{ name: 'name', type: 'string', required: true }],
      });

      const cloned = original.clone({ version: '2.0.0' });

      expect(cloned.id).toBe('original');
      expect(cloned.name).toBe('Original');
      expect(cloned.version).toBe('2.0.0');
      expect(cloned.template).toBe('Hello {{name}}');
    });

    it('should clone template with updated metadata', async () => {
      const original = new HandlebarsPromptTemplate({
        id: 'original',
        name: 'Original',
        version: '1.0.0',
        template: 'Hello {{name}}',
        variables: [{ name: 'name', type: 'string', required: true }],
        metadata: {
          tags: ['v1'],
        },
      });

      // Wait 1ms to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));

      const cloned = original.clone({
        metadata: {
          tags: ['v2', 'updated'],
        },
      });

      expect(cloned.metadata.tags).toEqual(['v2', 'updated']);
      expect(cloned.metadata.updatedAt.getTime()).toBeGreaterThanOrEqual(
        original.metadata.updatedAt.getTime()
      );
    });
  });

  describe('error handling', () => {
    it('should handle rendering errors gracefully', () => {
      const template = new HandlebarsPromptTemplate({
        id: 'error',
        name: 'Error',
        version: '1.0.0',
        template: 'Hello {{helper userName}}',
        variables: [{ name: 'userName', type: 'string', required: true }],
        helpers: {
          helper: () => {
            throw new Error('Helper error');
          },
        },
      });

      const result = template.render({ userName: 'Alice' });

      expect(result.isSuccess).toBe(false);
      if (!result.isSuccess) {
        expect(result.error.message).toContain('Failed to render template');
      }
    });
  });

  describe('complex templates', () => {
    it('should render complex multi-line prompts', () => {
      const template = new HandlebarsPromptTemplate({
        id: 'complex',
        name: 'Complex',
        version: '1.0.0',
        template: `You are a helpful assistant.

User: {{userName}}
Role: {{role}}

{{#if premium}}
Premium features enabled:
{{#each features}}
- {{this}}
{{/each}}
{{/if}}

Please help the user with: {{task}}`,
        variables: [
          { name: 'userName', type: 'string', required: true },
          { name: 'role', type: 'string', required: true },
          { name: 'premium', type: 'boolean', required: false, default: false },
          { name: 'features', type: 'array', required: false, default: [] },
          { name: 'task', type: 'string', required: true },
        ],
      });

      const result = template.render({
        userName: 'Alice',
        role: 'developer',
        premium: true,
        features: ['Priority support', 'Advanced analytics'],
        task: 'debugging code',
      });

      expect(result.isSuccess).toBe(true);
      if (result.isSuccess) {
        expect(result.value).toContain('User: Alice');
        expect(result.value).toContain('Role: developer');
        expect(result.value).toContain('Premium features enabled');
        expect(result.value).toContain('- Priority support');
        expect(result.value).toContain('- Advanced analytics');
        expect(result.value).toContain('Please help the user with: debugging code');
      }
    });
  });
});
