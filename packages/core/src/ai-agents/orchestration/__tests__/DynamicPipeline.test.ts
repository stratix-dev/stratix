import { describe, it, expect } from 'vitest';
import { DynamicPipeline } from '../DynamicPipeline.js';
import { AIAgent } from '../../core/agent/AIAgent.js';
import { AgentId } from '../../core/agent/AgentId.js';
import { AgentMetadata } from '../../core/agent/AgentMetadata.js';
import { ModelConfigHelpers } from '../../core/agent/ModelConfig.js';
import { ExecutionContext } from '../../core/execution/ExecutionContext.js';
import { ExecutionResult } from '../../core/execution/ExecutionResult.js';
import { ExecutionMetadataHelpers } from '../../shared/ExecutionMetadata.js';

// Test agent: string → string (uppercase)
class UppercaseAgent extends AIAgent<string, string> {
  constructor(private identifier: string = 'uppercase') {
    super(
      AgentId.create(),
      AgentMetadata.create({
        name: `Uppercase ${identifier}`,
        description: 'Converts to uppercase',
        version: '1.0.0',
        capabilities: ['text'],
      }),
      ModelConfigHelpers.create('test', 'test')
    );
  }

  async execute(input: string): Promise<ExecutionResult<string>> {
    return ExecutionResult.success(
      input.toUpperCase(),
      ExecutionMetadataHelpers.create('test')
    );
  }
}

// Test agent: string → string (append suffix)
class AppendAgent extends AIAgent<string, string> {
  constructor(private suffix: string) {
    super(
      AgentId.create(),
      AgentMetadata.create({
        name: 'Append',
        description: 'Appends suffix',
        version: '1.0.0',
        capabilities: ['text'],
      }),
      ModelConfigHelpers.create('test', 'test')
    );
  }

  async execute(input: string): Promise<ExecutionResult<string>> {
    return ExecutionResult.success(
      input + this.suffix,
      ExecutionMetadataHelpers.create('test')
    );
  }
}

// Test agent that fails
class FailingAgent extends AIAgent<string, string> {
  constructor() {
    super(
      AgentId.create(),
      AgentMetadata.create({
        name: 'Failing',
        description: 'Always fails',
        version: '1.0.0',
        capabilities: ['test'],
      }),
      ModelConfigHelpers.create('test', 'test')
    );
  }

  async execute(): Promise<ExecutionResult<string>> {
    return ExecutionResult.failure(
      new Error('Agent failed'),
      ExecutionMetadataHelpers.create('test')
    );
  }
}

