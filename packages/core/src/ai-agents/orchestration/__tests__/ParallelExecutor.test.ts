import { describe, it, expect } from 'vitest';
import { ParallelExecutor, DynamicParallelExecutor } from '../ParallelExecutor.js';
import { AIAgent } from '../../core/agent/AIAgent.js';
import { AgentId } from '../../core/agent/AgentId.js';
import { AgentMetadata } from '../../core/agent/AgentMetadata.js';
import { ModelConfigHelpers } from '../../core/agent/ModelConfig.js';
import { ExecutionContext } from '../../core/execution/ExecutionContext.js';
import { ExecutionResult } from '../../core/execution/ExecutionResult.js';
import { ExecutionMetadataHelpers } from '../../shared/ExecutionMetadata.js';

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

// Test agent with delay
class DelayAgent extends AIAgent<string, string> {
  constructor(private delayMs: number) {
    super(
      AgentId.create(),
      AgentMetadata.create({
        name: `Delay ${delayMs}ms`,
        description: 'Delays execution',
        version: '1.0.0',
        capabilities: ['test'],
      }),
      ModelConfigHelpers.create('test', 'test')
    );
  }

  async execute(input: string): Promise<ExecutionResult<string>> {
    await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    return ExecutionResult.success(
      input,
      ExecutionMetadataHelpers.create('test')
    );
  }
}

// Test agent that fails
class FailingAgent<T, R> extends AIAgent<T, R> {
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

  async execute(): Promise<ExecutionResult<R>> {
    return ExecutionResult.failure(
      new Error('Agent failed'),
      ExecutionMetadataHelpers.create('test')
    );
  }
}

