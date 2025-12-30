import { describe, it, expect } from 'vitest';
import { Pipeline, PipelineBuilder } from '../Pipeline.js';
import { AIAgent } from '../../core/agent/AIAgent.js';
import { AgentId } from '../../core/agent/AgentId.js';
import { AgentMetadata } from '../../core/agent/AgentMetadata.js';
import { ModelConfigHelpers } from '../../core/agent/ModelConfig.js';
import { ExecutionContext } from '../../core/execution/ExecutionContext.js';
import { ExecutionResult } from '../../core/execution/ExecutionResult.js';
import { ExecutionMetadataHelpers } from '../../shared/ExecutionMetadata.js';
import { ExecutionEngine } from '../../core/execution/ExecutionEngine.js';
import { NoOpLifecycle, LoggingLifecycle } from '../../core/lifecycle/AgentLifecycle.js';

// Test agent: string → number (counts characters)
class CharCountAgent extends AIAgent<string, number> {
  constructor() {
    super(
      AgentId.create(),
      AgentMetadata.create({
        name: 'Char Counter',
        description: 'Counts characters',
        version: '1.0.0',
        capabilities: ['text'],
      }),
      ModelConfigHelpers.create('test', 'test')
    );
  }

  async execute(input: string): Promise<ExecutionResult<number>> {
    return ExecutionResult.success(
      input.length,
      ExecutionMetadataHelpers.create('test')
    );
  }
}

// Test agent: number → string (creates repeated string)
class RepeatAgent extends AIAgent<number, string> {
  constructor() {
    super(
      AgentId.create(),
      AgentMetadata.create({
        name: 'Repeater',
        description: 'Repeats a string',
        version: '1.0.0',
        capabilities: ['text'],
      }),
      ModelConfigHelpers.create('test', 'test')
    );
  }

  async execute(input: number): Promise<ExecutionResult<string>> {
    return ExecutionResult.success(
      'x'.repeat(input),
      ExecutionMetadataHelpers.create('test')
    );
  }
}

