import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContainerHelpers, CommandRegistration, QueryRegistration } from '../ContainerHelpers.js';
import type { Container, Command, Query, CommandHandler, QueryHandler } from '@stratix/core';

// Mock container
class MockContainer implements Container {
    private services = new Map<string, { factory: (context: any) => any; options: any }>();

    register(name: string, factory: (context: any) => any, options?: any): void {
        this.services.set(name, { factory, options });
    }

    resolve<T>(name: string): T {
        const service = this.services.get(name);
        if (!service) {
            throw new Error(`Service ${name} not found`);
        }
        return service.factory(this) as T;
    }

    has(name: string): boolean {
        return this.services.has(name);
    }

    createScope(): Container {
        return this;
    }

    dispose(): Promise<void> {
        return Promise.resolve();
    }

    singleton<T>(_token: string, _value: T | (() => T)): void { }
    scoped<T>(_token: string, _factory: () => T): void { }
    transient<T>(_token: string, _factory: () => T): void { }
    registerClass<T>(_classType: new (...args: unknown[]) => T, _options?: any): void { }
    registerAll(_services: Record<string, unknown>): void { }
    tryResolve<T>(_token: string): T | undefined {
        return undefined;
    }

    // Helper for tests
    getRegistration(name: string) {
        return this.services.get(name);
    }
}

// Test fixtures
class TestCommand implements Command { }
class AnotherCommand implements Command { }

class TestQuery implements Query { }
class AnotherQuery implements Query { }

const testCommandHandler: CommandHandler<TestCommand, void> = {
    handle: async () => { },
};

const anotherCommandHandler: CommandHandler<AnotherCommand, void> = {
    handle: async () => { },
};

const testQueryHandler: QueryHandler<TestQuery, string> = {
    handle: async () => 'result',
};

const anotherQueryHandler: QueryHandler<AnotherQuery, number> = {
    handle: async () => 42,
};

