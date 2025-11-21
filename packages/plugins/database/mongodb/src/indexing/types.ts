/**
 * Index definition for MongoDB collections
 */
export interface IndexDefinition {
    /**
     * Index keys specification
     * @example { email: 1 } for ascending index on email
     * @example { createdAt: -1 } for descending index on createdAt
     * @example { location: '2dsphere' } for geospatial index
     */
    keys: Record<string, 1 | -1 | '2dsphere' | 'text' | string>;

    /**
     * Index options
     */
    options?: IndexOptions;
}

/**
 * Options for creating indexes
 */
export interface IndexOptions {
    /**
     * Create a unique index
     */
    unique?: boolean;

    /**
     * Create a sparse index (only indexes documents with the field)
     */
    sparse?: boolean;

    /**
     * TTL in seconds (for TTL indexes)
     */
    expireAfterSeconds?: number;

    /**
     * Index name (auto-generated if not provided)
     */
    name?: string;

    /**
     * Partial filter expression
     */
    partialFilterExpression?: Record<string, unknown>;

    /**
     * Background index creation (deprecated in MongoDB 4.2+)
     */
    background?: boolean;
}
