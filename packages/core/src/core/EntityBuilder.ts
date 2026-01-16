import { Entity } from './Entity.js';
import { EntityId } from './EntityId.js';

/**
 * Fluent builder for creating Entity instances.
 *
 * EntityBuilder provides a convenient way to construct entities without repeating
 * boilerplate code for IDs and timestamps. It's especially useful in tests and repositories.
 *
 * @template T - Phantom type representing the entity type (e.g., 'User', 'Order')
 * @template TProps - Type of the entity's properties
 *
 * @example
 * ```typescript
 * // Create a new entity (generates ID automatically)
 * const product = EntityBuilder.create<'Product', ProductProps>()
 *   .withProps({ name: 'Laptop', price: 999 })
 *   .build(Product);
 *
 * // Recreate entity from persistence
 * const product = EntityBuilder.create<'Product', ProductProps>()
 *   .withId('existing-id')
 *   .withProps({ name: 'Laptop', price: 999 })
 *   .withTimestamps(createdAt, updatedAt)
 *   .build(Product);
 * ```
 */
export class EntityBuilder<T extends string, TProps> {
  private id?: EntityId<T>;
  private props?: TProps;
  private createdAt?: Date;
  private updatedAt?: Date;

  /**
   * Creates a new EntityBuilder instance.
   *
   * @returns A new EntityBuilder
   */
  static create<T extends string, TProps>(): EntityBuilder<T, TProps> {
    return new EntityBuilder<T, TProps>();
  }

  /**
   * Sets the entity's ID.
   * If not called, a new ID will be generated automatically.
   *
   * @param id - EntityId or string ID
   * @returns This builder for chaining
   */
  withId(id: EntityId<T> | string): this {
    this.id = typeof id === 'string' ? EntityId.from<T>(id) : id;
    return this;
  }

  /**
   * Sets the entity's properties.
   * This method must be called before build().
   *
   * @param props - Entity properties
   * @returns This builder for chaining
   */
  withProps(props: TProps): this {
    this.props = props;
    return this;
  }

  /**
   * Sets the entity's timestamps.
   * If not called, current date will be used for both timestamps.
   *
   * @param createdAt - Creation timestamp (defaults to now)
   * @param updatedAt - Last update timestamp (defaults to now)
   * @returns This builder for chaining
   */
  withTimestamps(createdAt?: Date, updatedAt?: Date): this {
    this.createdAt = createdAt ?? new Date();
    this.updatedAt = updatedAt ?? new Date();
    return this;
  }

  /**
   * Builds the entity instance.
   *
   * @param EntityClass - Entity constructor that accepts (id, props, createdAt, updatedAt)
   * @returns The constructed entity
   * @throws Error if props were not set
   *
   * @example
   * ```typescript
   * const product = builder.build(Product);
   * ```
   */
  build<TEntity extends Entity<T>>(
    EntityClass: new (id: EntityId<T>, props: TProps, createdAt: Date, updatedAt: Date) => TEntity
  ): TEntity {
    const id = this.id ?? EntityId.create<T>();
    const createdAt = this.createdAt ?? new Date();
    const updatedAt = this.updatedAt ?? new Date();

    if (!this.props) {
      throw new Error('Props are required. Call withProps() before build()');
    }

    return new EntityClass(id, this.props, createdAt, updatedAt);
  }
}
