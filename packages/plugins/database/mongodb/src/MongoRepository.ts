import type { Collection, Document, Filter, FindOptions, UpdateFilter, ObjectId } from 'mongodb';
import type { Repository } from '@stratix/core';
import type { MongoConnection } from './MongoConnection.js';
import type { MongoUnitOfWork } from './MongoUnitOfWork.js';
import type { PaginationOptions, PaginatedResult } from './pagination/types.js';
import type { IndexDefinition } from './indexing/types.js';
import { IndexManager } from './indexing/IndexManager.js';
import { MongoAggregationBuilder } from './aggregation/AggregationBuilder.js';

/**
 * Type representing a MongoDB document
 */
export type MongoDocument = Document;

/**
 * Abstract MongoDB Repository
 *
 * Provides CRUD operations for entities backed by MongoDB.
 * Subclasses must implement entity-to-document and document-to-entity conversions.
 *
 * @template E - The entity type
 * @template ID - The ID type (typically string)
 *
 * @example
 * ```typescript
 * class UserRepository extends MongoRepository<User, string> {
 *   protected collectionName = 'users';
 *
 *   protected extractId(user: User): string {
 *     return user.id.value;
 *   }
 *
 *   protected toDocument(user: User): MongoDocument {
 *     return {
 *       _id: user.id.value,
 *       email: user.email,
 *       name: user.name,
 *       createdAt: user.createdAt,
 *       updatedAt: user.updatedAt,
 *     };
 *   }
 *
 *   protected toDomain(doc: MongoDocument): User {
 *     return new User(
 *       new UserId(doc._id as string),
 *       doc.email as string,
 *       doc.name as string,
 *       doc.createdAt as Date,
 *       doc.updatedAt as Date
 *     );
 *   }
 * }
 * ```
 */
export abstract class MongoRepository<E, ID = string> implements Repository<E, ID> {
  /**
   * The name of the MongoDB collection
   */
  protected abstract collectionName: string;

  /**
   * Optional index definitions for the collection
   * Override this in subclasses to define indexes
   */
  protected indexes?: IndexDefinition[];

  private collection?: Collection<MongoDocument>;

  constructor(
    protected readonly connection: MongoConnection,
    protected readonly unitOfWork?: MongoUnitOfWork
  ) { }

  /**
   * Get the MongoDB collection
   *
   * Lazy-loaded to avoid errors if connection isn't ready.
   */
  protected getCollection(): Collection<MongoDocument> {
    if (!this.collection) {
      this.collection = this.connection.collection<MongoDocument>(this.collectionName);
    }
    return this.collection;
  }

  /**
   * Converts an entity to a MongoDB document.
   * Subclasses must implement this method.
   *
   * @param entity - The entity to convert
   * @returns A MongoDB document
   */
  protected abstract toDocument(entity: E): MongoDocument;

  /**
   * Converts a MongoDB document to an entity.
   * Subclasses must implement this method.
   *
   * @param doc - The MongoDB document
   * @returns The entity
   */
  protected abstract toDomain(doc: MongoDocument): E;

  /**
   * Extract the ID value from an entity
   *
   * Subclasses must override this method to provide ID extraction logic.
   */
  protected abstract extractId(entity: E): ID;

  /**
   * Convert ID to MongoDB _id format
   *
   * Override this if you use ObjectId instead of strings.
   */
  protected toMongoId(id: ID): string | ObjectId {
    return id as string | ObjectId;
  }

  /**
   * Get session options if in transaction
   */
  private getSessionOptions() {
    const session = this.unitOfWork?.getSession();
    return session ? { session } : {};
  }

  /**
   * Save an entity (insert or update)
   */
  async save(entity: E): Promise<void> {
    const id = this.extractId(entity);
    const doc = this.toDocument(entity);
    const collection = this.getCollection();

    const mongoId = this.toMongoId(id);

    // Use replaceOne with upsert to handle both insert and update
    await collection.replaceOne({ _id: mongoId } as Filter<MongoDocument>, doc, {
      upsert: true,
      ...this.getSessionOptions(),
    });
  }

