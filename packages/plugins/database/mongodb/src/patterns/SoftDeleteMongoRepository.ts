import type { Filter, UpdateFilter } from 'mongodb';
import type { MongoDocument } from '../MongoRepository.js';
import { MongoRepository } from '../MongoRepository.js';

/**
 * Interface for soft-deletable entities
 */
export interface SoftDeletable {
    /**
     * Date when the entity was soft-deleted
     */
    deletedAt?: Date;

    /**
     * Flag indicating if the entity is deleted
     */
    isDeleted?: boolean;
}

/**
 * Abstract MongoDB Repository with soft delete support
 *
 * Provides soft delete functionality where entities are marked as deleted
 * instead of being permanently removed from the database.
 *
 * @template E - The entity type (must extend SoftDeletable)
 * @template ID - The ID type (typically string)
 *
 * @example
 * ```typescript
 * interface User extends SoftDeletable {
 *   id: string;
 *   email: string;
 *   name: string;
 * }
 *
 * class UserRepository extends SoftDeleteMongoRepository<User, string> {
 *   protected collectionName = 'users';
 *
 *   protected extractId(user: User): string {
 *     return user.id;
 *   }
 *
 *   protected toDocument(user: User): MongoDocument {
 *     return {
 *       _id: user.id,
 *       email: user.email,
 *       name: user.name,
 *       deletedAt: user.deletedAt,
 *       isDeleted: user.isDeleted,
 *     };
 *   }
 *
 *   protected toDomain(doc: MongoDocument): User {
 *     return {
 *       id: doc._id as string,
 *       email: doc.email as string,
 *       name: doc.name as string,
 *       deletedAt: doc.deletedAt as Date | undefined,
 *       isDeleted: doc.isDeleted as boolean | undefined,
 *     };
 *   }
 * }
 * ```
 */
export abstract class SoftDeleteMongoRepository<
    E extends SoftDeletable,
    ID = string
> extends MongoRepository<E, ID> {
    /**
     * Soft delete an entity by ID
     *
     * Sets deletedAt to current date and isDeleted to true.
     *
     * @param id - Entity ID
     */
    async softDelete(id: ID): Promise<void> {
        const mongoId = this.toMongoId(id);

        await this.updateBy(
            { _id: mongoId } as Filter<MongoDocument>,
            {
                $set: {
                    deletedAt: new Date(),
                    isDeleted: true,
                },
            } as UpdateFilter<MongoDocument>
        );
    }

    /**
     * Restore a soft-deleted entity
     *
     * Removes deletedAt and isDeleted fields.
     *
     * @param id - Entity ID
     */
    async restore(id: ID): Promise<void> {
        const mongoId = this.toMongoId(id);

        await this.updateBy(
            { _id: mongoId } as Filter<MongoDocument>,
            {
                $unset: {
                    deletedAt: '',
                    isDeleted: '',
                },
            } as UpdateFilter<MongoDocument>
        );
    }

    /**
     * Find all active (non-deleted) entities
     *
     * @returns Array of active entities
     */
    async findAllActive(): Promise<E[]> {
        return this.findBy({
            $or: [{ isDeleted: { $exists: false } }, { isDeleted: false }],
        } as Filter<MongoDocument>);
    }

    /**
     * Find all soft-deleted entities
     *
     * @returns Array of deleted entities
     */
    async findAllDeleted(): Promise<E[]> {
        return this.findBy({ isDeleted: true } as Filter<MongoDocument>);
    }

    /**
     * Count active (non-deleted) entities
     *
     * @returns Count of active entities
     */
    async countActive(): Promise<number> {
        return this.countBy({
            $or: [{ isDeleted: { $exists: false } }, { isDeleted: false }],
        } as Filter<MongoDocument>);
    }

    /**
     * Count soft-deleted entities
     *
     * @returns Count of deleted entities
     */
    async countDeleted(): Promise<number> {
        return this.countBy({ isDeleted: true } as Filter<MongoDocument>);
    }

    /**
     * Permanently delete an entity
     *
     * This bypasses soft delete and removes the entity from the database.
     *
     * @param id - Entity ID
     */
    async permanentDelete(id: ID): Promise<void> {
        await super.delete(id);
    }

    /**
     * Soft delete multiple entities matching a filter
     *
     * @param filter - MongoDB filter
     * @returns Number of entities soft-deleted
     */
    async softDeleteBy(filter: Filter<MongoDocument>): Promise<number> {
        return this.updateBy(filter, {
            $set: {
                deletedAt: new Date(),
                isDeleted: true,
            },
        } as UpdateFilter<MongoDocument>);
    }

    /**
     * Restore multiple entities matching a filter
     *
     * @param filter - MongoDB filter
     * @returns Number of entities restored
     */
    async restoreBy(filter: Filter<MongoDocument>): Promise<number> {
        return this.updateBy(filter, {
            $unset: {
                deletedAt: '',
                isDeleted: '',
            },
        } as UpdateFilter<MongoDocument>);
    }
}
