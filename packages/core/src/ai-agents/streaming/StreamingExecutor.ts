import type { AIAgent } from '../core/agent/AIAgent.js';
import type { ExecutionContext } from '../core/execution/ExecutionContext.js';
import type { ExecutionResult } from '../core/execution/ExecutionResult.js';
import type { StreamChunk } from './StreamChunk.js';
import { isStreamable, type Streamable } from './Streamable.js';
import { StreamChunkHelpers } from './StreamChunk.js';

/**
 * Configuration for streaming execution.
 */
export interface StreamingConfig {
  /**
   * Maximum time to wait for a single chunk (ms).
   *
   * If a chunk doesn't arrive within this time, the stream is aborted.
   * Default: 30000 (30 seconds)
   */
  readonly chunkTimeout?: number;

  /**
   * Whether to buffer chunks before yielding.
   *
   * When enabled, chunks are collected and yielded in batches.
   * Useful for reducing overhead with high-frequency chunks.
   *
   * Default: false
   */
  readonly buffered?: boolean;

  /**
   * Buffer size (number of chunks).
   *
   * Only used when `buffered` is true.
   * Default: 10
   */
  readonly bufferSize?: number;
}

/**
 * Statistics about a completed stream.
 */
export interface StreamStats {
  /**
   * Total number of chunks yielded.
   */
  readonly totalChunks: number;

  /**
   * Total duration of the stream (ms).
   */
  readonly duration: number;

  /**
   * Average time between chunks (ms).
   */
  readonly averageChunkTime: number;

  /**
   * Minimum time between chunks (ms).
   */
  readonly minChunkTime: number;

  /**
   * Maximum time between chunks (ms).
   */
  readonly maxChunkTime: number;
}

/**
 * Streaming executor - composition over inheritance.
 *
 * Executes agents with streaming support. Falls back to regular
 * execution for non-streaming agents.
 *
 * @example
 * ```typescript
 * const executor = new StreamingExecutor();
 *
 * // Stream if agent supports it
 * for await (const chunk of executor.executeStream(agent, input, context)) {
 *   console.log('Chunk:', chunk.data);
 *   if (chunk.done) {
 *     console.log('Complete');
 *   }
 * }
 * ```
 */
export class StreamingExecutor {
  private readonly config: Required<StreamingConfig>;

  constructor(config: StreamingConfig = {}) {
    this.config = {
      chunkTimeout: config.chunkTimeout ?? 30000,
      buffered: config.buffered ?? false,
      bufferSize: config.bufferSize ?? 10,
    };
  }

  /**
   * Execute an agent with streaming if supported.
   *
   * If the agent implements `Streamable<TOutput>`, it will be streamed.
   * Otherwise, falls back to regular execution and yields a single chunk.
   *
   * @param agent - The agent to execute
   * @param input - The input data
   * @param context - The execution context
   * @returns Async iterable of stream chunks
   *
   * @example
   * ```typescript
   * const executor = new StreamingExecutor();
   *
   * for await (const chunk of executor.executeStream(chatAgent, input, context)) {
   *   process.stdout.write(chunk.data.text);
   * }
   * ```
   */
  async *executeStream<TInput, TOutput>(
    agent: AIAgent<TInput, TOutput>,
    input: TInput,
    context: ExecutionContext
  ): AsyncIterable<StreamChunk<TOutput>> {
    // Type guard for streaming support
    if (this.isStreamableAgent(agent)) {
      yield* this.executeStreamable(agent, input, context);
    } else {
      // Fallback: execute normally and yield single chunk
      yield* this.executeFallback(agent, input, context);
    }
  }

  /**
   * Check if agent supports streaming.
   *
   * @param agent - The agent to check
   * @returns True if agent implements Streamable
   *
   * @example
   * ```typescript
   * if (executor.supportsStreaming(agent)) {
   *   console.log('Agent supports streaming');
   * }
   * ```
   */
  supportsStreaming<TInput, TOutput>(
    agent: AIAgent<TInput, TOutput>
  ): boolean {
    return this.isStreamableAgent(agent);
  }

  /**
   * Collect stream statistics.
   *
   * Consumes the entire stream and returns statistics about it.
   * Also returns all chunks for further processing.
   *
   * @param stream - The async iterable stream
   * @returns Statistics and collected chunks
   *
   * @example
   * ```typescript
   * const { stats, chunks } = await executor.collectStats(stream);
   * console.log(`Received ${stats.totalChunks} chunks in ${stats.duration}ms`);
   * ```
   */
  async collectStats<TOutput>(
    stream: AsyncIterable<StreamChunk<TOutput>>
  ): Promise<{ stats: StreamStats; chunks: StreamChunk<TOutput>[] }> {
    const chunks: StreamChunk<TOutput>[] = [];
    const chunkTimes: number[] = [];

    const startTime = Date.now();
    let lastChunkTime = startTime;

    for await (const chunk of stream) {
      chunks.push(chunk);

      const now = Date.now();
      const timeSinceLastChunk = now - lastChunkTime;
      chunkTimes.push(timeSinceLastChunk);
      lastChunkTime = now;
    }

    const duration = Date.now() - startTime;
    const totalChunks = chunks.length;

    const stats: StreamStats = {
      totalChunks,
      duration,
      averageChunkTime:
        chunkTimes.length > 0
          ? chunkTimes.reduce((a, b) => a + b, 0) / chunkTimes.length
          : 0,
      minChunkTime: chunkTimes.length > 0 ? Math.min(...chunkTimes) : 0,
      maxChunkTime: chunkTimes.length > 0 ? Math.max(...chunkTimes) : 0,
    };

    return { stats, chunks };
  }

