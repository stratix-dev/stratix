import { describe, it, expect } from 'vitest';
import {
  ToolRegistry,
  ToolNotFoundError,
  ToolConflictError,
} from '../ToolRegistry.js';
import { Tool, type ToolResult, type ToolContext } from '../Tool.js';

// Simple test tool
class TestTool extends Tool<{ value: string }, string> {
  constructor(private id: string = 'test') {
    super();
  }

  get name(): string {
    return this.id;
  }

  get description(): string {
    return `Test tool ${this.id}`;
  }

  get parameters() {
    return {
      type: 'object' as const,
      properties: {
        value: { type: 'string' },
      },
      required: ['value'] as const,
    };
  }

  async execute(params: { value: string }): Promise<ToolResult<string>> {
    return this.success(params.value);
  }
}

describe('ToolRegistry', () => {
  const context: ToolContext = { sessionId: 'test' };

  describe('register', () => {
    it('should register a tool', () => {
      const registry = new ToolRegistry();
      const tool = new TestTool('tool1');

      registry.register(tool);

      expect(registry.has('tool1')).toBe(true);
      expect(registry.size).toBe(1);
    });

    it('should throw on duplicate registration', () => {
      const registry = new ToolRegistry();
      const tool = new TestTool('tool1');

      registry.register(tool);

      expect(() => registry.register(tool)).toThrow(ToolConflictError);
    });

    it('should support method chaining', () => {
      const registry = new ToolRegistry();

      const result = registry.register(new TestTool('tool1'));

      expect(result).toBe(registry);
    });
  });

  describe('registerAll', () => {
    it('should register multiple tools', () => {
      const registry = new ToolRegistry();
      const tools = [new TestTool('tool1'), new TestTool('tool2')];

      registry.registerAll(tools);

      expect(registry.size).toBe(2);
      expect(registry.has('tool1')).toBe(true);
      expect(registry.has('tool2')).toBe(true);
    });
  });

  describe('registerOrReplace', () => {
    it('should replace existing tool', () => {
      const registry = new ToolRegistry();
      const tool1 = new TestTool('tool1');
      const tool2 = new TestTool('tool1'); // Same name

      registry.register(tool1);
      registry.registerOrReplace(tool2);

      expect(registry.size).toBe(1);
      expect(registry.get('tool1')).toBe(tool2);
    });
  });

  describe('unregister', () => {
    it('should remove a tool', () => {
      const registry = new ToolRegistry();
      registry.register(new TestTool('tool1'));

      const removed = registry.unregister('tool1');

      expect(removed).toBe(true);
      expect(registry.has('tool1')).toBe(false);
    });

    it('should return false for non-existent tool', () => {
      const registry = new ToolRegistry();

      const removed = registry.unregister('nonexistent');

      expect(removed).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all tools', () => {
      const registry = new ToolRegistry();
      registry.register(new TestTool('tool1'));
      registry.register(new TestTool('tool2'));

      registry.clear();

      expect(registry.size).toBe(0);
      expect(registry.isEmpty).toBe(true);
    });
  });

  describe('get', () => {
    it('should retrieve a tool', () => {
      const registry = new ToolRegistry();
      const tool = new TestTool('tool1');
      registry.register(tool);

      const retrieved = registry.get('tool1');

      expect(retrieved).toBe(tool);
    });

    it('should throw for non-existent tool', () => {
      const registry = new ToolRegistry();

      expect(() => registry.get('nonexistent')).toThrow(ToolNotFoundError);
    });
  });

  describe('tryGet', () => {
    it('should return tool if exists', () => {
      const registry = new ToolRegistry();
      const tool = new TestTool('tool1');
      registry.register(tool);

      const retrieved = registry.tryGet('tool1');

      expect(retrieved).toBe(tool);
    });

    it('should return undefined if not found', () => {
      const registry = new ToolRegistry();

      const retrieved = registry.tryGet('nonexistent');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all tools', () => {
      const registry = new ToolRegistry();
      const tool1 = new TestTool('tool1');
      const tool2 = new TestTool('tool2');
      registry.register(tool1);
      registry.register(tool2);

      const all = registry.getAll();

      expect(all.length).toBe(2);
      expect(all).toContain(tool1);
      expect(all).toContain(tool2);
    });
  });

  describe('getNames', () => {
    it('should return all tool names', () => {
      const registry = new ToolRegistry();
      registry.register(new TestTool('tool1'));
      registry.register(new TestTool('tool2'));

      const names = registry.getNames();

      expect(names).toEqual(['tool1', 'tool2']);
    });
  });

  describe('getDefinitions', () => {
    it('should return all tool definitions', () => {
      const registry = new ToolRegistry();
      registry.register(new TestTool('tool1'));
      registry.register(new TestTool('tool2'));

      const definitions = registry.getDefinitions();

      expect(definitions.length).toBe(2);
      expect(definitions[0].name).toBe('tool1');
      expect(definitions[1].name).toBe('tool2');
    });
  });

  describe('execute', () => {
    it('should execute a tool', async () => {
      const registry = new ToolRegistry();
      registry.register(new TestTool('tool1'));

      const result = await registry.execute('tool1', { value: 'test' }, context);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test');
      }
    });

    it('should throw for non-existent tool', async () => {
      const registry = new ToolRegistry();

      await expect(
        registry.execute('nonexistent', {}, context)
      ).rejects.toThrow(ToolNotFoundError);
    });
  });

  describe('executeMany', () => {
    it('should execute multiple tools', async () => {
      const registry = new ToolRegistry();
      registry.register(new TestTool('tool1'));
      registry.register(new TestTool('tool2'));

      const results = await registry.executeMany(
        [
          { name: 'tool1', params: { value: 'a' } },
          { name: 'tool2', params: { value: 'b' } },
        ],
        context
      );

      expect(results.length).toBe(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });
  });

  describe('find', () => {
    it('should find tools matching predicate', () => {
      const registry = new ToolRegistry();
      registry.register(new TestTool('tool1'));
      registry.register(new TestTool('tool2'));

      const found = registry.find((tool) => tool.name === 'tool1');

      expect(found.length).toBe(1);
      expect(found[0].name).toBe('tool1');
    });
  });

  describe('clone', () => {
    it('should create independent copy', () => {
      const registry = new ToolRegistry();
      registry.register(new TestTool('tool1'));

      const cloned = registry.clone();
      cloned.register(new TestTool('tool2'));

      expect(registry.size).toBe(1);
      expect(cloned.size).toBe(2);
    });
  });

  describe('merge', () => {
    it('should merge registries', () => {
      const registry1 = new ToolRegistry();
      registry1.register(new TestTool('tool1'));

      const registry2 = new ToolRegistry();
      registry2.register(new TestTool('tool2'));

      registry1.merge(registry2);

      expect(registry1.size).toBe(2);
      expect(registry1.has('tool2')).toBe(true);
    });
  });
});
