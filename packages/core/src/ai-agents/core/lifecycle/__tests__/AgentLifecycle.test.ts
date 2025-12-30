import { describe, it, expect, vi } from 'vitest';
import {
  type AgentLifecycle,
  NoOpLifecycle,
  LoggingLifecycle,
  CompositeLifecycle,
} from '../AgentLifecycle.js';
import { ExecutionContext } from '../../execution/ExecutionContext.js';
import { ExecutionResult } from '../../execution/ExecutionResult.js';
import { AgentId } from '../../agent/AgentId.js';
import { AgentMetadata } from '../../agent/AgentMetadata.js';
import { AIAgent } from '../../agent/AIAgent.js';
import { ExecutionMetadataHelpers } from '../../../shared/ExecutionMetadata.js';
import { ModelConfigHelpers } from '../../agent/ModelConfig.js';

// Test agent implementation
class TestAgent extends AIAgent<string, string> {
  constructor() {
    const id = AgentId.create();
    const metadata = AgentMetadata.create({
      name: 'Test Agent',
      description: 'Test agent for lifecycle tests',
      version: '1.0.0',
      capabilities: ['test'],
    });
    const modelConfig = ModelConfigHelpers.create('test', 'test-model');

    super(id, metadata, modelConfig);
  }

  async execute(
    input: string,
    context: ExecutionContext
  ): Promise<ExecutionResult<string>> {
    return ExecutionResult.success(
      `Processed: ${input}`,
      ExecutionMetadataHelpers.create('test-model')
    );
  }
}

describe('NoOpLifecycle', () => {
  it('should have all hooks defined', () => {
    expect(NoOpLifecycle.beforeExecute).toBeDefined();
    expect(NoOpLifecycle.afterExecute).toBeDefined();
    expect(NoOpLifecycle.onError).toBeDefined();
  });

  it('should do nothing on beforeExecute', async () => {
    const agent = new TestAgent();
    const context = ExecutionContext.create({
      sessionId: 'test',
      environment: 'development',
    });

    await expect(
      NoOpLifecycle.beforeExecute!(agent, 'test input', context)
    ).resolves.toBeUndefined();
  });

  it('should do nothing on afterExecute', async () => {
    const agent = new TestAgent();
    const context = ExecutionContext.create({
      sessionId: 'test',
      environment: 'development',
    });
    const result = ExecutionResult.success(
      'output',
      ExecutionMetadataHelpers.create('test')
    );

    await expect(
      NoOpLifecycle.afterExecute!(agent, result, context)
    ).resolves.toBeUndefined();
  });

  it('should do nothing on onError', async () => {
    const agent = new TestAgent();
    const context = ExecutionContext.create({
      sessionId: 'test',
      environment: 'development',
    });
    const error = new Error('Test error');

    await expect(
      NoOpLifecycle.onError!(agent, error, context)
    ).resolves.toBeUndefined();
  });
});

