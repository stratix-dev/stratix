import { describe, it, expect } from 'vitest';
import { Tool, ToolHelpers, type ToolResult, type ToolContext } from '../Tool.js';

// Test tool implementation
class CalculatorTool extends Tool<{ a: number; b: number }, number> {
  get name(): string {
    return 'calculator';
  }

  get description(): string {
    return 'Performs basic arithmetic';
  }

  get parameters() {
    return {
      type: 'object' as const,
      properties: {
        a: { type: 'number', description: 'First number' },
        b: { type: 'number', description: 'Second number' }
      },
      required: ['a', 'b'] as const
    };
  }

  async execute(params: { a: number; b: number }): Promise<ToolResult<number>> {
    return this.success(params.a + params.b);
  }
}

// Tool with strict validation
class StrictTool extends Tool {
  get name(): string {
    return 'strict_tool';
  }

  get description(): string {
    return 'Tool with strict validation';
  }

  get parameters() {
    return {
      type: 'object' as const,
      properties: {
        value: { type: 'string' }
      },
      required: ['value'] as const,
      additionalProperties: false
    };
  }

  get strict(): boolean {
    return true;
  }

  async execute(params: any): Promise<ToolResult> {
    return this.success(params.value);
  }
}

// Tool that throws errors
class ErrorTool extends Tool {
  get name(): string {
    return 'error_tool';
  }

  get description(): string {
    return 'Always fails';
  }

  get parameters() {
    return {
      type: 'object' as const,
      properties: {}
    };
  }

  async execute(): Promise<ToolResult> {
    throw new Error('Tool error');
  }
}

describe('Tool', () => {
  const context: ToolContext = {
    sessionId: 'test-session'
  };

  describe('basic properties', () => {
    it('should expose name', () => {
      const tool = new CalculatorTool();

      expect(tool.name).toBe('calculator');
    });

    it('should expose description', () => {
      const tool = new CalculatorTool();

      expect(tool.description).toBe('Performs basic arithmetic');
    });

    it('should expose parameters', () => {
      const tool = new CalculatorTool();

      expect(tool.parameters.type).toBe('object');
      expect(tool.parameters.properties).toHaveProperty('a');
      expect(tool.parameters.properties).toHaveProperty('b');
    });

    it('should have strict=false by default', () => {
      const tool = new CalculatorTool();

      expect(tool.strict).toBe(false);
    });

    it('should support strict=true', () => {
      const tool = new StrictTool();

      expect(tool.strict).toBe(true);
    });
  });

  describe('getDefinition', () => {
    it('should return tool definition', () => {
      const tool = new CalculatorTool();

      const definition = tool.getDefinition();

      expect(definition.name).toBe('calculator');
      expect(definition.description).toBe('Performs basic arithmetic');
      expect(definition.parameters).toEqual(tool.parameters);
      expect(definition.strict).toBe(false);
    });
  });

  describe('validate', () => {
    it('should accept valid parameters', () => {
      const tool = new CalculatorTool();
      const params = { a: 1, b: 2 };

      const errors = tool.validate(params);

      expect(errors).toEqual([]);
    });

    it('should reject non-object parameters', () => {
      const tool = new CalculatorTool();

      const errors = tool.validate('not an object');

      expect(errors).toContain('Parameters must be an object');
    });

    it('should reject null parameters', () => {
      const tool = new CalculatorTool();

      const errors = tool.validate(null);

      expect(errors).toContain('Parameters must be an object');
    });

    it('should detect missing required fields', () => {
      const tool = new CalculatorTool();
      const params = { a: 1 }; // Missing 'b'

      const errors = tool.validate(params);

      expect(errors).toContain('Required parameter missing: b');
    });

    it('should reject unknown fields when additionalProperties=false', () => {
      const tool = new StrictTool();
      const params = { value: 'test', extra: 'field' };

      const errors = tool.validate(params);

      expect(errors).toContain('Unknown parameter: extra');
    });
  });

  describe('isValid', () => {
    it('should return true for valid params', () => {
      const tool = new CalculatorTool();

      expect(tool.isValid({ a: 1, b: 2 })).toBe(true);
    });

    it('should return false for invalid params', () => {
      const tool = new CalculatorTool();

      expect(tool.isValid({ a: 1 })).toBe(false);
    });
  });

  describe('execute', () => {
    it('should execute successfully', async () => {
      const tool = new CalculatorTool();
      const params = { a: 5, b: 3 };

      const result = await tool.execute(params, context);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(8);
      }
    });
  });

  describe('executeValidated', () => {
    it('should execute with valid params', async () => {
      const tool = new CalculatorTool();
      const params = { a: 10, b: 20 };

      const result = await tool.executeValidated(params, context);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(30);
      }
    });

    it('should return error for invalid params', async () => {
      const tool = new CalculatorTool();
      const params = { a: 1 }; // Missing 'b'

      const result = await tool.executeValidated(params, context);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Validation failed');
        expect(result.error).toContain('Required parameter missing: b');
      }
    });

    it('should catch execution errors', async () => {
      const tool = new ErrorTool();

      const result = await tool.executeValidated({}, context);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Tool error');
      }
    });
  });

  describe('helper methods', () => {
    it('should create success result', () => {
      const tool = new CalculatorTool();

      const result = (tool as any).success(42);

      expect(result).toEqual({ success: true, data: 42 });
    });

    it('should create error result', () => {
      const tool = new CalculatorTool();

      const result = (tool as any).error('Something went wrong');

      expect(result).toEqual({ success: false, error: 'Something went wrong' });
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const tool = new CalculatorTool();

      expect(tool.toString()).toBe('Tool(calculator)');
    });
  });

  describe('toJSON', () => {
    it('should return JSON representation', () => {
      const tool = new CalculatorTool();

      const json = tool.toJSON();

      expect(json).toEqual({
        name: 'calculator',
        description: 'Performs basic arithmetic',
        parameters: tool.parameters,
        strict: false
      });
    });
  });
});

