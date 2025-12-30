import { describe, it, expect, beforeEach } from 'vitest';
import { PromptTemplate } from '../PromptTemplate.js';
import { PromptRegistry } from '../PromptRegistry.js';
import { PromptLoader } from '../PromptLoader.js';
import { PromptVariableHelpers } from '../PromptVariable.js';

describe('PromptVariableHelpers', () => {
  describe('extractVariables', () => {
    it('should extract variables from template', () => {
      const vars = PromptVariableHelpers.extractVariables(
        'Hello {{name}}, you are {{age}} years old'
      );

      expect(vars).toEqual(['name', 'age']);
    });

    it('should handle single brace syntax', () => {
      const vars = PromptVariableHelpers.extractVariables(
        'Hello {name}, you are {age} years old'
      );

      expect(vars).toEqual(['name', 'age']);
    });

    it('should return unique variables', () => {
      const vars = PromptVariableHelpers.extractVariables(
        '{{name}} said {{name}}'
      );

      expect(vars).toEqual(['name']);
    });
  });

  describe('validate', () => {
    it('should find missing variables', () => {
      const missing = PromptVariableHelpers.validate(
        'Hello {{name}}',
        { age: 25 }
      );

      expect(missing).toEqual(['name']);
    });

    it('should pass when all variables present', () => {
      const missing = PromptVariableHelpers.validate(
        'Hello {{name}}',
        { name: 'Alice' }
      );

      expect(missing).toEqual([]);
    });
  });

  describe('substitute', () => {
    it('should substitute variables', () => {
      const result = PromptVariableHelpers.substitute(
        'Hello {{name}}, you are {{age}} years old',
        { name: 'Alice', age: 25 }
      );

      expect(result).toBe('Hello Alice, you are 25 years old');
    });

    it('should handle missing variables in non-strict mode', () => {
      const result = PromptVariableHelpers.substitute(
        'Hello {{name}}',
        {},
        false
      );

      expect(result).toBe('Hello {{name}}');
    });

    it('should throw in strict mode for missing variables', () => {
      expect(() =>
        PromptVariableHelpers.substitute('Hello {{name}}', {}, true)
      ).toThrow('Missing required variables');
    });
  });
});

describe('PromptTemplate', () => {
  let template: PromptTemplate;

  beforeEach(() => {
    template = new PromptTemplate({
      metadata: { name: 'greeting', version: '1.0' },
      template: 'Hello {{name}}, welcome to {{app}}!',
      variables: [
        { name: 'name', required: true },
        { name: 'app', defaultValue: 'our app' },
      ],
    });
  });

  describe('render', () => {
    it('should render template with variables', () => {
      const result = template.render({ name: 'Alice', app: 'MyApp' });

      expect(result).toBe('Hello Alice, welcome to MyApp!');
    });

    it('should use default values', () => {
      const result = template.render({ name: 'Alice' });

      expect(result).toBe('Hello Alice, welcome to our app!');
    });

    it('should throw on missing required variables in strict mode', () => {
      expect(() => template.render({})).toThrow('validation failed');
    });

    it('should cache rendered results', () => {
      const result1 = template.render({ name: 'Alice' });
      const result2 = template.render({ name: 'Alice' });

      expect(result1).toBe(result2);
      expect(template.getCacheStats().size).toBe(1);
    });
  });

  describe('validate', () => {
    it('should validate required variables', () => {
      const errors = template.validate({});

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('name');
    });

    it('should pass with all required variables', () => {
      const errors = template.validate({ name: 'Alice' });

      expect(errors).toEqual([]);
    });
  });

  describe('getMetadata', () => {
    it('should return metadata', () => {
      const metadata = template.getMetadata();

      expect(metadata.name).toBe('greeting');
      expect(metadata.version).toBe('1.0');
    });
  });

  describe('getVariables', () => {
    it('should return variables', () => {
      const variables = template.getVariables();

      expect(variables.length).toBe(2);
      expect(variables[0].name).toBe('name');
      expect(variables[1].name).toBe('app');
    });
  });

  describe('clearCache', () => {
    it('should clear render cache', () => {
      template.render({ name: 'Alice' });
      expect(template.getCacheStats().size).toBe(1);

      template.clearCache();
      expect(template.getCacheStats().size).toBe(0);
    });
  });
});