describe('ParallelExecutor', () => {
  let context: ExecutionContext;

  beforeEach(() => {
    context = ExecutionContext.create({
      sessionId: 'test',
      environment: 'development',
    });
  });

  describe('parallel2', () => {
    it('should execute two agents in parallel', async () => {
      const agent1 = new CharCountAgent();
      const agent2 = new UppercaseAgent();

      const [result1, result2] = await ParallelExecutor.parallel2(
        { agent: agent1, input: 'hello' },
        { agent: agent2, input: 'world' },
        context
      );

      expect(result1.isSuccess()).toBe(true);
      expect(result1.value).toBe(5);
      expect(result2.isSuccess()).toBe(true);
      expect(result2.value).toBe('WORLD');
    });

    it('should handle failure in first agent', async () => {
      const agent1 = new FailingAgent<string, number>();
      const agent2 = new UppercaseAgent();

      const [result1, result2] = await ParallelExecutor.parallel2(
        { agent: agent1, input: 'input' },
        { agent: agent2, input: 'world' },
        context
      );

      expect(result1.isFailure()).toBe(true);
      expect(result2.isSuccess()).toBe(true);
    });

    it('should handle failure in second agent', async () => {
      const agent1 = new CharCountAgent();
      const agent2 = new FailingAgent<string, string>();

      const [result1, result2] = await ParallelExecutor.parallel2(
        { agent: agent1, input: 'hello' },
        { agent: agent2, input: 'input' },
        context
      );

      expect(result1.isSuccess()).toBe(true);
      expect(result2.isFailure()).toBe(true);
    });
  });

  describe('parallel3', () => {
    it('should execute three agents in parallel', async () => {
      const agent1 = new CharCountAgent();
      const agent2 = new RepeatAgent();
      const agent3 = new UppercaseAgent();

      const [result1, result2, result3] = await ParallelExecutor.parallel3(
        { agent: agent1, input: 'test' },
        { agent: agent2, input: 3 },
        { agent: agent3, input: 'hello' },
        context
      );

      expect(result1.value).toBe(4);
      expect(result2.value).toBe('xxx');
      expect(result3.value).toBe('HELLO');
    });
  });

  describe('parallel4-parallel10', () => {
    it('should execute four agents in parallel', async () => {
      const results = await ParallelExecutor.parallel4(
        { agent: new CharCountAgent(), input: 'a' },
        { agent: new CharCountAgent(), input: 'ab' },
        { agent: new CharCountAgent(), input: 'abc' },
        { agent: new CharCountAgent(), input: 'abcd' },
        context
      );

      expect(results.length).toBe(4);
      expect(results[0].value).toBe(1);
      expect(results[1].value).toBe(2);
      expect(results[2].value).toBe(3);
      expect(results[3].value).toBe(4);
    });

    it('should execute five agents in parallel', async () => {
      const results = await ParallelExecutor.parallel5(
        { agent: new CharCountAgent(), input: 'a' },
        { agent: new CharCountAgent(), input: 'ab' },
        { agent: new CharCountAgent(), input: 'abc' },
        { agent: new CharCountAgent(), input: 'abcd' },
        { agent: new CharCountAgent(), input: 'abcde' },
        context
      );

      expect(results.length).toBe(5);
      expect(results[4].value).toBe(5);
    });

    it('should execute six agents in parallel', async () => {
      const results = await ParallelExecutor.parallel6(
        { agent: new CharCountAgent(), input: '1' },
        { agent: new CharCountAgent(), input: '12' },
        { agent: new CharCountAgent(), input: '123' },
        { agent: new CharCountAgent(), input: '1234' },
        { agent: new CharCountAgent(), input: '12345' },
        { agent: new CharCountAgent(), input: '123456' },
        context
      );

      expect(results.length).toBe(6);
      expect(results[5].value).toBe(6);
    });

    it('should execute seven agents in parallel', async () => {
      const results = await ParallelExecutor.parallel7(
        { agent: new UppercaseAgent(), input: 'a' },
        { agent: new UppercaseAgent(), input: 'b' },
        { agent: new UppercaseAgent(), input: 'c' },
        { agent: new UppercaseAgent(), input: 'd' },
        { agent: new UppercaseAgent(), input: 'e' },
        { agent: new UppercaseAgent(), input: 'f' },
        { agent: new UppercaseAgent(), input: 'g' },
        context
      );

      expect(results.length).toBe(7);
    });

    it('should execute eight agents in parallel', async () => {
      const results = await ParallelExecutor.parallel8(
        { agent: new UppercaseAgent(), input: 'a' },
        { agent: new UppercaseAgent(), input: 'b' },
        { agent: new UppercaseAgent(), input: 'c' },
        { agent: new UppercaseAgent(), input: 'd' },
        { agent: new UppercaseAgent(), input: 'e' },
        { agent: new UppercaseAgent(), input: 'f' },
        { agent: new UppercaseAgent(), input: 'g' },
        { agent: new UppercaseAgent(), input: 'h' },
        context
      );

      expect(results.length).toBe(8);
    });

    it('should execute nine agents in parallel', async () => {
      const results = await ParallelExecutor.parallel9(
        { agent: new UppercaseAgent(), input: 'a' },
        { agent: new UppercaseAgent(), input: 'b' },
        { agent: new UppercaseAgent(), input: 'c' },
        { agent: new UppercaseAgent(), input: 'd' },
        { agent: new UppercaseAgent(), input: 'e' },
        { agent: new UppercaseAgent(), input: 'f' },
        { agent: new UppercaseAgent(), input: 'g' },
        { agent: new UppercaseAgent(), input: 'h' },
        { agent: new UppercaseAgent(), input: 'i' },
        context
      );

      expect(results.length).toBe(9);
    });

    it('should execute ten agents in parallel', async () => {
      const results = await ParallelExecutor.parallel10(
        { agent: new UppercaseAgent(), input: 'a' },
        { agent: new UppercaseAgent(), input: 'b' },
        { agent: new UppercaseAgent(), input: 'c' },
        { agent: new UppercaseAgent(), input: 'd' },
        { agent: new UppercaseAgent(), input: 'e' },
        { agent: new UppercaseAgent(), input: 'f' },
        { agent: new UppercaseAgent(), input: 'g' },
        { agent: new UppercaseAgent(), input: 'h' },
        { agent: new UppercaseAgent(), input: 'i' },
        { agent: new UppercaseAgent(), input: 'j' },
        context
      );

      expect(results.length).toBe(10);
    });
  });

  describe('performance', () => {
    it('should execute agents truly in parallel', async () => {
      const startTime = Date.now();

      await ParallelExecutor.parallel3(
        { agent: new DelayAgent(100), input: 'a' },
        { agent: new DelayAgent(100), input: 'b' },
        { agent: new DelayAgent(100), input: 'c' },
        context
      );

      const duration = Date.now() - startTime;

      // Should take ~100ms (parallel), not ~300ms (sequential)
      // Allow some margin for test environment
      expect(duration).toBeLessThan(250);
    });
  });

  describe('mixed types', () => {
    it('should support agents with different input/output types', async () => {
      const [result1, result2, result3] = await ParallelExecutor.parallel3(
        { agent: new CharCountAgent(), input: 'hello' }, // string → number
        { agent: new RepeatAgent(), input: 3 }, // number → string
        { agent: new UppercaseAgent(), input: 'world' }, // string → string
        context
      );

      expect(result1.value).toBe(5); // number
      expect(result2.value).toBe('xxx'); // string
      expect(result3.value).toBe('WORLD'); // string
    });
  });
});

