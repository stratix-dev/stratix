import type { Document, Filter } from 'mongodb';

/**
 * Fluent builder for MongoDB aggregation pipelines
 *
 * @template T - The document type
 *
 * @example
 * ```typescript
 * const pipeline = new MongoAggregationBuilder()
 *   .match({ status: 'active' })
 *   .group({ _id: '$country', count: { $sum: 1 } })
 *   .sort({ count: -1 })
 *   .limit(10)
 *   .build();
 * ```
 */
export class MongoAggregationBuilder<T = Document> {
    private pipeline: Document[] = [];

    /**
     * Add a $match stage
     *
     * @param filter - Match filter
     */
    match(filter: Filter<T>): this {
        this.pipeline.push({ $match: filter });
        return this;
    }

    /**
     * Add a $group stage
     *
     * @param spec - Group specification
     */
    group(spec: Document): this {
        this.pipeline.push({ $group: spec });
        return this;
    }

    /**
     * Add a $sort stage
     *
     * @param spec - Sort specification
     */
    sort(spec: Record<string, 1 | -1>): this {
        this.pipeline.push({ $sort: spec });
        return this;
    }

    /**
     * Add a $limit stage
     *
     * @param n - Number of documents to limit
     */
    limit(n: number): this {
        this.pipeline.push({ $limit: n });
        return this;
    }

    /**
     * Add a $skip stage
     *
     * @param n - Number of documents to skip
     */
    skip(n: number): this {
        this.pipeline.push({ $skip: n });
        return this;
    }

    /**
     * Add a $lookup stage (join)
     *
     * @param spec - Lookup specification
     */
    lookup(spec: {
        from: string;
        localField: string;
        foreignField: string;
        as: string;
    }): this {
        this.pipeline.push({ $lookup: spec });
        return this;
    }

    /**
     * Add a $project stage
     *
     * @param spec - Project specification
     */
    project(spec: Document): this {
        this.pipeline.push({ $project: spec });
        return this;
    }

    /**
     * Add an $unwind stage
     *
     * @param path - Field path to unwind
     * @param options - Unwind options
     */
    unwind(
        path: string,
        options?: { preserveNullAndEmptyArrays?: boolean; includeArrayIndex?: string }
    ): this {
        if (options) {
            this.pipeline.push({ $unwind: { path, ...options } });
        } else {
            this.pipeline.push({ $unwind: path });
        }
        return this;
    }

    /**
     * Add a $count stage
     *
     * @param field - Field name for the count
     */
    count(field: string): this {
        this.pipeline.push({ $count: field });
        return this;
    }

    /**
     * Add a custom stage
     *
     * @param stage - Custom pipeline stage
     */
    addStage(stage: Document): this {
        this.pipeline.push(stage);
        return this;
    }

    /**
     * Build and return the pipeline
     *
     * @returns The aggregation pipeline
     */
    build(): Document[] {
        return this.pipeline;
    }
}