describe('LoggingLifecycle', () => {
  it('should log on beforeExecute', async () => {
    const mockLogger = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    } as any;

    const lifecycle = new LoggingLifecycle(mockLogger);
    const agent = new TestAgent();
    const context = ExecutionContext.create({
      sessionId: 'test-session',
      environment: 'development',
    });

    await lifecycle.beforeExecute!(agent, 'test input', context);

    expect(mockLogger.log).toHaveBeenCalledWith(
      '[Lifecycle] Before execute: Test Agent',
      {
        agentId: agent.id.value,
        sessionId: 'test-session',
        input: 'test input',
      }
    );
  });

  it('should log on afterExecute for success', async () => {
    const mockLogger = {
      log: vi.fn(),
      error: vi.fn(),
    } as any;

    const lifecycle = new LoggingLifecycle(mockLogger);
    const agent = new TestAgent();
    const context = ExecutionContext.create({
      sessionId: 'test-session',
      environment: 'development',
    });
    const result = ExecutionResult.success(
      'output',
      ExecutionMetadataHelpers.create('test')
    );

    await lifecycle.afterExecute!(agent, result, context);

    expect(mockLogger.log).toHaveBeenCalledWith(
      '[Lifecycle] After execute: Test Agent',
      {
        agentId: agent.id.value,
        sessionId: 'test-session',
        success: true,
        warnings: [],
      }
    );
  });

  it('should log on afterExecute with warnings', async () => {
    const mockLogger = {
      log: vi.fn(),
      error: vi.fn(),
    } as any;

    const lifecycle = new LoggingLifecycle(mockLogger);
    const agent = new TestAgent();
    const context = ExecutionContext.create({
      sessionId: 'test-session',
      environment: 'development',
    });
    const result = ExecutionResult.success(
      'output',
      ExecutionMetadataHelpers.create('test'),
      ['Warning 1', 'Warning 2']
    );

    await lifecycle.afterExecute!(agent, result, context);

    const call = mockLogger.log.mock.calls[0];
    expect(call[1].warnings).toEqual(['Warning 1', 'Warning 2']);
  });

  it('should log errors on onError', async () => {
    const mockLogger = {
      log: vi.fn(),
      error: vi.fn(),
    } as any;

    const lifecycle = new LoggingLifecycle(mockLogger);
    const agent = new TestAgent();
    const context = ExecutionContext.create({
      sessionId: 'test-session',
      environment: 'development',
    });
    const error = new Error('Test error');
    error.stack = 'Error stack trace';

    await lifecycle.onError!(agent, error, context);

    expect(mockLogger.error).toHaveBeenCalledWith(
      '[Lifecycle] Error in: Test Agent',
      {
        agentId: agent.id.value,
        sessionId: 'test-session',
        error: 'Test error',
        stack: 'Error stack trace',
      }
    );
  });

  it('should use console by default', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const lifecycle = new LoggingLifecycle();
    const agent = new TestAgent();
    const context = ExecutionContext.create({
      sessionId: 'test',
      environment: 'development',
    });

    await lifecycle.beforeExecute!(agent, 'test', context);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('CompositeLifecycle', () => {
  it('should execute all lifecycles in order for beforeExecute', async () => {
    const order: number[] = [];

    const lifecycle1: AgentLifecycle = {
      async beforeExecute() {
        order.push(1);
      },
    };

    const lifecycle2: AgentLifecycle = {
      async beforeExecute() {
        order.push(2);
      },
    };

    const lifecycle3: AgentLifecycle = {
      async beforeExecute() {
        order.push(3);
      },
    };

    const composite = new CompositeLifecycle([lifecycle1, lifecycle2, lifecycle3]);
    const agent = new TestAgent();
    const context = ExecutionContext.create({
      sessionId: 'test',
      environment: 'development',
    });

    await composite.beforeExecute!(agent, 'test', context);

    expect(order).toEqual([1, 2, 3]);
  });

  it('should execute all lifecycles for afterExecute', async () => {
    const calls: string[] = [];

    const lifecycle1: AgentLifecycle = {
      async afterExecute() {
        calls.push('lifecycle1');
      },
    };

    const lifecycle2: AgentLifecycle = {
      async afterExecute() {
        calls.push('lifecycle2');
      },
    };

    const composite = new CompositeLifecycle([lifecycle1, lifecycle2]);
    const agent = new TestAgent();
    const context = ExecutionContext.create({
      sessionId: 'test',
      environment: 'development',
    });
    const result = ExecutionResult.success(
      'output',
      ExecutionMetadataHelpers.create('test')
    );

    await composite.afterExecute!(agent, result, context);

    expect(calls).toEqual(['lifecycle1', 'lifecycle2']);
  });

  it('should continue on afterExecute even if one fails', async () => {
    const calls: string[] = [];
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const lifecycle1: AgentLifecycle = {
      async afterExecute() {
        calls.push('lifecycle1');
        throw new Error('Lifecycle 1 failed');
      },
    };

    const lifecycle2: AgentLifecycle = {
      async afterExecute() {
        calls.push('lifecycle2');
      },
    };

    const composite = new CompositeLifecycle([lifecycle1, lifecycle2]);
    const agent = new TestAgent();
    const context = ExecutionContext.create({
      sessionId: 'test',
      environment: 'development',
    });
    const result = ExecutionResult.success(
      'output',
      ExecutionMetadataHelpers.create('test')
    );

    await composite.afterExecute!(agent, result, context);

    expect(calls).toEqual(['lifecycle1', 'lifecycle2']);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should execute all lifecycles for onError', async () => {
    const calls: string[] = [];

    const lifecycle1: AgentLifecycle = {
      async onError() {
        calls.push('lifecycle1');
      },
    };

    const lifecycle2: AgentLifecycle = {
      async onError() {
        calls.push('lifecycle2');
      },
    };

    const composite = new CompositeLifecycle([lifecycle1, lifecycle2]);
    const agent = new TestAgent();
    const context = ExecutionContext.create({
      sessionId: 'test',
      environment: 'development',
    });
    const error = new Error('Test error');

    await composite.onError!(agent, error, context);

    expect(calls).toEqual(['lifecycle1', 'lifecycle2']);
  });

  it('should continue on onError even if one fails', async () => {
    const calls: string[] = [];
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const lifecycle1: AgentLifecycle = {
      async onError() {
        calls.push('lifecycle1');
        throw new Error('Error handler failed');
      },
    };

    const lifecycle2: AgentLifecycle = {
      async onError() {
        calls.push('lifecycle2');
      },
    };

    const composite = new CompositeLifecycle([lifecycle1, lifecycle2]);
    const agent = new TestAgent();
    const context = ExecutionContext.create({
      sessionId: 'test',
      environment: 'development',
    });
    const error = new Error('Original error');

    await composite.onError!(agent, error, context);

    expect(calls).toEqual(['lifecycle1', 'lifecycle2']);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should skip lifecycles without hooks', async () => {
    const calls: string[] = [];

    const lifecycle1: AgentLifecycle = {
      async beforeExecute() {
        calls.push('lifecycle1');
      },
    };

    const lifecycle2: AgentLifecycle = {
      // No beforeExecute hook
    };

    const lifecycle3: AgentLifecycle = {
      async beforeExecute() {
        calls.push('lifecycle3');
      },
    };

    const composite = new CompositeLifecycle([lifecycle1, lifecycle2, lifecycle3]);
    const agent = new TestAgent();
    const context = ExecutionContext.create({
      sessionId: 'test',
      environment: 'development',
    });

    await composite.beforeExecute!(agent, 'test', context);

    expect(calls).toEqual(['lifecycle1', 'lifecycle3']);
  });

  it('should work with empty lifecycle array', async () => {
    const composite = new CompositeLifecycle([]);
    const agent = new TestAgent();
    const context = ExecutionContext.create({
      sessionId: 'test',
      environment: 'development',
    });

    await expect(
      composite.beforeExecute!(agent, 'test', context)
    ).resolves.toBeUndefined();
  });

  it('should combine logging and custom lifecycles', async () => {
    const mockLogger = {
      log: vi.fn(),
      error: vi.fn(),
    } as any;

    const customCalls: string[] = [];
    const customLifecycle: AgentLifecycle = {
      async beforeExecute() {
        customCalls.push('custom');
      },
    };

    const composite = new CompositeLifecycle([
      new LoggingLifecycle(mockLogger),
      customLifecycle,
    ]);

    const agent = new TestAgent();
    const context = ExecutionContext.create({
      sessionId: 'test',
      environment: 'development',
    });

    await composite.beforeExecute!(agent, 'test', context);

    expect(mockLogger.log).toHaveBeenCalled();
    expect(customCalls).toEqual(['custom']);
  });
});

describe('Custom lifecycle implementation', () => {
  it('should support custom lifecycle with all hooks', async () => {
    const calls: string[] = [];

    const customLifecycle: AgentLifecycle = {
      async beforeExecute(agent, input, context) {
        calls.push(`before:${agent.name}:${input}:${context.sessionId}`);
      },
      async afterExecute(agent, result, context) {
        calls.push(
          `after:${agent.name}:${result.isSuccess()}:${context.sessionId}`
        );
      },
      async onError(agent, error, context) {
        calls.push(`error:${agent.name}:${error.message}:${context.sessionId}`);
      },
    };

    const agent = new TestAgent();
    const context = ExecutionContext.create({
      sessionId: 'custom-session',
      environment: 'development',
    });
    const result = ExecutionResult.success(
      'output',
      ExecutionMetadataHelpers.create('test')
    );
    const error = new Error('Custom error');

    await customLifecycle.beforeExecute!(agent, 'custom-input', context);
    await customLifecycle.afterExecute!(agent, result, context);
    await customLifecycle.onError!(agent, error, context);

    expect(calls).toEqual([
      'before:Test Agent:custom-input:custom-session',
      'after:Test Agent:true:custom-session',
      'error:Test Agent:Custom error:custom-session',
    ]);
  });

  it('should support lifecycle with only some hooks', async () => {
    const calls: string[] = [];

    const partialLifecycle: AgentLifecycle = {
      async beforeExecute() {
        calls.push('before');
      },
      async afterExecute() {
        calls.push('after');
      },
      // No onError hook
    };

    const agent = new TestAgent();
    const context = ExecutionContext.create({
      sessionId: 'test',
      environment: 'development',
    });
    const result = ExecutionResult.success(
      'output',
      ExecutionMetadataHelpers.create('test')
    );

    await partialLifecycle.beforeExecute!(agent, 'test', context);
    await partialLifecycle.afterExecute!(agent, result, context);

    expect(calls).toEqual(['before', 'after']);
    expect(partialLifecycle.onError).toBeUndefined();
  });
});