describe('DynamicParallelExecutor', () => {
  let context: ExecutionContext;

  beforeEach(() => {
    context = ExecutionContext.create({
      sessionId: 'test',
      environment: 'development',
    });
  });

  describe('construction', () => {
    it('should create empty executor', () => {
      const executor = new DynamicParallelExecutor<string, string>();

      expect(executor.length).toBe(0);
    });
  });

  describe('add', () => {
    it('should add task', () => {
      const executor = new DynamicParallelExecutor<string, string>();
      const agent = new UppercaseAgent();

      executor.add(agent, 'input');

      expect(executor.length).toBe(1);
    });

    it('should support method chaining', () => {
      const executor = new DynamicParallelExecutor<string, string>();
      const agent = new UppercaseAgent();

      const result = executor
        .add(agent, 'input1')
        .add(agent, 'input2')
        .add(agent, 'input3');

      expect(result).toBe(executor);
      expect(executor.length).toBe(3);
    });
  });

  describe('execute', () => {
    it('should return empty array for empty executor', async () => {
      const executor = new DynamicParallelExecutor<string, string>();

      const results = await executor.execute(context);

      expect(results).toEqual([]);
    });

    it('should execute single task', async () => {
      const executor = new DynamicParallelExecutor<string, string>();
      const agent = new UppercaseAgent();

      executor.add(agent, 'hello');

      const results = await executor.execute(context);

      expect(results.length).toBe(1);
      expect(results[0].value).toBe('HELLO');
    });

    it('should execute multiple tasks in parallel', async () => {
      const executor = new DynamicParallelExecutor<string, string>();
      const agent = new UppercaseAgent();

      executor
        .add(agent, 'hello')
        .add(agent, 'world')
        .add(agent, 'test');

      const results = await executor.execute(context);

      expect(results.length).toBe(3);
      expect(results[0].value).toBe('HELLO');
      expect(results[1].value).toBe('WORLD');
      expect(results[2].value).toBe('TEST');
    });

    it('should execute truly in parallel', async () => {
      const executor = new DynamicParallelExecutor<string, string>();
      const agent = new DelayAgent(100);

      executor
        .add(agent, 'a')
        .add(agent, 'b')
        .add(agent, 'c');

      const startTime = Date.now();
      await executor.execute(context);
      const duration = Date.now() - startTime;

      // Should take ~100ms (parallel), not ~300ms (sequential)
      expect(duration).toBeLessThan(250);
    });

    it('should preserve order of results', async () => {
      const executor = new DynamicParallelExecutor<string, string>();
      const agent1 = new DelayAgent(100);
      const agent2 = new DelayAgent(50);
      const agent3 = new DelayAgent(150);

      // Add in order: slow, fast, slowest
      executor
        .add(agent1, 'first')
        .add(agent2, 'second')
        .add(agent3, 'third');

      const results = await executor.execute(context);

      // Results should be in same order as added, not completion order
      expect(results[0].value).toBe('first');
      expect(results[1].value).toBe('second');
      expect(results[2].value).toBe('third');
    });

    it('should handle mixed success and failure', async () => {
      const executor = new DynamicParallelExecutor<string, string>();

      executor
        .add(new UppercaseAgent(), 'hello')
        .add(new FailingAgent<string, string>(), 'fail')
        .add(new UppercaseAgent(), 'world');

      const results = await executor.execute(context);

      expect(results[0].isSuccess()).toBe(true);
      expect(results[1].isFailure()).toBe(true);
      expect(results[2].isSuccess()).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all tasks', () => {
      const executor = new DynamicParallelExecutor<string, string>();
      const agent = new UppercaseAgent();

      executor.add(agent, 'input1').add(agent, 'input2');

      executor.clear();

      expect(executor.length).toBe(0);
    });

    it('should support method chaining', () => {
      const executor = new DynamicParallelExecutor<string, string>();
      const agent = new UppercaseAgent();

      const result = executor.add(agent, 'input').clear();

      expect(result).toBe(executor);
    });
  });
});
