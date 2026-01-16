import type { TelemetrySpan } from './TelemetrySpan.js';

/**
 * Exporter for telemetry data.
 *
 * Implementations send spans to various backends:
 * - Console (development)
 * - OpenTelemetry
 * - Datadog
 * - New Relic
 * - etc.
 */
export interface TelemetryExporter {
  /**
   * Export a batch of spans.
   *
   * @param spans - Spans to export
   * @returns Promise resolving when export complete
   */
  export(spans: readonly TelemetrySpan[]): Promise<void>;

  /**
   * Flush any pending spans.
   *
   * @returns Promise resolving when flush complete
   */
  flush(): Promise<void>;

  /**
   * Shutdown the exporter.
   *
   * @returns Promise resolving when shutdown complete
   */
  shutdown(): Promise<void>;
}

/**
 * Console exporter for development.
 *
 * Logs spans to console in a readable format.
 *
 * @example
 * ```typescript
 * const exporter = new ConsoleExporter();
 * await exporter.export([span1, span2, span3]);
 * ```
 */
export class ConsoleExporter implements TelemetryExporter {
  async export(spans: readonly TelemetrySpan[]): Promise<void> {
    for (const span of spans) {
      console.log('[TELEMETRY]', this.formatSpan(span));
    }
    return Promise.resolve();
  }

  async flush(): Promise<void> {
    // Nothing to flush for console exporter
  }

  async shutdown(): Promise<void> {
    // Nothing to shutdown for console exporter
  }

  private formatSpan(span: TelemetrySpan): string {
    const duration = span.endTime ? span.endTime.getTime() - span.startTime.getTime() : 'ongoing';

    return `[${span.name}] ${span.spanId} (${duration}ms) - ${span.status.code}`;
  }
}

/**
 * Batching exporter that collects spans and exports in batches.
 *
 * Reduces overhead by grouping multiple spans into single export operations.
 *
 * @example
 * ```typescript
 * const backend = new ConsoleExporter();
 * const exporter = new BatchingExporter(backend, { batchSize: 100 });
 *
 * await exporter.export([span1]);
 * await exporter.export([span2]);
 * // ... batched automatically
 * await exporter.flush(); // Force export
 * ```
 */
export class BatchingExporter implements TelemetryExporter {
  private batch: TelemetrySpan[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(
    private readonly backend: TelemetryExporter,
    private readonly config: {
      batchSize?: number;
      flushInterval?: number;
    } = {}
  ) {
    const flushInterval = config.flushInterval ?? 5000;
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, flushInterval);
  }

  async export(spans: readonly TelemetrySpan[]): Promise<void> {
    this.batch.push(...spans);

    const batchSize = this.config.batchSize ?? 100;
    if (this.batch.length >= batchSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.batch.length === 0) return;

    const toExport = [...this.batch];
    this.batch = [];

    await this.backend.export(toExport);
  }

  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    await this.flush();
    await this.backend.shutdown();
  }
}
