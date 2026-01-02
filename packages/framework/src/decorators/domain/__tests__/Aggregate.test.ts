import { describe, it, expect, beforeEach } from 'vitest';
import { Aggregate } from '../Aggregate.js';
import { DomainEvent } from '../DomainEvent.js';
import { EntityId } from '@stratix/core';
import { MetadataStorage } from '../../../runtime/MetadataStorage.js';

describe('@Aggregate Decorator', () => {
  beforeEach(() => {
    // Clear metadata storage before each test
    MetadataStorage['aggregates'] = new Map();
  });

  describe('Basic Functionality', () => {
    it('should transform a class into an AggregateRoot', () => {
      @Aggregate()
      class TestAggregate {
        name: string = '';
      }

      const instance = new TestAggregate();

      // Should have AggregateRoot properties
      expect(instance).toHaveProperty('id');
      expect(instance).toHaveProperty('createdAt');
      expect(instance).toHaveProperty('updatedAt');
    });

    it('should auto-generate id on construction', () => {
      @Aggregate()
      class TestAggregate {
        name: string = '';
      }

      const instance = new TestAggregate();

      expect(instance.id).toBeDefined();
      expect(typeof instance.id).toBe('object');
    });

    it('should set createdAt and updatedAt timestamps', () => {
      @Aggregate()
      class TestAggregate {
        name: string = '';
      }

      const instance = new TestAggregate();

      expect(instance.createdAt).toBeInstanceOf(Date);
      expect(instance.updatedAt).toBeInstanceOf(Date);
      expect(instance.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('Auto-timestamps', () => {
    it('should update updatedAt when property changes with autoTimestamps=true', async () => {
      @Aggregate({ autoTimestamps: true })
      class TestAggregate {
        name: string = '';
      }

      const instance = new TestAggregate();
      const originalUpdatedAt = instance.updatedAt;

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      instance.name = 'New Name';

      expect(instance.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });

    it('should not auto-update timestamps when autoTimestamps=false', async () => {
      @Aggregate({ autoTimestamps: false })
      class TestAggregate {
        name: string = '';
      }

      const instance = new TestAggregate();
      const originalUpdatedAt = instance.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      instance.name = 'New Name';

      expect(instance.updatedAt.getTime()).toBe(originalUpdatedAt.getTime());
    });
  });

  describe('Auto-events', () => {
    it('should auto-record domain events when methods are called with autoEvents=true', () => {
      @Aggregate({ autoEvents: true })
      class TestAggregate {
        name: string = '';

        @DomainEvent('TestEvent')
        changeName(newName: string): void {
          this.name = newName;
        }
      }

      const instance = new TestAggregate();
      instance.changeName('New Name');

      expect(instance.hasDomainEvents()).toBe(true);
      const events = instance.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('TestEvent');
    });
  });

  describe('Metadata Registration', () => {
    it('should register aggregate metadata', () => {
      @Aggregate()
      class TestAggregate {
        name: string = '';
      }

      const metadata = MetadataStorage.getAggregate(TestAggregate);

      expect(metadata).toBeDefined();
      expect(metadata?.target).toBe(TestAggregate);
      expect(metadata?.autoTimestamps).toBe(true); // default
    });

    it('should store custom options in metadata', () => {
      @Aggregate({ autoTimestamps: false, autoEvents: false })
      class TestAggregate {
        name: string = '';
      }

      const metadata = MetadataStorage.getAggregate(TestAggregate);

      expect(metadata?.autoTimestamps).toBe(false);
      expect(metadata?.autoEvents).toBe(false);
    });
  });

  describe('Domain Events', () => {
    it('should support domain event methods', () => {
      @Aggregate()
      class Order {
        status: string = 'pending';
        items: string[] = [];

        @DomainEvent('OrderPlaced')
        place(items: string[]): void {
          this.items = items;
          this.status = 'placed';
        }

        @DomainEvent('OrderCancelled')
        cancel(): void {
          this.status = 'cancelled';
        }
      }

      const order = new Order();
      order.place(['item1', 'item2']);

      expect(order.status).toBe('placed');
      expect(order.items).toEqual(['item1', 'item2']);

      expect(order.hasDomainEvents()).toBe(true);
      const events = order.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('OrderPlaced');

      order.cancel();
      expect(order.hasDomainEvents()).toBe(true);
      const events2 = order.pullDomainEvents();
      expect(events2).toHaveLength(1);
      expect(events2[0].eventName).toBe('OrderCancelled');
    });

    it('should support pullDomainEvents', () => {
      @Aggregate()
      class TestAggregate {
        @DomainEvent('SomethingHappened')
        doSomething(): void {}
      }

      const instance = new TestAggregate();
      instance.doSomething();

      expect(instance.hasDomainEvents()).toBe(true);

      const events = instance.pullDomainEvents();
      expect(events).toHaveLength(1);

      // After pulling, should be empty
      expect(instance.hasDomainEvents()).toBe(false);
    });
  });

  describe('Composition', () => {
    it('should work with composition pattern', () => {
      @Aggregate()
      class UserAggregate {
        email: string = '';
        profile: { name: string; age: number } = { name: '', age: 0 };

        updateProfile(name: string, age: number): void {
          this.profile = { name, age };
        }
      }

      const instance = new UserAggregate();
      instance.email = 'user@example.com';
      instance.updateProfile('John Doe', 30);

      expect(instance).toHaveProperty('id');
      expect(instance).toHaveProperty('createdAt');
      expect(instance.email).toBe('user@example.com');
      expect(instance.profile.name).toBe('John Doe');
      expect(instance.profile.age).toBe(30);
    });
  });

  describe('Factory Methods', () => {
    it('should support factory methods for initialization', () => {
      @Aggregate()
      class Product {
        name: string = '';
        price: number = 0;

        static create(name: string, price: number): Product {
          const product = new Product();
          product.name = name;
          product.price = price;
          return product;
        }
      }

      const product = Product.create('Widget', 99.99);

      expect(product.name).toBe('Widget');
      expect(product.price).toBe(99.99);
      expect(product.id).toBeDefined();
      expect(product.createdAt).toBeInstanceOf(Date);
    });
  });
});