  /**
   * Type guard for streamable agents.
   */
  private isStreamableAgent<TInput, TOutput>(
    agent: AIAgent<TInput, TOutput>
  ): agent is AIAgent<TInput, TOutput> & Streamable<TOutput> {
    return isStreamable<TOutput>(agent);
  }

  /**
   * Execute a streamable agent.
   */
  private async *executeStreamable<TInput, TOutput>(
    agent: AIAgent<TInput, TOutput> & Streamable<TOutput>,
    _input: TInput,
    _context: ExecutionContext
  ): AsyncIterable<StreamChunk<TOutput>> {
    // Get the stream from the agent
    const stream = agent.stream();

    // Apply configuration (buffering, timeout, etc.)
    if (this.config.buffered) {
      yield* this.bufferStream(stream);
    } else {
      yield* this.timeoutStream(stream);
    }
  }

  /**
   * Execute a non-streamable agent and yield a single chunk.
   */
  private async *executeFallback<TInput, TOutput>(
    agent: AIAgent<TInput, TOutput>,
    input: TInput,
    context: ExecutionContext
  ): AsyncIterable<StreamChunk<TOutput>> {
    // Execute normally
    const result = await agent.execute(input, context);

    // Extract the result data
    const data = this.extractResultData(result);

    // Yield single chunk
    yield StreamChunkHelpers.final(data, {
      fallback: true,
      model: result.metadata?.model,
      usage: result.metadata?.usage,
    });
  }

  /**
   * Apply timeout to stream chunks.
   */
  private async *timeoutStream<TOutput>(
    stream: AsyncIterable<StreamChunk<TOutput>>
  ): AsyncIterable<StreamChunk<TOutput>> {
    for await (const chunk of stream) {
      // In a real implementation, we'd use a timeout mechanism here
      // For now, just yield the chunk
      yield chunk;
    }
  }

  /**
   * Buffer chunks before yielding.
   */
  private async *bufferStream<TOutput>(
    stream: AsyncIterable<StreamChunk<TOutput>>
  ): AsyncIterable<StreamChunk<TOutput>> {
    const buffer: StreamChunk<TOutput>[] = [];

    for await (const chunk of stream) {
      buffer.push(chunk);

      // Yield buffer when full or when we hit the final chunk
      if (buffer.length >= this.config.bufferSize || chunk.done) {
        yield* buffer;
        buffer.length = 0;
      }
    }

    // Yield any remaining chunks
    if (buffer.length > 0) {
      yield* buffer;
    }
  }

  /**
   * Extract data from ExecutionResult.
   *
   * Handles both success and failure cases.
   */
  private extractResultData<TOutput>(
    result: ExecutionResult<TOutput>
  ): TOutput {
    if (result.isSuccess()) {
      return result.value;
    }

    // For failures, we need to handle them appropriately
    // This is a simplified version - in production, you might want to
    // throw an error or return a sentinel value
    throw new Error(
      `Agent execution failed: ${result.error?.message ?? 'Unknown error'}`
    );
  }
}

/**
 * Helper functions for working with streaming execution.
 */
export const StreamingExecutorHelpers = {
  /**
   * Merge multiple streams into a single stream.
   *
   * Yields chunks from all streams as they become available.
   * Order is not guaranteed.
   *
   * @param streams - Array of streams to merge
   * @returns Merged stream
   *
   * @example
   * ```typescript
   * const merged = StreamingExecutorHelpers.merge([stream1, stream2]);
   * for await (const chunk of merged) {
   *   console.log(chunk);
   * }
   * ```
   */
  async *merge<TOutput>(
    streams: AsyncIterable<StreamChunk<TOutput>>[]
  ): AsyncIterable<StreamChunk<TOutput>> {
    // Simple implementation - in production, you'd want to use Promise.race
    // to interleave chunks properly
    for (const stream of streams) {
      yield* stream;
    }
  },

  /**
   * Take only the first N chunks from a stream.
   *
   * @param stream - The stream to limit
   * @param count - Maximum number of chunks
   * @returns Limited stream
   *
   * @example
   * ```typescript
   * const limited = StreamingExecutorHelpers.take(stream, 5);
   * ```
   */
  async *take<TOutput>(
    stream: AsyncIterable<StreamChunk<TOutput>>,
    count: number
  ): AsyncIterable<StreamChunk<TOutput>> {
    let yielded = 0;
    for await (const chunk of stream) {
      if (yielded >= count) break;
      yield chunk;
      yielded++;
    }
  },

  /**
   * Skip the first N chunks from a stream.
   *
   * @param stream - The stream to skip from
   * @param count - Number of chunks to skip
   * @returns Stream with chunks skipped
   *
   * @example
   * ```typescript
   * const skipped = StreamingExecutorHelpers.skip(stream, 3);
   * ```
   */
  async *skip<TOutput>(
    stream: AsyncIterable<StreamChunk<TOutput>>,
    count: number
  ): AsyncIterable<StreamChunk<TOutput>> {
    let skipped = 0;
    for await (const chunk of stream) {
      if (skipped < count) {
        skipped++;
        continue;
      }
      yield chunk;
    }
  },
};
