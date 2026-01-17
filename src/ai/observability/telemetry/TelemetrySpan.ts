/**
 * Telemetry span for tracking operations.
 *
 * Compatible with OpenTelemetry span format.
 */
export interface TelemetrySpan {
  /**
   * Unique span ID.
   */
  readonly spanId: string;

  /**
   * Trace ID this span belongs to.
   */
  readonly traceId: string;

  /**
   * Parent span ID (if nested).
   */
  readonly parentSpanId?: string;

  /**
   * Span name (e.g., 'agent.execute', 'tool.call').
   */
  readonly name: string;

  /**
   * Span kind (client, server, internal, etc.).
   */
  readonly kind: SpanKind;

  /**
   * Start timestamp.
   */
  readonly startTime: Date;

  /**
   * End timestamp (if completed).
   */
  readonly endTime?: Date;

  /**
   * Span attributes (metadata).
   */
  readonly attributes: Readonly<Record<string, SpanAttributeValue>>;

  /**
   * Span events (log entries within the span).
   */
  readonly events: readonly SpanEvent[];

  /**
   * Span status.
   */
  readonly status: SpanStatus;
}

/**
 * Span kind (OpenTelemetry compatible).
 */
export enum SpanKind {
  /**
   * Internal operation within the docorators.
   */
  INTERNAL = 'internal',

  /**
   * Outbound request (client).
   */
  CLIENT = 'client',

  /**
   * Inbound request (server).
   */
  SERVER = 'server',

  /**
   * Message producer.
   */
  PRODUCER = 'producer',

  /**
   * Message consumer.
   */
  CONSUMER = 'consumer'
}

/**
 * Span attribute value types.
 */
export type SpanAttributeValue = string | number | boolean | string[] | number[] | boolean[];

/**
 * Event within a span.
 */
export interface SpanEvent {
  /**
   * Event name.
   */
  readonly name: string;

  /**
   * Event timestamp.
   */
  readonly timestamp: Date;

  /**
   * Event attributes.
   */
  readonly attributes?: Readonly<Record<string, SpanAttributeValue>>;
}

/**
 * Span status.
 */
export interface SpanStatus {
  /**
   * Status code.
   */
  readonly code: SpanStatusCode;

  /**
   * Optional status message.
   */
  readonly message?: string;
}

/**
 * Span status code (OpenTelemetry compatible).
 */
export enum SpanStatusCode {
  /**
   * Operation completed successfully.
   */
  OK = 'ok',

  /**
   * Operation failed with an error.
   */
  ERROR = 'error',

  /**
   * Status is unset (default).
   */
  UNSET = 'unset'
}

/**
 * Helper functions for working with telemetry spans.
 */
export const TelemetrySpanHelpers = {
  /**
   * Create a new span.
   *
   * @param config - Span config
   * @returns Telemetry span
   */
  create(config: {
    name: string;
    traceId: string;
    spanId?: string;
    kind?: SpanKind;
    parentSpanId?: string;
    attributes?: Record<string, SpanAttributeValue>;
  }): TelemetrySpan {
    return {
      spanId: config.spanId ?? this.generateSpanId(),
      traceId: config.traceId,
      parentSpanId: config.parentSpanId,
      name: config.name,
      kind: config.kind ?? SpanKind.INTERNAL,
      startTime: new Date(),
      attributes: config.attributes ?? {},
      events: [],
      status: { code: SpanStatusCode.UNSET }
    };
  },

  /**
   * Complete a span.
   *
   * @param span - The span to complete
   * @param errorOrStatus - Error object or status
   * @returns Completed span
   */
  complete(span: TelemetrySpan, errorOrStatus?: Error | SpanStatus): TelemetrySpan {
    let status: SpanStatus;

    if (errorOrStatus instanceof Error) {
      status = {
        code: SpanStatusCode.ERROR,
        message: errorOrStatus.message
      };
    } else {
      status = errorOrStatus ?? { code: SpanStatusCode.OK };
    }

    return {
      ...span,
      endTime: new Date(),
      status
    };
  },

  /**
   * Add an event to a span.
   *
   * @param span - The span
   * @param event - The event name or full event object
   * @param attributes - Optional attributes if event is a string
   * @returns Updated span
   */
  addEvent(
    span: TelemetrySpan,
    event: string | SpanEvent,
    attributes?: Record<string, SpanAttributeValue>
  ): TelemetrySpan {
    const spanEvent: SpanEvent =
      typeof event === 'string'
        ? {
            name: event,
            timestamp: new Date(),
            attributes
          }
        : event;

    return {
      ...span,
      events: [...span.events, spanEvent]
    };
  },

  /**
   * Set span attributes.
   *
   * @param span - The span
   * @param attributes - Attributes to set
   * @returns Updated span
   */
  setAttributes(
    span: TelemetrySpan,
    attributes: Record<string, SpanAttributeValue>
  ): TelemetrySpan {
    return {
      ...span,
      attributes: { ...span.attributes, ...attributes }
    };
  },

  /**
   * Calculate span duration in milliseconds.
   *
   * @param span - The span
   * @returns Duration in ms, or undefined if not completed
   */
  getDuration(span: TelemetrySpan): number | undefined {
    if (!span.endTime) return undefined;
    return span.endTime.getTime() - span.startTime.getTime();
  },

  /**
   * Check if span is completed.
   *
   * @param span - The span
   * @returns True if span has an end time
   */
  isCompleted(span: TelemetrySpan): boolean {
    return span.endTime !== undefined;
  },

  /**
   * Check if span represents an error.
   *
   * @param span - The span
   * @returns True if status is ERROR
   */
  isError(span: TelemetrySpan): boolean {
    return span.status.code === SpanStatusCode.ERROR;
  },

  /**
   * Generate a unique span ID.
   *
   * @returns Span ID
   */
  generateSpanId(): string {
    return `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Generate a unique trace ID.
   *
   * @returns Trace ID
   */
  generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};
