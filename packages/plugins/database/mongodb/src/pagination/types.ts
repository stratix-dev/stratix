/**
 * Pagination options for querying data
 */
export interface PaginationOptions {
    /**
     * Page number (1-indexed)
     */
    page: number;

    /**
     * Number of items per page
     */
    pageSize: number;

    /**
     * Sort specification
     * @example { createdAt: -1, name: 1 }
     */
    sort?: Record<string, 1 | -1>;
}

/**
 * Paginated result with metadata
 */
export interface PaginatedResult<T> {
    /**
     * Array of items for the current page
     */
    data: T[];

    /**
     * Total number of items across all pages
     */
    total: number;

    /**
     * Current page number (1-indexed)
     */
    page: number;

    /**
     * Number of items per page
     */
    pageSize: number;

    /**
     * Total number of pages
     */
    totalPages: number;

    /**
     * Whether there is a next page
     */
    hasNext: boolean;

    /**
     * Whether there is a previous page
     */
    hasPrev: boolean;
}