  /**
   * Insert a new entity
   *
   * Use this when you're sure the entity doesn't exist.
   */
  protected async insert(entity: E): Promise<void> {
    const doc = this.toDocument(entity);
    const collection = this.getCollection();

    await collection.insertOne(doc, this.getSessionOptions());
  }

  /**
   * Update an existing entity
   *
   * Use this when you're sure the entity exists.
   */
  protected async update(entity: E): Promise<void> {
    const id = this.extractId(entity);
    const doc = this.toDocument(entity);
    const collection = this.getCollection();

    const mongoId = this.toMongoId(id);

    await collection.replaceOne(
      { _id: mongoId } as Filter<MongoDocument>,
      doc,
      this.getSessionOptions()
    );
  }

  /**
   * Find entity by ID
   */
  async findById(id: ID): Promise<E | null> {
    const collection = this.getCollection();
    const mongoId = this.toMongoId(id);

    const doc = await collection.findOne(
      { _id: mongoId } as Filter<MongoDocument>,
      this.getSessionOptions()
    );

    if (!doc) {
      return null;
    }

    return this.toDomain(doc);
  }

  /**
   * Find all entities
   */
  async findAll(): Promise<E[]> {
    const collection = this.getCollection();

    const docs = await collection.find({}, this.getSessionOptions()).toArray();

    return docs.map((doc) => this.toDomain(doc));
  }

  /**
   * Find entities matching a filter
   *
   * @param filter - MongoDB filter object
   * @param options - Find options (sort, limit, etc.)
   * @returns Array of matching entities
   *
   * @example
   * ```typescript
   * const activeUsers = await userRepo.findBy({ status: 'active' });
   * const recentUsers = await userRepo.findBy({}, { sort: { createdAt: -1 }, limit: 10 });
   * ```
   */
  async findBy(filter: Filter<MongoDocument>, options?: FindOptions): Promise<E[]> {
    const collection = this.getCollection();

    const docs = await collection
      .find(filter, { ...options, ...this.getSessionOptions() })
      .toArray();

    return docs.map((doc) => this.toDomain(doc));
  }

  /**
   * Find one entity matching a filter
   *
   * @param filter - MongoDB filter object
   * @param options - Find options
   * @returns The entity if found, null otherwise
   *
   * @example
   * ```typescript
   * const user = await userRepo.findOneBy({ email: 'john@example.com' });
   * ```
   */
  async findOneBy(filter: Filter<MongoDocument>, options?: FindOptions): Promise<E | null> {
    const collection = this.getCollection();

    const doc = await collection.findOne(filter, { ...options, ...this.getSessionOptions() });

    if (!doc) {
      return null;
    }

    return this.toDomain(doc);
  }

  /**
   * Delete entity by ID
   */
  async delete(id: ID): Promise<void> {
    const collection = this.getCollection();
    const mongoId = this.toMongoId(id);

    await collection.deleteOne({ _id: mongoId } as Filter<MongoDocument>, this.getSessionOptions());
  }

  /**
   * Delete all entities matching a filter
   *
   * @param filter - MongoDB filter object
   * @returns Number of deleted documents
   *
   * @example
   * ```typescript
   * const deleted = await userRepo.deleteBy({ status: 'inactive' });
   * ```
   */
  async deleteBy(filter: Filter<MongoDocument>): Promise<number> {
    const collection = this.getCollection();

    const result = await collection.deleteMany(filter, this.getSessionOptions());

    return result.deletedCount;
  }

  /**
   * Count entities
   */
  async count(): Promise<number> {
    const collection = this.getCollection();

    return await collection.countDocuments({}, this.getSessionOptions());
  }

  /**
   * Count entities matching a filter
   *
   * @param filter - MongoDB filter object
   * @returns The count
   *
   * @example
   * ```typescript
   * const activeCount = await userRepo.countBy({ status: 'active' });
   * ```
   */
  async countBy(filter: Filter<MongoDocument>): Promise<number> {
    const collection = this.getCollection();

    return await collection.countDocuments(filter, this.getSessionOptions());
  }

  /**
   * Check if entity exists
   */
  async exists(id: ID): Promise<boolean> {
    const collection = this.getCollection();
    const mongoId = this.toMongoId(id);

    const count = await collection.countDocuments({ _id: mongoId } as Filter<MongoDocument>, {
      limit: 1,
      ...this.getSessionOptions(),
    });

    return count > 0;
  }

