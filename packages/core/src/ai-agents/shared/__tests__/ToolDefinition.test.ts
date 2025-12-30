import { describe, it, expect } from 'vitest';
import {
  ToolDefinitionHelpers,
  type ToolDefinition,
  type PropertySchema,
} from '../ToolDefinition.js';

describe('ToolDefinitionHelpers', () => {
  describe('validate', () => {
    it('should accept valid tool definition', () => {
      const definition: ToolDefinition = {
        name: 'search_knowledge_base',
        description: 'Search the company knowledge base for relevant articles',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query',
            },
          },
          required: ['query'],
        },
      };

      const errors = ToolDefinitionHelpers.validate(definition);

      expect(errors).toEqual([]);
    });

    it('should reject empty name', () => {
      const definition: ToolDefinition = {
        name: '',
        description: 'A valid description',
        parameters: {
          type: 'object',
          properties: {},
        },
      };

      const errors = ToolDefinitionHelpers.validate(definition);

      expect(errors).toContain('Tool name cannot be empty');
    });

    it('should reject whitespace-only name', () => {
      const definition: ToolDefinition = {
        name: '   ',
        description: 'A valid description',
        parameters: {
          type: 'object',
          properties: {},
        },
      };

      const errors = ToolDefinitionHelpers.validate(definition);

      expect(errors).toContain('Tool name cannot be empty');
    });

    it('should reject non-snake_case names', () => {
      const invalidNames = [
        'SearchKnowledgeBase', // PascalCase
        'searchKnowledgeBase', // camelCase
        'search-knowledge-base', // kebab-case
        'search knowledge base', // spaces
        'Search_Base', // Mixed case
        '123_search', // Starts with number
        'search__base', // Double underscore (allowed but not ideal)
      ];

      for (const name of invalidNames.slice(0, -1)) {
        const definition: ToolDefinition = {
          name,
          description: 'A valid description',
          parameters: {
            type: 'object',
            properties: {},
          },
        };

        const errors = ToolDefinitionHelpers.validate(definition);

        expect(errors).toContain(
          'Tool name must be snake_case (lowercase letters, numbers, underscores)'
        );
      }
    });

    it('should accept valid snake_case names', () => {
      const validNames = [
        'search',
        'search_base',
        'search_knowledge_base',
        'get_user_by_id',
        'create_ticket_v2',
        'tool123',
        'a',
      ];

      for (const name of validNames) {
        const definition: ToolDefinition = {
          name,
          description: 'A valid description',
          parameters: {
            type: 'object',
            properties: {},
          },
        };

        const errors = ToolDefinitionHelpers.validate(definition);

        expect(errors).toEqual([]);
      }
    });

    it('should reject empty description', () => {
      const definition: ToolDefinition = {
        name: 'valid_name',
        description: '',
        parameters: {
          type: 'object',
          properties: {},
        },
      };

      const errors = ToolDefinitionHelpers.validate(definition);

      expect(errors).toContain('Tool description cannot be empty');
    });

    it('should reject whitespace-only description', () => {
      const definition: ToolDefinition = {
        name: 'valid_name',
        description: '   ',
        parameters: {
          type: 'object',
          properties: {},
        },
      };

      const errors = ToolDefinitionHelpers.validate(definition);

      expect(errors).toContain('Tool description cannot be empty');
    });

    it('should reject overly long descriptions', () => {
      const longDescription = 'x'.repeat(501);
      const definition: ToolDefinition = {
        name: 'valid_name',
        description: longDescription,
        parameters: {
          type: 'object',
          properties: {},
        },
      };

      const errors = ToolDefinitionHelpers.validate(definition);

      expect(errors).toContain('Tool description should be concise (<500 characters)');
    });

    it('should accept description exactly at limit (500 chars)', () => {
      const description = 'x'.repeat(500);
      const definition: ToolDefinition = {
        name: 'valid_name',
        description,
        parameters: {
          type: 'object',
          properties: {},
        },
      };

      const errors = ToolDefinitionHelpers.validate(definition);

      expect(errors).toEqual([]);
    });

    it('should reject non-object parameter type', () => {
      const definition = {
        name: 'valid_name',
        description: 'A valid description',
        parameters: {
          type: 'string' as any,
          properties: {},
        },
      };

      const errors = ToolDefinitionHelpers.validate(definition);

      expect(errors).toContain('Tool parameters must be an object type');
    });

    it('should reject missing properties', () => {
      const definition = {
        name: 'valid_name',
        description: 'A valid description',
        parameters: {
          type: 'object',
        } as any,
      };

      const errors = ToolDefinitionHelpers.validate(definition);

      expect(errors).toContain('Tool parameters must have properties defined');
    });

    it('should collect multiple validation errors', () => {
      const definition: ToolDefinition = {
        name: 'Invalid Name',
        description: '',
        parameters: {
          type: 'array' as any,
          properties: {},
        },
      };

      const errors = ToolDefinitionHelpers.validate(definition);

      expect(errors.length).toBeGreaterThan(1);
      expect(errors).toContain(
        'Tool name must be snake_case (lowercase letters, numbers, underscores)'
      );
      expect(errors).toContain('Tool description cannot be empty');
      expect(errors).toContain('Tool parameters must be an object type');
    });
  });

  describe('create', () => {
    it('should create simple tool definition', () => {
      const definition = ToolDefinitionHelpers.create(
        'search_base',
        'Search the knowledge base',
        {
          query: {
            type: 'string',
            description: 'Search query',
          },
        },
        ['query']
      );

      expect(definition).toEqual({
        name: 'search_base',
        description: 'Search the knowledge base',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
          },
          required: ['query'],
        },
      });

      expect(ToolDefinitionHelpers.isValid(definition)).toBe(true);
    });

    it('should create tool without required parameters', () => {
      const definition = ToolDefinitionHelpers.create(
        'get_status',
        'Get current system status',
        {}
      );

      expect(definition.parameters.required).toBeUndefined();
      expect(ToolDefinitionHelpers.isValid(definition)).toBe(true);
    });

    it('should handle multiple property types', () => {
      const properties: Record<string, PropertySchema> = {
        query: {
          type: 'string',
          description: 'Search query',
          minLength: 1,
          maxLength: 200,
        },
        limit: {
          type: 'number',
          description: 'Maximum results',
          minimum: 1,
          maximum: 100,
        },
        include_archived: {
          type: 'boolean',
          description: 'Include archived items',
        },
        tags: {
          type: 'array',
          description: 'Filter by tags',
          items: {
            type: 'string',
          },
        },
      };

      const definition = ToolDefinitionHelpers.create(
        'advanced_search',
        'Advanced search with filters',
        properties,
        ['query']
      );

      expect(definition.parameters.properties).toEqual(properties);
      expect(ToolDefinitionHelpers.isValid(definition)).toBe(true);
    });

    it('should create nested object properties', () => {
      const properties: Record<string, PropertySchema> = {
        user: {
          type: 'object',
          description: 'User information',
          properties: {
            name: {
              type: 'string',
              description: 'User name',
            },
            email: {
              type: 'string',
              description: 'User email',
              format: 'email',
            },
          },
          required: ['name'],
        },
      };

      const definition = ToolDefinitionHelpers.create(
        'create_user',
        'Create a new user',
        properties,
        ['user']
      );

      expect(ToolDefinitionHelpers.isValid(definition)).toBe(true);
    });
  });

  describe('isValid', () => {
    it('should return true for valid definition', () => {
      const definition = ToolDefinitionHelpers.create(
        'valid_tool',
        'A valid tool',
        {
          param: {
            type: 'string',
          },
        }
      );

      expect(ToolDefinitionHelpers.isValid(definition)).toBe(true);
    });

    it('should return false for invalid definition', () => {
      const definition: ToolDefinition = {
        name: 'Invalid Name',
        description: '',
        parameters: {
          type: 'object',
          properties: {},
        },
      };

      expect(ToolDefinitionHelpers.isValid(definition)).toBe(false);
    });

    it('should be equivalent to validate().length === 0', () => {
      const validDef = ToolDefinitionHelpers.create('tool', 'A tool', {
        x: { type: 'string' },
      });
      const invalidDef: ToolDefinition = {
        name: '',
        description: '',
        parameters: { type: 'object', properties: {} },
      };

      expect(ToolDefinitionHelpers.isValid(validDef)).toBe(
        ToolDefinitionHelpers.validate(validDef).length === 0
      );
      expect(ToolDefinitionHelpers.isValid(invalidDef)).toBe(
        ToolDefinitionHelpers.validate(invalidDef).length === 0
      );
    });
  });

  describe('property schema types', () => {
    it('should support string properties with constraints', () => {
      const definition = ToolDefinitionHelpers.create('tool', 'A tool', {
        email: {
          type: 'string',
          format: 'email',
          minLength: 5,
          maxLength: 100,
        },
        status: {
          type: 'string',
          enum: ['active', 'inactive', 'pending'],
        },
        pattern_test: {
          type: 'string',
          pattern: '^[A-Z]{3}$',
        },
      });

      expect(ToolDefinitionHelpers.isValid(definition)).toBe(true);
    });

    it('should support number properties with constraints', () => {
      const definition = ToolDefinitionHelpers.create('tool', 'A tool', {
        age: {
          type: 'integer',
          minimum: 0,
          maximum: 150,
        },
        price: {
          type: 'number',
          exclusiveMinimum: 0,
          multipleOf: 0.01,
        },
      });

      expect(ToolDefinitionHelpers.isValid(definition)).toBe(true);
    });

    it('should support array properties with item schema', () => {
      const definition = ToolDefinitionHelpers.create('tool', 'A tool', {
        tags: {
          type: 'array',
          items: {
            type: 'string',
          },
          minItems: 1,
          maxItems: 10,
          uniqueItems: true,
        },
        coordinates: {
          type: 'array',
          items: {
            type: 'number',
          },
        },
      });

      expect(ToolDefinitionHelpers.isValid(definition)).toBe(true);
    });

    it('should support nested object properties', () => {
      const definition = ToolDefinitionHelpers.create('tool', 'A tool', {
        address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
            city: { type: 'string' },
            zip: {
              type: 'string',
              pattern: '^\\d{5}$',
            },
          },
          required: ['city'],
          additionalProperties: false,
        },
      });

      expect(ToolDefinitionHelpers.isValid(definition)).toBe(true);
    });

    it('should support boolean properties', () => {
      const definition = ToolDefinitionHelpers.create('tool', 'A tool', {
        enabled: {
          type: 'boolean',
          description: 'Whether the feature is enabled',
        },
      });

      expect(ToolDefinitionHelpers.isValid(definition)).toBe(true);
    });
  });

  describe('real-world examples', () => {
    it('should validate search_knowledge_base tool', () => {
      const definition: ToolDefinition = {
        name: 'search_knowledge_base',
        description: 'Search the company knowledge base for relevant articles',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results',
              minimum: 1,
              maximum: 100,
            },
          },
          required: ['query'],
        },
      };

      expect(ToolDefinitionHelpers.isValid(definition)).toBe(true);
      expect(ToolDefinitionHelpers.validate(definition)).toEqual([]);
    });

    it('should validate create_ticket tool', () => {
      const definition: ToolDefinition = {
        name: 'create_ticket',
        description: 'Create a support ticket in the ticketing system',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Ticket title',
              minLength: 5,
              maxLength: 200,
            },
            description: {
              type: 'string',
              description: 'Detailed description of the issue',
              minLength: 10,
            },
            priority: {
              type: 'string',
              description: 'Ticket priority',
              enum: ['low', 'medium', 'high', 'urgent'],
            },
            tags: {
              type: 'array',
              description: 'Tags for categorization',
              items: {
                type: 'string',
              },
              maxItems: 5,
            },
          },
          required: ['title', 'description', 'priority'],
        },
      };

      expect(ToolDefinitionHelpers.isValid(definition)).toBe(true);
    });

    it('should validate send_email tool', () => {
      const definition: ToolDefinition = {
        name: 'send_email',
        description: 'Send an email to specified recipients',
        parameters: {
          type: 'object',
          properties: {
            to: {
              type: 'array',
              description: 'Recipient email addresses',
              items: {
                type: 'string',
                format: 'email',
              },
              minItems: 1,
            },
            subject: {
              type: 'string',
              description: 'Email subject',
              minLength: 1,
              maxLength: 200,
            },
            body: {
              type: 'string',
              description: 'Email body content',
              minLength: 1,
            },
            cc: {
              type: 'array',
              description: 'CC recipients',
              items: {
                type: 'string',
                format: 'email',
              },
            },
          },
          required: ['to', 'subject', 'body'],
        },
      };

      expect(ToolDefinitionHelpers.isValid(definition)).toBe(true);
    });
  });
});
