import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryToolRegistry } from '../InMemoryToolRegistry.js';
import { AgentTool, type ToolDefinition } from '@stratix/core';

// Mock tools for testing
class SearchTool extends AgentTool<{ query: string }, { results: string[] }> {
  readonly name = 'search';
  readonly description = 'Search for documents';
  readonly requiresApproval = false;

  async execute(input: { query: string }): Promise<{ results: string[] }> {
    return { results: [`Result for: ${input.query}`] };
  }

  async validate(input: unknown): Promise<{ query: string }> {
    if (
      typeof input !== 'object' ||
      !input ||
      !('query' in input) ||
      typeof (input as { query: unknown }).query !== 'string'
    ) {
      throw new Error('Invalid input');
    }
    return input as { query: string };
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
    };
  }
}

class CalculatorTool extends AgentTool<
  { a: number; b: number; op: string },
  { result: number }
> {
  readonly name = 'calculator';
  readonly description = 'Perform mathematical operations';
  readonly requiresApproval = false;

  async execute(input: {
    a: number;
    b: number;
    op: string;
  }): Promise<{ result: number }> {
    const { a, b, op } = input;
    let result: number;
    switch (op) {
      case '+':
        result = a + b;
        break;
      case '-':
        result = a - b;
        break;
      case '*':
        result = a * b;
        break;
      case '/':
        result = a / b;
        break;
      default:
        throw new Error('Invalid operation');
    }
    return { result };
  }

  async validate(input: unknown): Promise<{
    a: number;
    b: number;
    op: string;
  }> {
    if (
      typeof input !== 'object' ||
      !input ||
      !('a' in input) ||
      !('b' in input) ||
      !('op' in input)
    ) {
      throw new Error('Invalid input');
    }
    return input as { a: number; b: number; op: string };
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          a: { type: 'number' },
          b: { type: 'number' },
          op: { type: 'string', enum: ['+', '-', '*', '/'] },
        },
        required: ['a', 'b', 'op'],
      },
    };
  }
}

class ApprovalRequiredTool extends AgentTool<
  { action: string },
  { success: boolean }
> {
  readonly name = 'delete_user';
  readonly description = 'Delete a user account';
  readonly requiresApproval = true;

  async execute(input: { action: string }): Promise<{ success: boolean }> {
    return { success: true };
  }

  async validate(input: unknown): Promise<{ action: string }> {
    if (typeof input !== 'object' || !input || !('action' in input)) {
      throw new Error('Invalid input');
    }
    return input as { action: string };
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string' },
        },
        required: ['action'],
      },
    };
  }
}