describe('DynamicPipeline', () => {
  let context: ExecutionContext;

  beforeEach(() => {
    context = ExecutionContext.create({
      sessionId: 'test',
      environment: 'development',
    });
  });

  describe('construction', () => {
    it('should create empty pipeline', () => {
      const pipeline = new DynamicPipeline<string>();

      expect(pipeline.length).toBe(0);
      expect(pipeline.isEmpty).toBe(true);
    });

    it('should add agent and increase length', () => {
      const pipeline = new DynamicPipeline<string>();
      const agent = new UppercaseAgent();

      pipeline.add(agent);

      expect(pipeline.length).toBe(1);
      expect(pipeline.isEmpty).toBe(false);
    });
  });

  describe('add', () => {
    it('should add single agent', () => {
      const pipeline = new DynamicPipeline<string>();
      const agent = new UppercaseAgent();

      pipeline.add(agent);

      expect(pipeline.length).toBe(1);
    });

    it('should support method chaining', () => {
      const pipeline = new DynamicPipeline<string>();

      const result = pipeline
        .add(new UppercaseAgent('1'))
        .add(new UppercaseAgent('2'))
        .add(new UppercaseAgent('3'));

      expect(result).toBe(pipeline);
      expect(pipeline.length).toBe(3);
    });
  });

  describe('addAll', () => {
    it('should add multiple agents', () => {
      const pipeline = new DynamicPipeline<string>();
      const agents = [
        new UppercaseAgent('1'),
        new UppercaseAgent('2'),
        new UppercaseAgent('3'),
      ];

      pipeline.addAll(agents);

      expect(pipeline.length).toBe(3);
    });

    it('should support method chaining', () => {
      const pipeline = new DynamicPipeline<string>();
      const agents = [new UppercaseAgent('1'), new UppercaseAgent('2')];

      const result = pipeline.addAll(agents);

      expect(result).toBe(pipeline);
    });
  });

  describe('insertAt', () => {
    it('should insert agent at beginning', () => {
      const pipeline = new DynamicPipeline<string>();
      pipeline.add(new AppendAgent('2'));
      pipeline.add(new AppendAgent('3'));

      pipeline.insertAt(0, new AppendAgent('1'));

      const agents = pipeline.getAgents();
      expect(pipeline.length).toBe(3);
      expect((agents[0] as any)['suffix']).toBe('1');
    });

    it('should insert agent in middle', () => {
      const pipeline = new DynamicPipeline<string>();
      pipeline.add(new AppendAgent('1'));
      pipeline.add(new AppendAgent('3'));

      pipeline.insertAt(1, new AppendAgent('2'));

      const agents = pipeline.getAgents();
      expect(pipeline.length).toBe(3);
      expect((agents[1] as any)['suffix']).toBe('2');
    });

    it('should insert agent at end', () => {
      const pipeline = new DynamicPipeline<string>();
      pipeline.add(new AppendAgent('1'));
      pipeline.add(new AppendAgent('2'));

      pipeline.insertAt(2, new AppendAgent('3'));

      expect(pipeline.length).toBe(3);
    });

    it('should throw on invalid index', () => {
      const pipeline = new DynamicPipeline<string>();

      expect(() => pipeline.insertAt(-1, new UppercaseAgent())).toThrow('Invalid index');
      expect(() => pipeline.insertAt(5, new UppercaseAgent())).toThrow('Invalid index');
    });
  });

  describe('removeAt', () => {
    it('should remove agent at index', () => {
      const pipeline = new DynamicPipeline<string>();
      pipeline.add(new UppercaseAgent('1'));
      pipeline.add(new UppercaseAgent('2'));
      pipeline.add(new UppercaseAgent('3'));

      pipeline.removeAt(1);

      expect(pipeline.length).toBe(2);
    });

    it('should throw on invalid index', () => {
      const pipeline = new DynamicPipeline<string>();
      pipeline.add(new UppercaseAgent());

      expect(() => pipeline.removeAt(-1)).toThrow('Invalid index');
      expect(() => pipeline.removeAt(5)).toThrow('Invalid index');
    });

    it('should support method chaining', () => {
      const pipeline = new DynamicPipeline<string>();
      pipeline.add(new UppercaseAgent('1'));
      pipeline.add(new UppercaseAgent('2'));

      const result = pipeline.removeAt(0);

      expect(result).toBe(pipeline);
    });
  });

  describe('clear', () => {
    it('should remove all agents', () => {
      const pipeline = new DynamicPipeline<string>();
      pipeline.add(new UppercaseAgent('1'));
      pipeline.add(new UppercaseAgent('2'));

      pipeline.clear();

      expect(pipeline.length).toBe(0);
      expect(pipeline.isEmpty).toBe(true);
    });

    it('should support method chaining', () => {
      const pipeline = new DynamicPipeline<string>();
      pipeline.add(new UppercaseAgent());

      const result = pipeline.clear();

      expect(result).toBe(pipeline);
    });
  });

  describe('getAgents', () => {
    it('should return all agents', () => {
      const pipeline = new DynamicPipeline<string>();
      const agent1 = new UppercaseAgent('1');
      const agent2 = new UppercaseAgent('2');

      pipeline.add(agent1).add(agent2);

      const agents = pipeline.getAgents();

      expect(agents.length).toBe(2);
      expect(agents[0]).toBe(agent1);
      expect(agents[1]).toBe(agent2);
    });

    it('should return frozen array', () => {
      const pipeline = new DynamicPipeline<string>();
      pipeline.add(new UppercaseAgent());

      const agents = pipeline.getAgents();

      expect(Object.isFrozen(agents)).toBe(true);
    });
  });

  describe('execute', () => {
    it('should execute empty pipeline', async () => {
      const pipeline = new DynamicPipeline<string>();

      const result = await pipeline.execute('input', context);

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBe('input');
      expect(result.warnings).toContain('Pipeline is empty, returning input unchanged');
    });

    it('should execute single agent', async () => {
      const pipeline = new DynamicPipeline<string>();
      pipeline.add(new UppercaseAgent());

      const result = await pipeline.execute('hello', context);

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBe('HELLO');
    });

    it('should execute multiple agents in sequence', async () => {
      const pipeline = new DynamicPipeline<string>();
      pipeline
        .add(new UppercaseAgent())
        .add(new AppendAgent('!'))
        .add(new AppendAgent('?'));

      const result = await pipeline.execute('hello', context);

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBe('HELLO!?');
    });

    it('should stop on failure', async () => {
      let agent3Executed = false;

      class TrackingAgent extends AIAgent<string, string> {
        constructor() {
          super(
            AgentId.create(),
            AgentMetadata.create({
              name: 'Tracking',
              description: 'Tracks execution',
              version: '1.0.0',
              capabilities: ['test'],
            }),
            ModelConfigHelpers.create('test', 'test')
          );
        }

        async execute(input: string): Promise<ExecutionResult<string>> {
          agent3Executed = true;
          return ExecutionResult.success(input, ExecutionMetadataHelpers.create('test'));
        }
      }

      const pipeline = new DynamicPipeline<string>();
      pipeline
        .add(new UppercaseAgent())
        .add(new FailingAgent()) // Fails
        .add(new TrackingAgent()); // Should not execute

      const result = await pipeline.execute('input', context);

      expect(result.isFailure()).toBe(true);
      expect(agent3Executed).toBe(false);
    });

    it('should include agent name in error message', async () => {
      const pipeline = new DynamicPipeline<string>();
      pipeline
        .add(new UppercaseAgent())
        .add(new FailingAgent());

      const result = await pipeline.execute('input', context);

      expect(result.error?.message).toContain('Pipeline failed at agent 2/2');
      expect(result.error?.message).toContain('Failing');
    });

    it('should accumulate warnings from all agents', async () => {
      class WarningAgent extends AIAgent<string, string> {
        constructor(private warning: string) {
          super(
            AgentId.create(),
            AgentMetadata.create({
              name: 'Warning',
              description: 'Emits warning',
              version: '1.0.0',
              capabilities: ['test'],
            }),
            ModelConfigHelpers.create('test', 'test')
          );
        }

        async execute(input: string): Promise<ExecutionResult<string>> {
          return ExecutionResult.success(
            input,
            ExecutionMetadataHelpers.create('test'),
            [this.warning]
          );
        }
      }

      const pipeline = new DynamicPipeline<string>();
      pipeline
        .add(new WarningAgent('Warning 1'))
        .add(new WarningAgent('Warning 2'))
        .add(new WarningAgent('Warning 3'));

      const result = await pipeline.execute('input', context);

      expect(result.warnings).toEqual(['Warning 1', 'Warning 2', 'Warning 3']);
    });
  });

  describe('executeAndTransform', () => {
    it('should transform successful result', async () => {
      const pipeline = new DynamicPipeline<string>();
      pipeline.add(new UppercaseAgent());

      const result = await pipeline.executeAndTransform(
        'hello',
        context,
        (output) => output.length
      );

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBe(5); // "HELLO".length
    });

    it('should propagate pipeline failure', async () => {
      const pipeline = new DynamicPipeline<string>();
      pipeline.add(new FailingAgent());

      const result = await pipeline.executeAndTransform(
        'input',
        context,
        (output) => output.length
      );

      expect(result.isFailure()).toBe(true);
    });

    it('should handle transform error', async () => {
      const pipeline = new DynamicPipeline<string>();
      pipeline.add(new UppercaseAgent());

      const result = await pipeline.executeAndTransform(
        'input',
        context,
        () => {
          throw new Error('Transform failed');
        }
      );

      expect(result.isFailure()).toBe(true);
      expect(result.error?.message).toBe('Transform failed');
    });

    it('should support async transform', async () => {
      const pipeline = new DynamicPipeline<string>();
      pipeline.add(new UppercaseAgent());

      const result = await pipeline.executeAndTransform(
        'hello',
        context,
        async (output) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return output.length;
        }
      );

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBe(5);
    });
  });

  describe('clone', () => {
    it('should create independent copy', () => {
      const pipeline = new DynamicPipeline<string>();
      pipeline.add(new UppercaseAgent('1'));
      pipeline.add(new UppercaseAgent('2'));

      const cloned = pipeline.clone();
      cloned.add(new UppercaseAgent('3'));

      expect(pipeline.length).toBe(2);
      expect(cloned.length).toBe(3);
    });

    it('should have same agents', () => {
      const pipeline = new DynamicPipeline<string>();
      const agent1 = new UppercaseAgent('1');
      const agent2 = new UppercaseAgent('2');
      pipeline.add(agent1).add(agent2);

      const cloned = pipeline.clone();
      const agents = cloned.getAgents();

      expect(agents[0]).toBe(agent1);
      expect(agents[1]).toBe(agent2);
    });
  });

  describe('concat', () => {
    it('should combine two pipelines', () => {
      const pipeline1 = new DynamicPipeline<string>();
      pipeline1.add(new UppercaseAgent('1'));

      const pipeline2 = new DynamicPipeline<string>();
      pipeline2.add(new UppercaseAgent('2'));

      const combined = pipeline1.concat(pipeline2);

      expect(combined.length).toBe(2);
      expect(pipeline1.length).toBe(1); // Original unchanged
      expect(pipeline2.length).toBe(1); // Original unchanged
    });

    it('should execute combined pipeline', async () => {
      const pipeline1 = new DynamicPipeline<string>();
      pipeline1.add(new UppercaseAgent());

      const pipeline2 = new DynamicPipeline<string>();
      pipeline2.add(new AppendAgent('!'));

      const combined = pipeline1.concat(pipeline2);
      const result = await combined.execute('hello', context);

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBe('HELLO!');
    });
  });
});
