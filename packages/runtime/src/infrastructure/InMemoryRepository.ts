import type { Entity, Repository } from '@stratix/core';

/* eslint-disable @typescript-eslint/require-await */

/**
 * Base in-memory repository implementation.
 *
 * Provides common CRUD operations for entities stored in memory.
 * Useful for development, testing, and prototyping.
 *
 * @template TEntity - The entity type this repository manages
 *
 * @example
 * ```typescript
 * class InMemoryProductRepository extends InMemoryRepository<Product> {
 *   async findByName(name: string): Promise<Product | null> {
 *     return this.findOne(p => p.name === name);
 *   *
 *   async findByCategory(category: string): Promise<Product[]> {
 *     return this.findMany(p => p.category === category);
 *   }
 * }
 * ```
 */
export abstract class InMemoryRepository<TEntity extends Entity<string>>
    implements Repository<TEntity, string> {
    protected entities = new Map<string, TEntity>();

    /**
     * Finds an entity by its ID.
     *
     * @param id - The entity ID (string)
     * @returns The entity or null if not found
     */
    async findById(id: string): Promise<TEntity | null> {
        return this.entities.get(id) ?? null;
    }

    /**
     * Finds all entities.
     *
     * @returns Array of all entities
     */
    async findAll(): Promise<TEntity[]> {
        return Array.from(this.entities.values());
    }

    /**
     * Saves an entity (creates or updates).
     *
     * @param entity - The entity to save
     */
    async save(entity: TEntity): Promise<void> {
        this.entities.set(entity.id.value, entity);
    }

    /**
     * Deletes an entity by its ID.
     *
     * @param id - The entity ID (string) to delete
     */
    async delete(id: string): Promise<void> {
        this.entities.delete(id);
    }

    /**
     * Checks if an entity exists.
     *
     * @param id - The entity ID (string) to check
     * @returns true if entity exists, false otherwise
     */
    async exists(id: string): Promise<boolean> {
        return this.entities.has(id);
    }

    /**
     * Finds the first entity matching a predicate.
     *
     * @param predicate - Function to test each entity
     * @returns The first matching entity or null
     *
     * @example
     * ```typescript
     * const product = await repository.findOne(p => p.price > 100);
     * ```
     */
    async findOne(predicate: (entity: TEntity) => boolean): Promise<TEntity | null> {
        for (const entity of this.entities.values()) {
            if (predicate(entity)) {
                return entity;
            }
        }
        return null;
    }

    /**
     * Finds all entities matching a predicate.
     *
     * @param predicate - Function to test each entity
     * @returns Array of matching entities
     *
     * @example
     * ```typescript
     * const expensiveProducts = await repository.findMany(p => p.price > 1000);
     * ```
     */
    async findMany(predicate: (entity: TEntity) => boolean): Promise<TEntity[]> {
        return Array.from(this.entities.values()).filter(predicate);
    }

    /**
     * Counts entities matching an optional predicate.
     *
     * @param predicate - Optional function to test each entity
     * @returns Count of matching entities
     *
     * @example
     * ```typescript
     * const totalCount = await repository.count();
     * const activeCount = await repository.count(p => p.status === 'active');
     * ```
     */
    async count(predicate?: (entity: TEntity) => boolean): Promise<number> {
        if (!predicate) {
            return this.entities.size;
        }
        return Array.from(this.entities.values()).filter(predicate).length;
    }

    /**
     * Clears all entities from the repository.
     * Useful for testing cleanup.
     *
     * @example
     * ```typescript
     * afterEach(() => {
     *   repository.clear();
     * });
     * ```
     */
    clear(): void {
        this.entities.clear();
    }

    /**
     * Saves multiple entities in batch.
     *
     * @param entities - Array of entities to save
     *
     * @example
     * ```typescript
     * await repository.saveMany([product1, product2, product3]);
     * ```
     */
    async saveMany(entities: TEntity[]): Promise<void> {
        for (const entity of entities) {
            await this.save(entity);
        }
    }

    /**
     * Deletes multiple entities by their IDs.
     *
     * @param ids - Array of entity IDs (strings) to delete
     *
     * @example
     * ```typescript
     * await repository.deleteMany(['id1', 'id2', 'id3']);
     * ```
     */
    async deleteMany(ids: string[]): Promise<void> {
        for (const id of ids) {
            await this.delete(id);
        }
    }
}
