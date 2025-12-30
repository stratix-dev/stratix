/**
 * Chunk of streamed data.
 *
 * Represents a single piece of data in a streaming response.
 *
 * @template TOutput - Type of the output data
 */
export interface StreamChunk<TOutput = unknown> {
  /**
   * The chunk data.
   *
   * Can be partial or complete depending on the stream.
   */
  readonly data: TOutput;

  /**
   * Whether this is the final chunk.
   *
   * When `true`, the stream is complete and no more chunks will be emitted.
   */
  readonly done: boolean;

  /**
   * Optional metadata about this chunk.
   *
   * Examples:
   * - Token usage
   * - Processing time
   * - Chunk index
   * - Model information
   */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Helper functions for working with stream chunks.
 */
export const StreamChunkHelpers = {
  /**
   * Create a stream chunk.
   *
   * @param data - The chunk data
   * @param done - Whether this is the final chunk
   * @param metadata - Optional metadata
   * @returns Stream chunk
   *
   * @example
   * ```typescript
   * const chunk = StreamChunkHelpers.create(
   *   { text: 'Hello' },
   *   false,
   *   { tokens: 5 }
   * );
   * ```
   */
  create<TOutput>(
    data: TOutput,
    done: boolean,
    metadata?: Record<string, unknown>
  ): StreamChunk<TOutput> {
    return { data, done, metadata };
  },

  /**
   * Create a partial chunk (not done).
   *
   * @param data - The chunk data
   * @param metadata - Optional metadata
   * @returns Partial stream chunk
   *
   * @example
   * ```typescript
   * const chunk = StreamChunkHelpers.partial({ text: 'Hello' });
   * ```
   */
  partial<TOutput>(
    data: TOutput,
    metadata?: Record<string, unknown>
  ): StreamChunk<TOutput> {
    return { data, done: false, metadata };
  },

  /**
   * Create a final chunk (done).
   *
   * @param data - The chunk data
   * @param metadata - Optional metadata
   * @returns Final stream chunk
   *
   * @example
   * ```typescript
   * const chunk = StreamChunkHelpers.final({ text: 'World!' });
   * ```
   */
  final<TOutput>(
    data: TOutput,
    metadata?: Record<string, unknown>
  ): StreamChunk<TOutput> {
    return { data, done: true, metadata };
  },

  /**
   * Check if a chunk is the final chunk.
   *
   * @param chunk - The chunk to check
   * @returns True if this is the final chunk
   *
   * @example
   * ```typescript
   * if (StreamChunkHelpers.isFinal(chunk)) {
   *   console.log('Stream complete');
   * }
   * ```
   */
  isFinal<TOutput>(chunk: StreamChunk<TOutput>): boolean {
    return chunk.done;
  },

  /**
   * Check if a chunk is a partial chunk.
   *
   * @param chunk - The chunk to check
   * @returns True if this is a partial chunk
   *
   * @example
   * ```typescript
   * if (StreamChunkHelpers.isPartial(chunk)) {
   *   console.log('More chunks coming');
   * }
   * ```
   */
  isPartial<TOutput>(chunk: StreamChunk<TOutput>): boolean {
    return !chunk.done;
  },

  /**
   * Collect all chunks from a stream into an array.
   *
   * @param stream - The async iterable stream
   * @returns Array of all chunks
   *
   * @example
   * ```typescript
   * const chunks = await StreamChunkHelpers.collect(stream);
   * console.log(`Received ${chunks.length} chunks`);
   * ```
   */
  async collect<TOutput>(
    stream: AsyncIterable<StreamChunk<TOutput>>
  ): Promise<StreamChunk<TOutput>[]> {
    const chunks: StreamChunk<TOutput>[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return chunks;
  },

  /**
   * Get the final chunk from a stream.
   *
   * Consumes the entire stream and returns only the last chunk.
   *
   * @param stream - The async iterable stream
   * @returns The final chunk, or undefined if stream is empty
   *
   * @example
   * ```typescript
   * const final = await StreamChunkHelpers.getFinal(stream);
   * if (final) {
   *   console.log('Final result:', final.data);
   * }
   * ```
   */
  async getFinal<TOutput>(
    stream: AsyncIterable<StreamChunk<TOutput>>
  ): Promise<StreamChunk<TOutput> | undefined> {
    let lastChunk: StreamChunk<TOutput> | undefined;
    for await (const chunk of stream) {
      lastChunk = chunk;
    }
    return lastChunk;
  },

  /**
   * Map chunk data through a transformation function.
   *
   * @param stream - The async iterable stream
   * @param fn - Transformation function
   * @returns Transformed stream
   *
   * @example
   * ```typescript
   * const uppercase = StreamChunkHelpers.map(
   *   stream,
   *   (text) => text.toUpperCase()
   * );
   * ```
   */
  async *map<TInput, TOutput>(
    stream: AsyncIterable<StreamChunk<TInput>>,
    fn: (data: TInput) => TOutput
  ): AsyncIterable<StreamChunk<TOutput>> {
    for await (const chunk of stream) {
      yield {
        data: fn(chunk.data),
        done: chunk.done,
        metadata: chunk.metadata,
      };
    }
  },

  /**
   * Filter chunks based on a predicate.
   *
   * @param stream - The async iterable stream
   * @param predicate - Filter function
   * @returns Filtered stream
   *
   * @example
   * ```typescript
   * const nonEmpty = StreamChunkHelpers.filter(
   *   stream,
   *   (data) => data.text.length > 0
   * );
   * ```
   */
  async *filter<TOutput>(
    stream: AsyncIterable<StreamChunk<TOutput>>,
    predicate: (data: TOutput) => boolean
  ): AsyncIterable<StreamChunk<TOutput>> {
    for await (const chunk of stream) {
      if (predicate(chunk.data)) {
        yield chunk;
      }
    }
  },

  /**
   * Accumulate chunks into a single result.
   *
   * Useful for concatenating text chunks or merging partial results.
   *
   * @param stream - The async iterable stream
   * @param accumulator - Accumulation function
   * @param initial - Initial value
   * @returns Final accumulated value
   *
   * @example
   * ```typescript
   * const fullText = await StreamChunkHelpers.reduce(
   *   stream,
   *   (acc, chunk) => acc + chunk.text,
   *   ''
   * );
   * ```
   */
  async reduce<TOutput, TAcc>(
    stream: AsyncIterable<StreamChunk<TOutput>>,
    accumulator: (acc: TAcc, data: TOutput) => TAcc,
    initial: TAcc
  ): Promise<TAcc> {
    let acc = initial;
    for await (const chunk of stream) {
      acc = accumulator(acc, chunk.data);
    }
    return acc;
  },
};