// Test agent: string → string (uppercase)
class UppercaseAgent extends AIAgent<string, string> {
  constructor() {
    super(
      AgentId.create(),
      AgentMetadata.create({
        name: 'Uppercase',
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

describe('Pipeline', () => {
  let context: ExecutionContext;

  beforeEach(() => {
    context = ExecutionContext.create({
      sessionId: 'test',
      environment: 'development',
    });
  });

  describe('pipe2', () => {
    it('should execute two agents in sequence', async () => {
      const agent1 = new CharCountAgent(); // string → number
      const agent2 = new RepeatAgent(); // number → string

      const result = await Pipeline.pipe2(agent1, agent2, 'hello', context);

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBe('xxxxx'); // 5 characters
    });

    it('should propagate failure from first agent', async () => {
      const agent1 = new FailingAgent(); // Fails
      const agent2 = new UppercaseAgent();

      const result = await Pipeline.pipe2(agent1, agent2, 'input', context);

      expect(result.isFailure()).toBe(true);
      expect(result.error?.message).toBe('Agent failed');
    });

    it('should propagate failure from second agent', async () => {
      const agent1 = new UppercaseAgent();
      const agent2 = new FailingAgent(); // Fails

      const result = await Pipeline.pipe2(agent1, agent2, 'input', context);

      expect(result.isFailure()).toBe(true);
      expect(result.error?.message).toBe('Agent failed');
    });
  });

  describe('pipe3', () => {
    it('should execute three agents in sequence', async () => {
      const agent1 = new CharCountAgent(); // string → number
      const agent2 = new RepeatAgent(); // number → string
      const agent3 = new UppercaseAgent(); // string → string

      const result = await Pipeline.pipe3(agent1, agent2, agent3, 'hi', context);

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBe('XX'); // 2 characters, uppercased
    });

    it('should propagate failure from middle agent', async () => {
      const agent1 = new UppercaseAgent();
      const agent2 = new FailingAgent(); // Fails
      const agent3 = new UppercaseAgent();

      const result = await Pipeline.pipe3(agent1, agent2, agent3, 'input', context);

      expect(result.isFailure()).toBe(true);
    });
  });

  describe('pipe4', () => {
    it('should execute four agents in sequence', async () => {
      const agent1 = new UppercaseAgent(); // string → string
      const agent2 = new CharCountAgent(); // string → number
      const agent3 = new RepeatAgent(); // number → string
      const agent4 = new UppercaseAgent(); // string → string

      const result = await Pipeline.pipe4(agent1, agent2, agent3, agent4, 'ab', context);

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBe('XX'); // "ab" → "AB" → 2 → "xx" → "XX"
    });
  });

  describe('pipe5', () => {
    it('should execute five agents in sequence', async () => {
      const agent1 = new UppercaseAgent();
      const agent2 = new CharCountAgent();
      const agent3 = new RepeatAgent();
      const agent4 = new CharCountAgent();
      const agent5 = new RepeatAgent();

      const result = await Pipeline.pipe5(agent1, agent2, agent3, agent4, agent5, 'a', context);

      expect(result.isSuccess()).toBe(true);
      // "a" → "A" → 1 → "x" → 1 → "x"
      expect(result.value).toBe('x');
    });
  });

  describe('pipe6-pipe10', () => {
    it('should execute six agents in sequence', async () => {
      const agents = [
        new UppercaseAgent(),
        new UppercaseAgent(),
        new UppercaseAgent(),
        new CharCountAgent(),
        new RepeatAgent(),
        new UppercaseAgent(),
      ] as const;

      const result = await Pipeline.pipe6(...agents, 'test', context);

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBe('XXXX'); // "test" → 4 chars → "xxxx" → "XXXX"
    });

    it('should execute seven agents in sequence', async () => {
      const agents = [
        new UppercaseAgent(),
        new UppercaseAgent(),
        new UppercaseAgent(),
        new UppercaseAgent(),
        new CharCountAgent(),
        new RepeatAgent(),
        new UppercaseAgent(),
      ] as const;

      const result = await Pipeline.pipe7(...agents, 'ab', context);

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBe('XX');
    });

    it('should execute eight agents in sequence', async () => {
      const agents = [
        new UppercaseAgent(),
        new UppercaseAgent(),
        new UppercaseAgent(),
        new UppercaseAgent(),
        new UppercaseAgent(),
        new CharCountAgent(),
        new RepeatAgent(),
        new UppercaseAgent(),
      ] as const;

      const result = await Pipeline.pipe8(...agents, 'a', context);

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBe('X');
    });

    it('should execute nine agents in sequence', async () => {
      const agents = [
        new UppercaseAgent(),
        new UppercaseAgent(),
        new UppercaseAgent(),
        new UppercaseAgent(),
        new UppercaseAgent(),
        new UppercaseAgent(),
        new CharCountAgent(),
        new RepeatAgent(),
        new UppercaseAgent(),
      ] as const;

      const result = await Pipeline.pipe9(...agents, 'abc', context);

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBe('XXX');
    });

    it('should execute ten agents in sequence', async () => {
      const agents = [
        new UppercaseAgent(),
        new UppercaseAgent(),
        new UppercaseAgent(),
        new UppercaseAgent(),
        new UppercaseAgent(),
        new UppercaseAgent(),
        new UppercaseAgent(),
        new CharCountAgent(),
        new RepeatAgent(),
        new UppercaseAgent(),
      ] as const;

      const result = await Pipeline.pipe10(...agents, 'hello', context);

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBe('XXXXX');
    });
  });

  describe('early termination on failure', () => {
    it('should not execute subsequent agents after failure', async () => {
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

      const agent1 = new UppercaseAgent();
      const agent2 = new FailingAgent(); // Fails
      const agent3 = new TrackingAgent(); // Should not execute

      await Pipeline.pipe3(agent1, agent2, agent3, 'input', context);

      expect(agent3Executed).toBe(false);
    });
  });
});

describe('PipelineBuilder', () => {
  let context: ExecutionContext;

  beforeEach(() => {
    context = ExecutionContext.create({
      sessionId: 'test',
      environment: 'development',
    });
  });

  describe('withEngine', () => {
    it('should use custom execution engine', async () => {
      const engine = new ExecutionEngine(NoOpLifecycle);
      const builder = Pipeline.withEngine(engine);

      const agent1 = new CharCountAgent();
      const agent2 = new RepeatAgent();

      const result = await builder.pipe2(agent1, agent2, 'test', context);

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBe('xxxx');
    });
  });

  describe('withLifecycle', () => {
    it('should use custom lifecycle', async () => {
      const mockLogger = {
        log: vi.fn(),
        error: vi.fn(),
      } as any;

      const lifecycle = new LoggingLifecycle(mockLogger);
      const builder = Pipeline.withLifecycle(lifecycle);

      const agent1 = new CharCountAgent();
      const agent2 = new RepeatAgent();

      await builder.pipe2(agent1, agent2, 'test', context);

      // Lifecycle hooks should be called
      expect(mockLogger.log).toHaveBeenCalled();
    });
  });

  describe('pipe methods', () => {
    it('should execute pipe2 with builder', async () => {
      const builder = Pipeline.withEngine(new ExecutionEngine(NoOpLifecycle));
      const agent1 = new CharCountAgent();
      const agent2 = new RepeatAgent();

      const result = await builder.pipe2(agent1, agent2, 'hello', context);

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBe('xxxxx');
    });

    it('should execute pipe3 with builder', async () => {
      const builder = Pipeline.withEngine(new ExecutionEngine(NoOpLifecycle));
      const agent1 = new CharCountAgent();
      const agent2 = new RepeatAgent();
      const agent3 = new UppercaseAgent();

      const result = await builder.pipe3(agent1, agent2, agent3, 'hi', context);

      expect(result.isSuccess()).toBe(true);
      expect(result.value).toBe('XX');
    });
  });
});
