import type { Collection, Document } from 'mongodb';
import type { IndexDefinition } from './types.js';

/**
 * Helper class for managing MongoDB indexes
 */
export class IndexManager {
    /**
     * Ensure indexes exist on a collection
     *
     * @param collection - MongoDB collection
     * @param indexes - Array of index definitions
     */
    static async ensureIndexes(
        collection: Collection<Document>,
        indexes: IndexDefinition[]
    ): Promise<void> {
        if (!indexes || indexes.length === 0) {
            return;
        }

        for (const index of indexes) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await collection.createIndex(index.keys as any, index.options);
        }
    }

    /**
     * Drop all indexes on a collection (except _id)
     *
     * @param collection - MongoDB collection
     */
    static async dropAllIndexes(collection: Collection<Document>): Promise<void> {
        await collection.dropIndexes();
    }

    /**
     * List all indexes on a collection
     *
     * @param collection - MongoDB collection
     * @returns Array of index information
     */
    static async listIndexes(collection: Collection<Document>): Promise<Document[]> {
        return await collection.listIndexes().toArray();
    }

    /**
     * Check if an index exists
     *
     * @param collection - MongoDB collection
     * @param indexName - Name of the index
     * @returns True if index exists
     */
    static async indexExists(
        collection: Collection<Document>,
        indexName: string
    ): Promise<boolean> {
        const indexes = await this.listIndexes(collection);
        return indexes.some((index) => index.name === indexName);
    }
}