describe('ContainerHelpers', () => {
    let container: MockContainer;

    beforeEach(() => {
        container = new MockContainer();
    });

    describe('registerDefaults', () => {
        it('should register default services with in-memory buses', () => {
            // This will throw because we don't have actual bus implementations
            // but we can verify the registration attempt
            expect(() => {
                ContainerHelpers.registerDefaults(container, {
                    useInMemoryBuses: true,
                });
            }).not.toThrow();

            expect(container.has('commandBus')).toBe(true);
            expect(container.has('queryBus')).toBe(true);
            expect(container.has('eventBus')).toBe(true);
        });

        it('should register custom logger', () => {
            const customLogger = { log: vi.fn() };

            ContainerHelpers.registerDefaults(container, {
                useInMemoryBuses: false,
                logger: customLogger,
            });

            expect(container.has('logger')).toBe(true);
            const logger = container.resolve('logger');
            expect(logger).toBe(customLogger);
        });

        it('should not register buses when useInMemoryBuses is false', () => {
            ContainerHelpers.registerDefaults(container, {
                useInMemoryBuses: false,
            });

            expect(container.has('commandBus')).toBe(false);
            expect(container.has('queryBus')).toBe(false);
            expect(container.has('eventBus')).toBe(false);
        });
    });

    describe('registerCommands', () => {
        it('should register single command', () => {
            const mockBus = {
                register: vi.fn(),
            };

            const registrations: CommandRegistration[] = [
                {
                    commandType: TestCommand,
                    handler: testCommandHandler,
                },
            ];

            ContainerHelpers.registerCommands(container, mockBus, registrations);

            expect(container.has('commandHandler:TestCommand')).toBe(true);
            expect(mockBus.register).toHaveBeenCalledWith(
                TestCommand,
                expect.any(Object)
            );
        });

        it('should register multiple commands', () => {
            const mockBus = {
                register: vi.fn(),
            };

            const registrations: CommandRegistration[] = [
                {
                    commandType: TestCommand,
                    handler: testCommandHandler,
                },
                {
                    commandType: AnotherCommand,
                    handler: anotherCommandHandler,
                },
            ];

            ContainerHelpers.registerCommands(container, mockBus, registrations);

            expect(container.has('commandHandler:TestCommand')).toBe(true);
            expect(container.has('commandHandler:AnotherCommand')).toBe(true);
            expect(mockBus.register).toHaveBeenCalledTimes(2);
        });

        it('should support handler factory functions', () => {
            const mockBus = {
                register: vi.fn(),
            };

            const handlerFactory = () => testCommandHandler;

            const registrations: CommandRegistration[] = [
                {
                    commandType: TestCommand,
                    handler: handlerFactory,
                },
            ];

            ContainerHelpers.registerCommands(container, mockBus, registrations);

            expect(container.has('commandHandler:TestCommand')).toBe(true);
        });
    });

    describe('registerQueries', () => {
        it('should register single query', () => {
            const mockBus = {
                register: vi.fn(),
            };

            const registrations: QueryRegistration[] = [
                {
                    queryType: TestQuery,
                    handler: testQueryHandler,
                },
            ];

            ContainerHelpers.registerQueries(container, mockBus, registrations);

            expect(container.has('queryHandler:TestQuery')).toBe(true);
            expect(mockBus.register).toHaveBeenCalledWith(TestQuery, expect.any(Object));
        });

        it('should register multiple queries', () => {
            const mockBus = {
                register: vi.fn(),
            };

            const registrations: QueryRegistration[] = [
                {
                    queryType: TestQuery,
                    handler: testQueryHandler,
                },
                {
                    queryType: AnotherQuery,
                    handler: anotherQueryHandler,
                },
            ];

            ContainerHelpers.registerQueries(container, mockBus, registrations);

            expect(container.has('queryHandler:TestQuery')).toBe(true);
            expect(container.has('queryHandler:AnotherQuery')).toBe(true);
            expect(mockBus.register).toHaveBeenCalledTimes(2);
        });

        it('should support handler factory functions', () => {
            const mockBus = {
                register: vi.fn(),
            };

            const handlerFactory = () => testQueryHandler;

            const registrations: QueryRegistration[] = [
                {
                    queryType: TestQuery,
                    handler: handlerFactory,
                },
            ];

            ContainerHelpers.registerQueries(container, mockBus, registrations);

            expect(container.has('queryHandler:TestQuery')).toBe(true);
        });
    });

    describe('registerRepository', () => {
        it('should register repository as singleton by default', () => {
            const repo = { findById: vi.fn() };

            ContainerHelpers.registerRepository(container, 'productRepository', repo);

            expect(container.has('productRepository')).toBe(true);
            const registration = container.getRegistration('productRepository');
            expect(registration?.options.lifetime).toBe('SINGLETON');
        });

        it('should register repository as transient when specified', () => {
            const repo = { findById: vi.fn() };

            ContainerHelpers.registerRepository(container, 'productRepository', repo, {
                singleton: false,
            });

            const registration = container.getRegistration('productRepository');
            expect(registration?.options.lifetime).toBe('TRANSIENT');
        });

        it('should support repository factory functions', () => {
            const repoFactory = () => ({ findById: vi.fn() });

            ContainerHelpers.registerRepository(
                container,
                'productRepository',
                repoFactory
            );

            expect(container.has('productRepository')).toBe(true);
            const repo = container.resolve<{ findById: any }>('productRepository');
            expect(repo).toBeDefined();
            expect(repo.findById).toBeDefined();
        });
    });

    describe('registerRepositories', () => {
        it('should register multiple repositories', () => {
            const repos = {
                productRepository: { findById: vi.fn() },
                userRepository: { findById: vi.fn() },
                orderRepository: { findById: vi.fn() },
            };

            ContainerHelpers.registerRepositories(container, repos);

            expect(container.has('productRepository')).toBe(true);
            expect(container.has('userRepository')).toBe(true);
            expect(container.has('orderRepository')).toBe(true);
        });

        it('should apply default options to all repositories', () => {
            const repos = {
                productRepository: { findById: vi.fn() },
                userRepository: { findById: vi.fn() },
            };

            ContainerHelpers.registerRepositories(container, repos, {
                singleton: false,
            });

            const productReg = container.getRegistration('productRepository');
            const userReg = container.getRegistration('userRepository');

            expect(productReg?.options.lifetime).toBe('TRANSIENT');
            expect(userReg?.options.lifetime).toBe('TRANSIENT');
        });

        it('should support factory functions in bulk registration', () => {
            const repos = {
                productRepository: () => ({ findById: vi.fn() }),
                userRepository: () => ({ findById: vi.fn() }),
            };

            ContainerHelpers.registerRepositories(container, repos);

            const productRepo = container.resolve<{ findById: any }>('productRepository');
            const userRepo = container.resolve<{ findById: any }>('userRepository');

            expect(productRepo.findById).toBeDefined();
            expect(userRepo.findById).toBeDefined();
        });
    });

    describe('integration scenarios', () => {
        it('should support complete application setup', () => {
            const mockCommandBus = { register: vi.fn() };
            const mockQueryBus = { register: vi.fn() };
            const customLogger = { log: vi.fn() };

            // Register defaults
            ContainerHelpers.registerDefaults(container, {
                useInMemoryBuses: false,
                logger: customLogger,
            });

            // Register repositories
            ContainerHelpers.registerRepositories(container, {
                productRepository: { findById: vi.fn() },
                userRepository: { findById: vi.fn() },
            });

            // Register commands
            ContainerHelpers.registerCommands(container, mockCommandBus, [
                { commandType: TestCommand, handler: testCommandHandler },
            ]);

            // Register queries
            ContainerHelpers.registerQueries(container, mockQueryBus, [
                { queryType: TestQuery, handler: testQueryHandler },
            ]);

            // Verify everything is registered
            expect(container.has('logger')).toBe(true);
            expect(container.has('productRepository')).toBe(true);
            expect(container.has('userRepository')).toBe(true);
            expect(container.has('commandHandler:TestCommand')).toBe(true);
            expect(container.has('queryHandler:TestQuery')).toBe(true);
        });
    });
});