describe('PromptRegistry', () => {
  let registry: PromptRegistry;
  let template1: PromptTemplate;
  let template2: PromptTemplate;

  beforeEach(() => {
    registry = new PromptRegistry();

    template1 = new PromptTemplate({
      metadata: { name: 'greeting', tags: ['chat'] },
      template: 'Hello {{name}}!',
    });

    template2 = new PromptTemplate({
      metadata: { name: 'farewell', tags: ['chat'] },
      template: 'Goodbye {{name}}!',
    });
  });

  describe('register', () => {
    it('should register a template', () => {
      registry.register(template1);

      expect(registry.has('greeting')).toBe(true);
      expect(registry.size).toBe(1);
    });

    it('should throw on duplicate registration', () => {
      registry.register(template1);

      expect(() => registry.register(template1)).toThrow('already registered');
    });
  });

  describe('registerOrReplace', () => {
    it('should replace existing template', () => {
      registry.register(template1);

      const updated = new PromptTemplate({
        metadata: { name: 'greeting' },
        template: 'Hi {{name}}!',
      });

      registry.registerOrReplace(updated);

      expect(registry.size).toBe(1);
      expect(registry.get('greeting')).toBe(updated);
    });
  });

  describe('get', () => {
    it('should retrieve template by name', () => {
      registry.register(template1);

      const retrieved = registry.get('greeting');

      expect(retrieved).toBe(template1);
    });

    it('should throw for non-existent template', () => {
      expect(() => registry.get('nonexistent')).toThrow('not found');
    });
  });

  describe('tryGet', () => {
    it('should return template if exists', () => {
      registry.register(template1);

      const retrieved = registry.tryGet('greeting');

      expect(retrieved).toBe(template1);
    });

    it('should return undefined if not found', () => {
      const retrieved = registry.tryGet('nonexistent');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('unregister', () => {
    it('should remove template', () => {
      registry.register(template1);

      const removed = registry.unregister('greeting');

      expect(removed).toBe(true);
      expect(registry.has('greeting')).toBe(false);
    });
  });

  describe('findByTag', () => {
    it('should find templates by tag', () => {
      registry.registerAll([template1, template2]);

      const chatTemplates = registry.findByTag('chat');

      expect(chatTemplates.length).toBe(2);
    });
  });

  describe('clone', () => {
    it('should create independent copy', () => {
      registry.register(template1);

      const cloned = registry.clone();
      cloned.register(template2);

      expect(registry.size).toBe(1);
      expect(cloned.size).toBe(2);
    });
  });

  describe('merge', () => {
    it('should merge registries', () => {
      const registry2 = new PromptRegistry();
      registry.register(template1);
      registry2.register(template2);

      registry.merge(registry2);

      expect(registry.size).toBe(2);
    });
  });
});

describe('PromptLoader', () => {
  let loader: PromptLoader;

  beforeEach(() => {
    loader = new PromptLoader();
  });

  describe('fromObject', () => {
    it('should load template from object', () => {
      const template = loader.fromObject({
        metadata: { name: 'greeting' },
        template: 'Hello {{name}}!',
        variables: [{ name: 'name', required: true }],
      });

      expect(template.getMetadata().name).toBe('greeting');
      expect(template.render({ name: 'Alice' })).toBe('Hello Alice!');
    });

    it('should throw on invalid data', () => {
      expect(() =>
        loader.fromObject({
          metadata: { name: '' },
          template: '',
        })
      ).toThrow();
    });
  });

  describe('fromJSON', () => {
    it('should load template from JSON string', () => {
      const json = JSON.stringify({
        metadata: { name: 'greeting' },
        template: 'Hello {{name}}!',
      });

      const template = loader.fromJSON(json);

      expect(template.getMetadata().name).toBe('greeting');
    });

    it('should throw on invalid JSON', () => {
      expect(() => loader.fromJSON('invalid json')).toThrow();
    });
  });

  describe('toObject', () => {
    it('should serialize template to object', () => {
      const template = new PromptTemplate({
        metadata: { name: 'greeting' },
        template: 'Hello {{name}}!',
      });

      const data = loader.toObject(template);

      expect(data.metadata.name).toBe('greeting');
      expect(data.template).toBe('Hello {{name}}!');
    });
  });

  describe('toJSON', () => {
    it('should serialize template to JSON', () => {
      const template = new PromptTemplate({
        metadata: { name: 'greeting' },
        template: 'Hello {{name}}!',
      });

      const json = loader.toJSON(template);
      const parsed = JSON.parse(json);

      expect(parsed.metadata.name).toBe('greeting');
    });
  });

  describe('fromArray and toArray', () => {
    it('should handle arrays of templates', () => {
      const data = [
        {
          metadata: { name: 'greeting' },
          template: 'Hello!',
        },
        {
          metadata: { name: 'farewell' },
          template: 'Goodbye!',
        },
      ];

      const templates = loader.fromArray(data);
      const serialized = loader.toArray(templates);

      expect(templates.length).toBe(2);
      expect(serialized.length).toBe(2);
    });
  });
});