  /**
   * Update entities matching a filter
   *
   * @param filter - MongoDB filter object
   * @param update - MongoDB update object
   * @returns Number of updated documents
   *
   * @example
   * ```typescript
   * const updated = await userRepo.updateBy(
   *   { status: 'pending' },
   *   { $set: { status: 'active' } }
   * );
   * ```
   */
  async updateBy(
    filter: Filter<MongoDocument>,
    update: UpdateFilter<MongoDocument>
  ): Promise<number> {
    const collection = this.getCollection();

    const result = await collection.updateMany(filter, update, this.getSessionOptions());

    return result.modifiedCount;
  }

  /**
   * Find entities with pagination
   *
   * @param filter - MongoDB filter object
   * @param options - Pagination options
   * @returns Paginated result with metadata
   *
   * @example
   * ```typescript
   * const result = await userRepo.findPaginated(
   *   { status: 'active' },
   *   { page: 1, pageSize: 20, sort: { createdAt: -1 } }
   * );
   * console.log(result.data, result.total, result.hasNext);
   * ```
   */
  async findPaginated(
    filter: Filter<MongoDocument>,
    options: PaginationOptions
  ): Promise<PaginatedResult<E>> {
    const { page, pageSize, sort } = options;
    const skip = (page - 1) * pageSize;

    // Execute count and find in parallel for better performance
    const [data, total] = await Promise.all([
      this.findBy(filter, { skip, limit: pageSize, sort }),
      this.countBy(filter),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
      hasNext: skip + pageSize < total,
      hasPrev: page > 1,
    };
  }

  /**
   * Create an aggregation pipeline builder
   *
   * @returns A new aggregation builder instance
   *
   * @example
   * ```typescript
   * const stats = await userRepo.aggregate(
   *   userRepo.aggregation()
   *     .match({ status: 'active' })
   *     .group({ _id: '$country', count: { $sum: 1 } })
   *     .sort({ count: -1 })
   *     .build()
   * );
   * ```
   */
  protected aggregation(): MongoAggregationBuilder<MongoDocument> {
    return new MongoAggregationBuilder<MongoDocument>();
  }

  /**
   * Execute an aggregation pipeline
   *
   * @param pipeline - Aggregation pipeline stages
   * @returns Array of aggregation results
   *
   * @example
   * ```typescript
   * const pipeline = [
   *   { $match: { status: 'active' } },
   *   { $group: { _id: '$country', count: { $sum: 1 } } }
   * ];
   * const results = await userRepo.aggregate(pipeline);
   * ```
   */
  async aggregate<R = unknown>(pipeline: Document[]): Promise<R[]> {
    const collection = this.getCollection();
    return await collection.aggregate<R extends Document ? R : Document>(pipeline, this.getSessionOptions()).toArray() as R[];
  }

  /**
   * Ensure indexes are created on the collection
   *
   * Call this method during application startup to create indexes.
   *
   * @example
   * ```typescript
   * await userRepo.ensureIndexes();
   * ```
   */
  async ensureIndexes(): Promise<void> {
    if (!this.indexes || this.indexes.length === 0) {
      return;
    }

    const collection = this.getCollection();
    await IndexManager.ensureIndexes(collection, this.indexes);
  }

  /**
   * Create a single index on the collection
   *
   * @param keys - Index keys
   * @param options - Index options
   *
   * @example
   * ```typescript
   * await userRepo.createIndex({ email: 1 }, { unique: true });
   * ```
   */
  protected async createIndex(
    keys: Record<string, 1 | -1 | '2dsphere' | 'text' | string>,
    options?: IndexDefinition['options']
  ): Promise<void> {
    const collection = this.getCollection();
    await IndexManager.ensureIndexes(collection, [{ keys, options }]);
  }

  /**
   * List all indexes on the collection
   *
   * @returns Array of index information
   */
  async listIndexes(): Promise<Document[]> {
    const collection = this.getCollection();
    return await IndexManager.listIndexes(collection);
  }
}
