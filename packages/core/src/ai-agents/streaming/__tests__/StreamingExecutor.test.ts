import { describe, it, expect, beforeEach } from 'vitest';
import { AIAgent } from '../../core/agent/AIAgent.js';
import { AgentId } from '../../core/agent/AgentId.js';
import { ExecutionResult } from '../../core/execution/ExecutionResult.js';
import type { ExecutionContext } from '../../core/execution/ExecutionContext.js';
import type { AgentMetadata } from '../../core/agent/AgentMetadata.js';
import type { ModelConfig } from '../../core/agent/ModelConfig.js';
import {
  StreamingExecutor,
  StreamingExecutorHelpers,
} from '../StreamingExecutor.js';
import { isStreamable, type Streamable } from '../Streamable.js';
import { StreamChunkHelpers, type StreamChunk } from '../StreamChunk.js';

// Test agent without streaming support
class SimpleAgent extends AIAgent<string, string> {
  constructor() {
    const id = AgentId.create();
    const metadata: AgentMetadata = {
      name: 'SimpleAgent',
      description: 'A simple test agent',
      version: { major: 1, minor: 0, patch: 0 },
      capabilities: [],
    };
    const modelConfig: ModelConfig = {
      provider: 'test',
      model: 'test-model',
      parameters: {},
    };
    super(id, metadata, modelConfig);
  }

  async execute(
    input: string,
    _context: ExecutionContext
  ): Promise<ExecutionResult<string>> {
    return ExecutionResult.success(`Response: ${input}`, {
      model: 'test-model',
    });
  }
}

// Test agent with streaming support
class StreamingAgent
  extends AIAgent<string, string>
  implements Streamable<string>
{
  constructor() {
    const id = AgentId.create();
    const metadata: AgentMetadata = {
      name: 'StreamingAgent',
      description: 'A streaming test agent',
      version: { major: 1, minor: 0, patch: 0 },
      capabilities: [],
    };
    const modelConfig: ModelConfig = {
      provider: 'test',
      model: 'test-model',
      parameters: {},
    };
    super(id, metadata, modelConfig);
  }

  async execute(
    input: string,
    _context: ExecutionContext
  ): Promise<ExecutionResult<string>> {
    return ExecutionResult.success(`Response: ${input}`, {
      model: 'test-model',
    });
  }

  async *stream(): AsyncIterable<StreamChunk<string>> {
    yield StreamChunkHelpers.partial('Hello');
    yield StreamChunkHelpers.partial(' ');
    yield StreamChunkHelpers.partial('World');
    yield StreamChunkHelpers.final('!');
  }
}

describe('isStreamable', () => {
  it('should identify streamable objects', () => {
    const streamingAgent = new StreamingAgent();

    expect(isStreamable(streamingAgent)).toBe(true);
  });

  it('should identify non-streamable objects', () => {
    const simpleAgent = new SimpleAgent();

    expect(isStreamable(simpleAgent)).toBe(false);
  });

  it('should handle null and undefined', () => {
    expect(isStreamable(null)).toBe(false);
    expect(isStreamable(undefined)).toBe(false);
  });

  it('should handle non-objects', () => {
    expect(isStreamable(42)).toBe(false);
    expect(isStreamable('string')).toBe(false);
    expect(isStreamable(true)).toBe(false);
  });
});