describe('ToolHelpers', () => {
  describe('fromPromise', () => {
    it('should wrap successful promise', async () => {
      const result = await ToolHelpers.fromPromise(Promise.resolve(42));

      expect(result).toEqual({ success: true, data: 42 });
    });

    it('should catch promise rejection', async () => {
      const result = await ToolHelpers.fromPromise(Promise.reject(new Error('Failed')));

      expect(result).toEqual({ success: false, error: 'Failed' });
    });
  });

  describe('combine', () => {
    it('should combine successful results', () => {
      const result1: ToolResult<number> = { success: true, data: 1 };
      const result2: ToolResult<string> = { success: true, data: 'hello' };

      const combined = ToolHelpers.combine(result1, result2);

      expect(combined.success).toBe(true);
      if (combined.success) {
        expect(combined.data).toEqual([1, 'hello']);
      }
    });

    it('should fail if any result fails', () => {
      const result1: ToolResult<number> = { success: true, data: 1 };
      const result2: ToolResult<string> = { success: false, error: 'Error 2' };
      const result3: ToolResult<boolean> = { success: false, error: 'Error 3' };

      const combined = ToolHelpers.combine(result1, result2, result3);

      expect(combined.success).toBe(false);
      if (!combined.success) {
        expect(combined.error).toBe('Error 2; Error 3');
      }
    });
  });

  describe('map', () => {
    it('should transform successful result', () => {
      const result: ToolResult<number> = { success: true, data: 5 };

      const mapped = ToolHelpers.map(result, (n) => n * 2);

      expect(mapped).toEqual({ success: true, data: 10 });
    });

    it('should pass through error', () => {
      const result: ToolResult<number> = { success: false, error: 'Failed' };

      const mapped = ToolHelpers.map(result, (n) => n * 2);

      expect(mapped).toEqual({ success: false, error: 'Failed' });
    });
  });

  describe('flatMap', () => {
    it('should chain successful results', () => {
      const result: ToolResult<number> = { success: true, data: 5 };

      const chained = ToolHelpers.flatMap(result, (n) => ({
        success: true,
        data: n * 2
      }));

      expect(chained).toEqual({ success: true, data: 10 });
    });

    it('should pass through error', () => {
      const result: ToolResult<number> = { success: false, error: 'Failed' };

      const chained = ToolHelpers.flatMap(result, (n) => ({
        success: true,
        data: n * 2
      }));

      expect(chained).toEqual({ success: false, error: 'Failed' });
    });
  });

  describe('orDefault', () => {
    it('should return data for success', () => {
      const result: ToolResult<number> = { success: true, data: 42 };

      const value = ToolHelpers.orDefault(result, 0);

      expect(value).toBe(42);
    });

    it('should return default for error', () => {
      const result: ToolResult<number> = { success: false, error: 'Failed' };

      const value = ToolHelpers.orDefault(result, 0);

      expect(value).toBe(0);
    });
  });

  describe('unwrap', () => {
    it('should return data for success', () => {
      const result: ToolResult<number> = { success: true, data: 42 };

      const value = ToolHelpers.unwrap(result);

      expect(value).toBe(42);
    });

    it('should throw for error', () => {
      const result: ToolResult<number> = { success: false, error: 'Failed' };

      expect(() => ToolHelpers.unwrap(result)).toThrow('Failed');
    });
  });
});
