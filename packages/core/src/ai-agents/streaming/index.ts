/**
 * Streaming support for AI agents.
 *
 * Provides composition-based streaming without inheritance complexity.
 * Agents opt-in to streaming by implementing the Streamable interface.
 *
 * @module streaming
 *
 * @example
 * ```typescript
 * import {
 *   StreamingExecutor,
 *   type Streamable,
 *   type StreamChunk
 * } from '@stratix/core/ai-agents/streaming';
 *
 * // Create a streaming-capable agent
 * class ChatAgent extends AIAgent<Input, Output>
 *   implements Streamable<Output> {
 *
 *   async *stream(): AsyncIterable<StreamChunk<Output>> {
 *     yield { data: { text: 'Hello' }, done: false };
 *     yield { data: { text: ' World!' }, done: true };
 *   }
 * }
 *
 * // Execute with streaming
 * const executor = new StreamingExecutor();
 * for await (const chunk of executor.executeStream(agent, input, context)) {
 *   console.log(chunk.data);
 * }
 * ```
 */

// Stream chunks
export {
  type StreamChunk,
  StreamChunkHelpers,
} from './StreamChunk.js';

// Streaming capability
export {
  type Streamable,
  isStreamable,
} from './Streamable.js';

// Streaming executor
export {
  type StreamingConfig,
  type StreamStats,
  StreamingExecutor,
  StreamingExecutorHelpers,
} from './StreamingExecutor.js';
