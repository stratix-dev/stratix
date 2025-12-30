import type { StreamChunk } from './StreamChunk.js';

/**
 * Streaming capability interface.
 *
 * Agents or operations that support streaming should implement this interface.
 * This enables composition-based streaming without inheritance complexity.
 *
 * @template TOutput - Type of the streamed output
 *
 * @example
 * ```typescript
 * class ChatAgent extends AIAgent<ChatInput, ChatOutput>
 *   implements Streamable<ChatOutput> {
 *
 *   async execute(input: ChatInput): Promise<ExecutionResult<ChatOutput>> {
 *     // Regular execution
 *   }
 *
 *   async *stream(): AsyncIterable<StreamChunk<ChatOutput>> {
 *     // Streaming implementation
 *     yield { data: { text: 'Hello' }, done: false };
 *     yield { data: { text: ' World' }, done: false };
 *     yield { data: { text: '!' }, done: true };
 *   }
 * }
 * ```
 */
export interface Streamable<TOutput = unknown> {
  /**
   * Create a streaming iterator for this operation.
   *
   * Yields chunks of data as they become available.
   * The final chunk should have `done: true`.
   *
   * @returns Async iterable of stream chunks
   *
   * @example
   * ```typescript
   * const agent = new StreamingChatAgent();
   * for await (const chunk of agent.stream()) {
   *   console.log(chunk.data);
   *   if (chunk.done) {
   *     console.log('Stream complete');
   *   }
   * }
   * ```
   */
  stream(): AsyncIterable<StreamChunk<TOutput>>;
}

/**
 * Type guard to check if an object is streamable.
 *
 * @param obj - Object to check
 * @returns True if object implements Streamable
 *
 * @example
 * ```typescript
 * if (isStreamable(agent)) {
 *   const stream = agent.stream();
 *   // Process stream...
 * }
 * ```
 */
export function isStreamable<TOutput = unknown>(
  obj: unknown
): obj is Streamable<TOutput> {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'stream' in obj &&
    typeof (obj as Record<string, unknown>).stream === 'function'
  );
}