describe('StreamingExecutor', () => {
  let executor: StreamingExecutor;
  let context: ExecutionContext;

  beforeEach(() => {
    executor = new StreamingExecutor();
    context = {
      sessionId: 'test-session',
      userId: 'test-user',
      conversationId: 'test-conversation',
      messages: [],
      metadata: {},
    };
  });

  describe('supportsStreaming', () => {
    it('should detect streaming support', () => {
      const streamingAgent = new StreamingAgent();
      const simpleAgent = new SimpleAgent();

      expect(executor.supportsStreaming(streamingAgent)).toBe(true);
      expect(executor.supportsStreaming(simpleAgent)).toBe(false);
    });
  });

  describe('executeStream with streaming agent', () => {
    it('should stream chunks from streamable agent', async () => {
      const agent = new StreamingAgent();

      const chunks = await StreamChunkHelpers.collect(
        executor.executeStream(agent, 'test input', context)
      );

      expect(chunks.length).toBe(4);
      expect(chunks[0].data).toBe('Hello');
      expect(chunks[1].data).toBe(' ');
      expect(chunks[2].data).toBe('World');
      expect(chunks[3].data).toBe('!');
      expect(chunks[3].done).toBe(true);
    });

    it('should preserve chunk metadata', async () => {
      class MetadataStreamingAgent
        extends AIAgent<string, string>
        implements Streamable<string>
      {
        constructor() {
          const id = AgentId.create();
          const metadata: AgentMetadata = {
            name: 'MetadataAgent',
            description: 'Test',
            version: { major: 1, minor: 0, patch: 0 },
            capabilities: [],
          };
          const modelConfig: ModelConfig = {
            provider: 'test',
            model: 'test-model',
            parameters: {},
          };
          super(id, metadata, modelConfig);
        }

        async execute(): Promise<ExecutionResult<string>> {
          return ExecutionResult.success('test');
        }

        async *stream(): AsyncIterable<StreamChunk<string>> {
          yield StreamChunkHelpers.partial('test', { index: 0 });
          yield StreamChunkHelpers.final('done', { index: 1 });
        }
      }

      const agent = new MetadataStreamingAgent();
      const chunks = await StreamChunkHelpers.collect(
        executor.executeStream(agent, 'input', context)
      );

      expect(chunks[0].metadata?.index).toBe(0);
      expect(chunks[1].metadata?.index).toBe(1);
    });
  });

  describe('executeStream with non-streaming agent', () => {
    it('should fall back to single chunk', async () => {
      const agent = new SimpleAgent();

      const chunks = await StreamChunkHelpers.collect(
        executor.executeStream(agent, 'test input', context)
      );

      expect(chunks.length).toBe(1);
      expect(chunks[0].data).toBe('Response: test input');
      expect(chunks[0].done).toBe(true);
      expect(chunks[0].metadata?.fallback).toBe(true);
    });
  });

  describe('collectStats', () => {
    it('should collect stream statistics', async () => {
      async function* testStream() {
        yield StreamChunkHelpers.partial('a');
        yield StreamChunkHelpers.partial('b');
        yield StreamChunkHelpers.partial('c');
        yield StreamChunkHelpers.final('d');
      }

      const { stats, chunks } = await executor.collectStats(testStream());

      expect(stats.totalChunks).toBe(4);
      expect(stats.duration).toBeGreaterThanOrEqual(0);
      expect(chunks.length).toBe(4);
    });

    it('should handle empty stream', async () => {
      async function* emptyStream(): AsyncIterable<StreamChunk<string>> {
        // Empty
      }

      const { stats, chunks } = await executor.collectStats(emptyStream());

      expect(stats.totalChunks).toBe(0);
      expect(stats.averageChunkTime).toBe(0);
      expect(chunks.length).toBe(0);
    });
  });

  describe('buffered streaming', () => {
    it('should buffer chunks', async () => {
      const bufferedExecutor = new StreamingExecutor({
        buffered: true,
        bufferSize: 2,
      });

      const agent = new StreamingAgent();

      const chunks = await StreamChunkHelpers.collect(
        bufferedExecutor.executeStream(agent, 'input', context)
      );

      // All chunks should still be present
      expect(chunks.length).toBe(4);
    });
  });
});

describe('StreamingExecutorHelpers', () => {
  describe('merge', () => {
    it('should merge multiple streams', async () => {
      async function* stream1() {
        yield StreamChunkHelpers.partial('a');
        yield StreamChunkHelpers.partial('b');
      }

      async function* stream2() {
        yield StreamChunkHelpers.partial('c');
        yield StreamChunkHelpers.final('d');
      }

      const merged = StreamingExecutorHelpers.merge([stream1(), stream2()]);
      const chunks = await StreamChunkHelpers.collect(merged);

      expect(chunks.length).toBe(4);
    });
  });

  describe('take', () => {
    it('should take first N chunks', async () => {
      async function* testStream() {
        yield StreamChunkHelpers.partial('a');
        yield StreamChunkHelpers.partial('b');
        yield StreamChunkHelpers.partial('c');
        yield StreamChunkHelpers.final('d');
      }

      const limited = StreamingExecutorHelpers.take(testStream(), 2);
      const chunks = await StreamChunkHelpers.collect(limited);

      expect(chunks.length).toBe(2);
      expect(chunks[0].data).toBe('a');
      expect(chunks[1].data).toBe('b');
    });
  });

  describe('skip', () => {
    it('should skip first N chunks', async () => {
      async function* testStream() {
        yield StreamChunkHelpers.partial('a');
        yield StreamChunkHelpers.partial('b');
        yield StreamChunkHelpers.partial('c');
        yield StreamChunkHelpers.final('d');
      }

      const skipped = StreamingExecutorHelpers.skip(testStream(), 2);
      const chunks = await StreamChunkHelpers.collect(skipped);

      expect(chunks.length).toBe(2);
      expect(chunks[0].data).toBe('c');
      expect(chunks[1].data).toBe('d');
    });
  });
});
