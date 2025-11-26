import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryRepository } from '../InMemoryRepository.js';
import { Entity, EntityId } from '@stratix/core';

// Test entity for testing
interface TestProductProps {
    name: string;
    price: number;
    category: string;
    status?: 'active' | 'inactive';
}

class TestProduct extends Entity<'Product'> {
    constructor(
        id: EntityId<'Product'>,
        private readonly props: TestProductProps,
        createdAt: Date,
        updatedAt: Date
    ) {
        super(id, createdAt, updatedAt);
    }

    get name(): string {
        return this.props.name;
    }

    get price(): number {
        return this.props.price;
    }

    get category(): string {
        return this.props.category;
    }

    get status(): string {
        return this.props.status ?? 'active';
    }
}

class TestProductRepository extends InMemoryRepository<TestProduct> {
    async findByName(name: string): Promise<TestProduct | null> {
        return this.findOne((p) => p.name === name);
    }

    async findByCategory(category: string): Promise<TestProduct[]> {
        return this.findMany((p) => p.category === category);
    }

    async findActive(): Promise<TestProduct[]> {
        return this.findMany((p) => p.status === 'active');
    }
}

describe('InMemoryRepository', () => {
    let repository: TestProductRepository;
    let product1: TestProduct;
    let product2: TestProduct;
    let product3: TestProduct;

    beforeEach(() => {
        repository = new TestProductRepository();

        product1 = new TestProduct(
            EntityId.from<'Product'>('product-1'),
            { name: 'Laptop', price: 999, category: 'Electronics' },
            new Date(),
            new Date()
        );

        product2 = new TestProduct(
            EntityId.from<'Product'>('product-2'),
            { name: 'Mouse', price: 29, category: 'Accessories' },
            new Date(),
            new Date()
        );

        product3 = new TestProduct(
            EntityId.from<'Product'>('product-3'),
            { name: 'Keyboard', price: 79, category: 'Accessories', status: 'inactive' },
            new Date(),
            new Date()
        );
    });

    describe('save and findById', () => {
        it('should save and retrieve entity', async () => {
            await repository.save(product1);

            const found = await repository.findById(product1.id.value);
            expect(found).toBe(product1);
        });

        it('should return null for non-existent id', async () => {
            const found = await repository.findById("non-existent");
            expect(found).toBeNull();
        });

        it('should update existing entity on save', async () => {
            await repository.save(product1);
            await repository.save(product1); // Save again

            const count = await repository.count();
            expect(count).toBe(1);
        });
    });

    describe('findAll', () => {
        it('should return empty array when no entities', async () => {
            const all = await repository.findAll();
            expect(all).toEqual([]);
        });

        it('should return all entities', async () => {
            await repository.save(product1);
            await repository.save(product2);

            const all = await repository.findAll();
            expect(all).toHaveLength(2);
            expect(all).toContain(product1);
            expect(all).toContain(product2);
        });
    });

    describe('delete', () => {
        it('should delete entity by id', async () => {
            await repository.save(product1);
            await repository.delete(product1.id.value);

            const found = await repository.findById(product1.id.value);
            expect(found).toBeNull();
        });

        it('should not throw when deleting non-existent entity', async () => {
            await expect(
                repository.delete("non-existent")
            ).resolves.not.toThrow();
        });
    });

    describe('exists', () => {
        it('should return true for existing entity', async () => {
            await repository.save(product1);

            const exists = await repository.exists(product1.id.value);
            expect(exists).toBe(true);
        });

        it('should return false for non-existent entity', async () => {
            const exists = await repository.exists("non-existent");
            expect(exists).toBe(false);
        });
    });

    describe('findOne', () => {
        beforeEach(async () => {
            await repository.save(product1);
            await repository.save(product2);
            await repository.save(product3);
        });

        it('should find first matching entity', async () => {
            const found = await repository.findOne((p) => p.category === 'Accessories');

            expect(found).toBeDefined();
            expect(found?.category).toBe('Accessories');
        });

        it('should return null when no match', async () => {
            const found = await repository.findOne((p) => p.price > 10000);
            expect(found).toBeNull();
        });

        it('should work with custom repository method', async () => {
            const found = await repository.findByName('Laptop');
            expect(found).toBe(product1);
        });
    });

    describe('findMany', () => {
        beforeEach(async () => {
            await repository.save(product1);
            await repository.save(product2);
            await repository.save(product3);
        });

        it('should find all matching entities', async () => {
            const accessories = await repository.findMany((p) => p.category === 'Accessories');

            expect(accessories).toHaveLength(2);
            expect(accessories).toContain(product2);
            expect(accessories).toContain(product3);
        });

        it('should return empty array when no matches', async () => {
            const expensive = await repository.findMany((p) => p.price > 10000);
            expect(expensive).toEqual([]);
        });

        it('should work with custom repository method', async () => {
            const accessories = await repository.findByCategory('Accessories');
            expect(accessories).toHaveLength(2);
        });

        it('should work with complex predicates', async () => {
            const active = await repository.findActive();
            expect(active).toHaveLength(2);
            expect(active).not.toContain(product3);
        });
    });

    describe('count', () => {
        beforeEach(async () => {
            await repository.save(product1);
            await repository.save(product2);
            await repository.save(product3);
        });

        it('should count all entities when no predicate', async () => {
            const count = await repository.count();
            expect(count).toBe(3);
        });

        it('should count matching entities', async () => {
            const count = await repository.count((p) => p.category === 'Accessories');
            expect(count).toBe(2);
        });

        it('should return 0 for empty repository', async () => {
            repository.clear();
            const count = await repository.count();
            expect(count).toBe(0);
        });
    });

    describe('clear', () => {
        it('should remove all entities', async () => {
            await repository.save(product1);
            await repository.save(product2);

            repository.clear();

            const count = await repository.count();
            expect(count).toBe(0);
        });
    });

    describe('saveMany', () => {
        it('should save multiple entities', async () => {
            await repository.saveMany([product1, product2, product3]);

            const count = await repository.count();
            expect(count).toBe(3);
        });

        it('should work with empty array', async () => {
            await repository.saveMany([]);

            const count = await repository.count();
            expect(count).toBe(0);
        });
    });

    describe('deleteMany', () => {
        beforeEach(async () => {
            await repository.save(product1);
            await repository.save(product2);
            await repository.save(product3);
        });

        it('should delete multiple entities', async () => {
            await repository.deleteMany([product1.id.value, product2.id.value]);

            const count = await repository.count();
            expect(count).toBe(1);

            const remaining = await repository.findById(product3.id.value);
            expect(remaining).toBe(product3);
        });

        it('should work with empty array', async () => {
            await repository.deleteMany([]);

            const count = await repository.count();
            expect(count).toBe(3);
        });
    });

    describe('real-world scenarios', () => {
        it('should handle typical CRUD operations', async () => {
            // Create
            await repository.save(product1);
            expect(await repository.exists(product1.id.value)).toBe(true);

            // Read
            const found = await repository.findById(product1.id.value);
            expect(found?.name).toBe('Laptop');

            // Update (save again)
            await repository.save(product1);
            expect(await repository.count()).toBe(1);

            // Delete
            await repository.delete(product1.id.value);
            expect(await repository.exists(product1.id.value)).toBe(false);
        });

        it('should support filtering and querying', async () => {
            await repository.saveMany([product1, product2, product3]);

            // Find by category
            const accessories = await repository.findByCategory('Accessories');
            expect(accessories).toHaveLength(2);

            // Find by price range
            const affordable = await repository.findMany((p) => p.price < 100);
            expect(affordable).toHaveLength(2);

            // Find active only
            const active = await repository.findActive();
            expect(active).toHaveLength(2);
        });
    });
});