describe('InMemoryToolRegistry', () => {
  let registry: InMemoryToolRegistry;
  let searchTool: SearchTool;
  let calculatorTool: CalculatorTool;
  let approvalTool: ApprovalRequiredTool;

  beforeEach(() => {
    registry = new InMemoryToolRegistry();
    searchTool = new SearchTool();
    calculatorTool = new CalculatorTool();
    approvalTool = new ApprovalRequiredTool();
  });

  describe('register', () => {
    it('should register a tool successfully', async () => {
      await registry.register(searchTool);

      const count = await registry.count();
      expect(count).toBe(1);

      const tool = await registry.get('search');
      expect(tool).toBe(searchTool);
    });

    it('should register a tool with metadata', async () => {
      await registry.register(searchTool, {
        category: 'knowledge',
        tags: ['search', 'docs'],
        version: '2.0.0',
      });

      const metadata = await registry.getMetadata('search');
      expect(metadata).toEqual({
        name: 'search',
        description: 'Search for documents',
        requiresApproval: false,
        category: 'knowledge',
        tags: ['search', 'docs'],
        version: '2.0.0',
      });
    });

    it('should throw error when registering duplicate tool', async () => {
      await registry.register(searchTool);

      await expect(registry.register(searchTool)).rejects.toThrow(
        "Tool 'search' is already registered"
      );
    });

    it('should use default version when not provided', async () => {
      await registry.register(searchTool);

      const metadata = await registry.getMetadata('search');
      expect(metadata?.version).toBe('1.0.0');
    });
  });

  describe('unregister', () => {
    it('should unregister an existing tool', async () => {
      await registry.register(searchTool);
      const removed = await registry.unregister('search');

      expect(removed).toBe(true);
      const count = await registry.count();
      expect(count).toBe(0);
    });

    it('should return false when unregistering non-existent tool', async () => {
      const removed = await registry.unregister('nonexistent');
      expect(removed).toBe(false);
    });
  });

  describe('get and has', () => {
    it('should get registered tool', async () => {
      await registry.register(searchTool);
      const tool = await registry.get('search');
      expect(tool).toBe(searchTool);
    });

    it('should return null for non-existent tool', async () => {
      const tool = await registry.get('nonexistent');
      expect(tool).toBeNull();
    });

    it('should check if tool exists', async () => {
      await registry.register(searchTool);

      const exists = await registry.has('search');
      expect(exists).toBe(true);

      const notExists = await registry.has('nonexistent');
      expect(notExists).toBe(false);
    });
  });

  describe('listAll', () => {
    it('should list all registered tools', async () => {
      await registry.register(searchTool);
      await registry.register(calculatorTool);

      const tools = await registry.listAll();
      expect(tools).toHaveLength(2);
      expect(tools).toContain(searchTool);
      expect(tools).toContain(calculatorTool);
    });

    it('should return empty array when no tools registered', async () => {
      const tools = await registry.listAll();
      expect(tools).toEqual([]);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await registry.register(searchTool, {
        category: 'knowledge',
        tags: ['search', 'docs'],
      });
      await registry.register(calculatorTool, {
        category: 'math',
        tags: ['calculator', 'compute'],
      });
      await registry.register(approvalTool, {
        category: 'admin',
        tags: ['delete', 'user'],
      });
    });

    it('should search by query matching name', async () => {
      const results = await registry.search({ query: 'search' });

      expect(results).toHaveLength(1);
      expect(results[0].tool).toBe(searchTool);
      expect(results[0].score).toBeGreaterThan(1);
    });

    it('should search by query matching description', async () => {
      const results = await registry.search({ query: 'mathematical' });

      expect(results).toHaveLength(1);
      expect(results[0].tool).toBe(calculatorTool);
    });

    it('should search by query matching tags', async () => {
      const results = await registry.search({ query: 'docs' });

      expect(results).toHaveLength(1);
      expect(results[0].tool).toBe(searchTool);
    });

    it('should filter by category', async () => {
      const results = await registry.search({ category: 'math' });

      expect(results).toHaveLength(1);
      expect(results[0].tool).toBe(calculatorTool);
    });

    it('should filter by tags', async () => {
      const results = await registry.search({ tags: ['search', 'docs'] });

      expect(results).toHaveLength(1);
      expect(results[0].tool).toBe(searchTool);
    });

    it('should filter by requiresApproval', async () => {
      const results = await registry.search({ requiresApproval: true });

      expect(results).toHaveLength(1);
      expect(results[0].tool).toBe(approvalTool);
    });

    it('should limit results', async () => {
      const results = await registry.search({ limit: 2 });

      expect(results).toHaveLength(2);
    });

    it('should sort by score descending', async () => {
      const results = await registry.search({ query: 'user' });

      // Should match both 'delete_user' (name) and 'user' (tag)
      expect(results.length).toBeGreaterThan(0);

      // Verify scores are in descending order
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
    });

    it('should return all tools when no filters', async () => {
      const results = await registry.search({});

      expect(results).toHaveLength(3);
    });
  });

  describe('getDefinitions', () => {
    beforeEach(async () => {
      await registry.register(searchTool);
      await registry.register(calculatorTool);
    });

    it('should get all definitions', async () => {
      const definitions = await registry.getDefinitions();

      expect(definitions).toHaveLength(2);
      expect(definitions.map((d) => d.name)).toContain('search');
      expect(definitions.map((d) => d.name)).toContain('calculator');
    });

    it('should get definitions for specific tools', async () => {
      const definitions = await registry.getDefinitions(['search']);

      expect(definitions).toHaveLength(1);
      expect(definitions[0].name).toBe('search');
    });

    it('should ignore non-existent tool names', async () => {
      const definitions = await registry.getDefinitions([
        'search',
        'nonexistent',
      ]);

      expect(definitions).toHaveLength(1);
      expect(definitions[0].name).toBe('search');
    });
  });

  describe('listCategories and listTags', () => {
    beforeEach(async () => {
      await registry.register(searchTool, {
        category: 'knowledge',
        tags: ['search', 'docs'],
      });
      await registry.register(calculatorTool, {
        category: 'math',
        tags: ['calculator', 'compute'],
      });
    });

    it('should list all categories', async () => {
      const categories = await registry.listCategories();

      expect(categories).toEqual(['knowledge', 'math']);
    });

    it('should list all tags', async () => {
      const tags = await registry.listTags();

      expect(tags).toEqual(['calculator', 'compute', 'docs', 'search']);
    });
  });

  describe('getByCategory and getByTag', () => {
    beforeEach(async () => {
      await registry.register(searchTool, {
        category: 'knowledge',
        tags: ['search', 'docs'],
      });
      await registry.register(calculatorTool, {
        category: 'math',
        tags: ['calculator', 'compute'],
      });
    });

    it('should get tools by category', async () => {
      const tools = await registry.getByCategory('knowledge');

      expect(tools).toHaveLength(1);
      expect(tools[0]).toBe(searchTool);
    });

    it('should get tools by tag', async () => {
      const tools = await registry.getByTag('search');

      expect(tools).toHaveLength(1);
      expect(tools[0]).toBe(searchTool);
    });

    it('should return empty array for non-existent category', async () => {
      const tools = await registry.getByCategory('nonexistent');
      expect(tools).toEqual([]);
    });

    it('should return empty array for non-existent tag', async () => {
      const tools = await registry.getByTag('nonexistent');
      expect(tools).toEqual([]);
    });
  });

  describe('clear and count', () => {
    beforeEach(async () => {
      await registry.register(searchTool);
      await registry.register(calculatorTool);
    });

    it('should count registered tools', async () => {
      const count = await registry.count();
      expect(count).toBe(2);
    });

    it('should clear all tools', async () => {
      await registry.clear();

      const count = await registry.count();
      expect(count).toBe(0);

      const tools = await registry.listAll();
      expect(tools).toEqual([]);
    });
  });
});
