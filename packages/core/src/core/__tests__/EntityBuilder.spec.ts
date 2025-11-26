import { describe, it, expect } from 'vitest';
import { EntityBuilder } from '../EntityBuilder.js';
import { Entity } from '../Entity.js';
import { EntityId } from '../EntityId.js';

// Test entity for testing purposes
interface TestProductProps {
    name: string;
    price: number;
    category: string;
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
}

describe('EntityBuilder', () => {
    describe('create', () => {
        it('should create a new EntityBuilder instance', () => {
            const builder = EntityBuilder.create<'Product', TestProductProps>();

            expect(builder).toBeInstanceOf(EntityBuilder);
        });
    });

    describe('withProps', () => {
        it('should set entity properties', () => {
            const props: TestProductProps = {
                name: 'Laptop',
                price: 999,
                category: 'Electronics',
            };

            const product = EntityBuilder.create<'Product', TestProductProps>()
                .withProps(props)
                .build(TestProduct);

            expect(product.name).toBe('Laptop');
            expect(product.price).toBe(999);
            expect(product.category).toBe('Electronics');
        });
    });

    describe('withId', () => {
        it('should accept EntityId', () => {
            const id = EntityId.create<'Product'>();
            const props: TestProductProps = {
                name: 'Mouse',
                price: 29,
                category: 'Accessories',
            };

            const product = EntityBuilder.create<'Product', TestProductProps>()
                .withId(id)
                .withProps(props)
                .build(TestProduct);

            expect(product.id.equals(id)).toBe(true);
        });

        it('should accept string ID', () => {
            const stringId = 'test-product-123';
            const props: TestProductProps = {
                name: 'Keyboard',
                price: 79,
                category: 'Accessories',
            };

            const product = EntityBuilder.create<'Product', TestProductProps>()
                .withId(stringId)
                .withProps(props)
                .build(TestProduct);

            expect(product.id.value).toBe(stringId);
        });

        it('should generate ID automatically if not provided', () => {
            const props: TestProductProps = {
                name: 'Monitor',
                price: 299,
                category: 'Electronics',
            };

            const product = EntityBuilder.create<'Product', TestProductProps>()
                .withProps(props)
                .build(TestProduct);

            expect(product.id).toBeDefined();
            expect(product.id.value).toBeTruthy();
        });
    });

    describe('withTimestamps', () => {
        it('should accept custom timestamps', () => {
            const createdAt = new Date('2024-01-01');
            const updatedAt = new Date('2024-01-15');
            const props: TestProductProps = {
                name: 'Tablet',
                price: 499,
                category: 'Electronics',
            };

            const product = EntityBuilder.create<'Product', TestProductProps>()
                .withProps(props)
                .withTimestamps(createdAt, updatedAt)
                .build(TestProduct);

            expect(product.createdAt).toEqual(createdAt);
            expect(product.updatedAt).toEqual(updatedAt);
        });

        it('should use current date if no timestamps provided', () => {
            const before = new Date();
            const props: TestProductProps = {
                name: 'Phone',
                price: 699,
                category: 'Electronics',
            };

            const product = EntityBuilder.create<'Product', TestProductProps>()
                .withProps(props)
                .build(TestProduct);

            const after = new Date();

            expect(product.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(product.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
            expect(product.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(product.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        it('should use current date for missing timestamps', () => {
            const createdAt = new Date('2024-01-01');
            const before = new Date();
            const props: TestProductProps = {
                name: 'Headphones',
                price: 149,
                category: 'Accessories',
            };

            const product = EntityBuilder.create<'Product', TestProductProps>()
                .withProps(props)
                .withTimestamps(createdAt)
                .build(TestProduct);

            const after = new Date();

            expect(product.createdAt).toEqual(createdAt);
            expect(product.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(product.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
        });
    });

    describe('build', () => {
        it('should throw error if props not set', () => {
            const builder = EntityBuilder.create<'Product', TestProductProps>();

            expect(() => builder.build(TestProduct)).toThrow(
                'Props are required. Call withProps() before build()'
            );
        });

        it('should build entity with all defaults', () => {
            const props: TestProductProps = {
                name: 'Camera',
                price: 599,
                category: 'Electronics',
            };

            const product = EntityBuilder.create<'Product', TestProductProps>()
                .withProps(props)
                .build(TestProduct);

            expect(product).toBeInstanceOf(TestProduct);
            expect(product).toBeInstanceOf(Entity);
            expect(product.name).toBe('Camera');
            expect(product.price).toBe(599);
            expect(product.category).toBe('Electronics');
            expect(product.id).toBeDefined();
            expect(product.createdAt).toBeDefined();
            expect(product.updatedAt).toBeDefined();
        });

        it('should support method chaining', () => {
            const props: TestProductProps = {
                name: 'Speaker',
                price: 199,
                category: 'Electronics',
            };

            const product = EntityBuilder.create<'Product', TestProductProps>()
                .withId('speaker-123')
                .withProps(props)
                .withTimestamps(new Date('2024-01-01'), new Date('2024-01-01'))
                .build(TestProduct);

            expect(product.id.value).toBe('speaker-123');
            expect(product.name).toBe('Speaker');
        });
    });

    describe('common use cases', () => {
        it('should create new entity for command handler', () => {
            // Simulating a create command handler
            const command = {
                name: 'New Product',
                price: 100,
                category: 'Test',
            };

            const product = EntityBuilder.create<'Product', TestProductProps>()
                .withProps({
                    name: command.name,
                    price: command.price,
                    category: command.category,
                })
                .build(TestProduct);

            expect(product.name).toBe(command.name);
            expect(product.id).toBeDefined();
        });

        it('should recreate entity from persistence', () => {
            // Simulating data from database
            const dbRow = {
                id: 'product-from-db',
                name: 'Persisted Product',
                price: 250,
                category: 'Database',
                created_at: new Date('2024-01-01'),
                updated_at: new Date('2024-01-15'),
            };

            const product = EntityBuilder.create<'Product', TestProductProps>()
                .withId(dbRow.id)
                .withProps({
                    name: dbRow.name,
                    price: dbRow.price,
                    category: dbRow.category,
                })
                .withTimestamps(dbRow.created_at, dbRow.updated_at)
                .build(TestProduct);

            expect(product.id.value).toBe(dbRow.id);
            expect(product.name).toBe(dbRow.name);
            expect(product.createdAt).toEqual(dbRow.created_at);
            expect(product.updatedAt).toEqual(dbRow.updated_at);
        });

        it('should create test entity with fixed data', () => {
            // Simulating test data creation
            const testId = 'test-product-123';
            const testDate = new Date('2024-01-01');

            const product = EntityBuilder.create<'Product', TestProductProps>()
                .withId(testId)
                .withProps({
                    name: 'Test Product',
                    price: 100,
                    category: 'Test',
                })
                .withTimestamps(testDate, testDate)
                .build(TestProduct);

            expect(product.id.value).toBe(testId);
            expect(product.createdAt).toEqual(testDate);
            expect(product.updatedAt).toEqual(testDate);
        });
    });
});
