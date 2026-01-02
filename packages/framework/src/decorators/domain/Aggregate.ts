
import { AggregateRoot, EntityId } from '@stratix/core';
import { MetadataStorage } from '../../runtime/MetadataStorage.js';

/**
 * Options for the @Aggregate decorator.
 */
export interface AggregateOptions {
  /**
   * Automatically call touch() when properties change.
   * @default true
   */
  autoTimestamps?: boolean;

  /**
   * Automatically record domain events for methods decorated with @DomainEvent.
   * @default true
   */
  autoEvents?: boolean;

  /**
   * Table name for persistence (optional, used by repositories).
   */
  tableName?: string;
}

/**
 * Decorator to mark a class as an Aggregate Root.
 *
 * This decorator:
 * - Extends the class from AggregateRoot internally
 * - Auto-generates id, createdAt, updatedAt properties
 * - Optionally auto-calls touch() on property changes
 * - Optionally auto-records domain events
 *
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * @Aggregate({ autoTimestamps: true, autoEvents: true })
 * export class User {
 *   id!: EntityId<'User'>;
 *   email!: Email;
 *   name!: string;
 *
 *   @DomainEvent('UserCreated')
 *   static create(email: Email, name: string): User {
 *     const user = new User();
 *     user.email = email;
 *     user.name = name;
 *     return user;
 *   }
 * }
 * ```
 *
 * @category Domain Decorators
 */
export function Aggregate(options: AggregateOptions = {}) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    context: ClassDecoratorContext<T>
  ) {
    const {
      autoTimestamps = true,
      autoEvents = true,
      tableName,
    } = options;

    // Extract the entity type from the class name
    const entityType = target.name;

    // Store in context metadata (with null check)
    if (context.metadata) {
      context.metadata['aggregate'] = {
        type: entityType,
        autoTimestamps,
        autoEvents,
        tableName,
      };
    }

    // Create a new class that extends AggregateRoot
    const AggregateClass = class extends (AggregateRoot as any) {
      constructor(..._args: any[]) {
        // Generate ID if not provided
        const id = EntityId.create<any>();
        const now = new Date();

        // Call AggregateRoot constructor
        super(id, now, now);
      }
    } as any;

    // Copy methods from target prototype to AggregateClass prototype
    const methodNames = Object.getOwnPropertyNames(target.prototype);
    for (const name of methodNames) {
      if (name !== 'constructor') {
        const descriptor = Object.getOwnPropertyDescriptor(target.prototype, name);
        if (descriptor) {
          Object.defineProperty(AggregateClass.prototype, name, descriptor);
        }
      }
    }

    // Copy static methods from target to AggregateClass
    const staticNames = Object.getOwnPropertyNames(target);
    for (const name of staticNames) {
      if (name !== 'prototype' && name !== 'length' && name !== 'name') {
        const descriptor = Object.getOwnPropertyDescriptor(target, name);
        if (descriptor) {
          Object.defineProperty(AggregateClass, name, descriptor);
        }
      }
    }

    // Set the name
    Object.defineProperty(AggregateClass, 'name', {
      value: target.name,
      writable: false,
    });

    // Register metadata BEFORE proxying
    MetadataStorage.registerAggregate(AggregateClass, {
      type: entityType,
      target: AggregateClass,
      autoTimestamps,
      autoEvents,
      tableName,
    });

    // Auto-touch on property changes
    if (autoTimestamps) {
      // Return a Proxy that wraps instances to auto-update timestamps
      const ProxiedClass = new Proxy(AggregateClass, {
        construct(target, args) {
          const instance = new target(...args);

          // Wrap the instance in a Proxy to intercept property sets
          return new Proxy(instance, {
            set(obj, prop, value) {
              // Set the property
              (obj as any)[prop] = value;

              // Auto-touch if it's not a private property and not a special property
              if (
                typeof prop === 'string' &&
                !prop.startsWith('_') &&
                prop !== 'id' &&
                prop !== 'createdAt' &&
                prop !== 'updatedAt'
              ) {
                // Directly update _updatedAt
                (obj as any)._updatedAt = new Date();
              }

              return true;
            }
          });
        }
      }) as any;

      // Also register the proxy so metadata lookups work
      MetadataStorage.registerAggregate(ProxiedClass, {
        type: entityType,
        target: ProxiedClass,
        autoTimestamps,
        autoEvents,
        tableName,
      });

      return ProxiedClass as T;
    }

    return AggregateClass as T;
  };
}
