import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContainerHelpers, CommandRegistration, QueryRegistration } from '../ContainerHelpers.js';
import type { Command, Query, CommandHandler, QueryHandler } from '@stratix/core';
import { createContainer, type AwilixContainer } from '../../di/awilix.js';

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
    let container: AwilixContainer;

    beforeEach(() => {
        container = createContainer();
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

            expect(container.hasRegistration('commandBus')).toBe(true);
            expect(container.hasRegistration('queryBus')).toBe(true);
            expect(container.hasRegistration('eventBus')).toBe(true);
        });

        it('should register custom logger', () => {
            const customLogger = { log: vi.fn() };

            ContainerHelpers.registerDefaults(container, {
                useInMemoryBuses: false,
                logger: customLogger,
            });

            expect(container.hasRegistration('logger')).toBe(true);
            const logger = container.resolve('logger');
            expect(logger).toBe(customLogger);
        });

        it('should not register buses when useInMemoryBuses is false', () => {
            ContainerHelpers.registerDefaults(container, {
                useInMemoryBuses: false,
            });

            expect(container.hasRegistration('commandBus')).toBe(false);
            expect(container.hasRegistration('queryBus')).toBe(false);
            expect(container.hasRegistration('eventBus')).toBe(false);
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

            expect(container.hasRegistration('commandHandler:TestCommand')).toBe(true);
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

            expect(container.hasRegistration('commandHandler:TestCommand')).toBe(true);
            expect(container.hasRegistration('commandHandler:AnotherCommand')).toBe(true);
            expect(mockBus.register).toHaveBeenCalledTimes(2);
        });

        it('should support handler classes', () => {
            const mockBus = {
                register: vi.fn(),
            };

            // Create a handler class for auto-wiring
            class TestCommandHandler implements CommandHandler<TestCommand, void> {
                async handle(): Promise<void> { }
            }

            const registrations: CommandRegistration[] = [
                {
                    commandType: TestCommand,
                    handler: TestCommandHandler,
                },
            ];

            ContainerHelpers.registerCommands(container, mockBus, registrations);

            expect(container.hasRegistration('commandHandler:TestCommand')).toBe(true);
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

            expect(container.hasRegistration('queryHandler:TestQuery')).toBe(true);
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

            expect(container.hasRegistration('queryHandler:TestQuery')).toBe(true);
            expect(container.hasRegistration('queryHandler:AnotherQuery')).toBe(true);
            expect(mockBus.register).toHaveBeenCalledTimes(2);
        });

        it('should support handler classes', () => {
            const mockBus = {
                register: vi.fn(),
            };

            // Create a handler class for auto-wiring
            class TestQueryHandler implements QueryHandler<TestQuery, string> {
                async handle(): Promise<string> {
                    return 'result';
                }
            }

            const registrations: QueryRegistration[] = [
                {
                    queryType: TestQuery,
                    handler: TestQueryHandler,
                },
            ];

            ContainerHelpers.registerQueries(container, mockBus, registrations);

            expect(container.hasRegistration('queryHandler:TestQuery')).toBe(true);
        });
    });

    describe('registerRepository', () => {
        it('should register repository as singleton by default', () => {
            const repo = { findById: vi.fn() };

            ContainerHelpers.registerRepository(container, 'productRepository', repo);

            expect(container.hasRegistration('productRepository')).toBe(true);

            // Verify singleton behavior - same instance
            const resolved1 = container.resolve('productRepository');
            const resolved2 = container.resolve('productRepository');
            expect(resolved1).toBe(resolved2);
        });

        it('should register repository as transient when specified', () => {
            // Use a factory so we can verify different instances
            const repoFactory = () => ({ findById: vi.fn() });

            ContainerHelpers.registerRepository(container, 'productRepository', repoFactory, {
                singleton: false,
            });

            // Verify transient behavior - different instances
            const resolved1 = container.resolve<any>('productRepository');
            const resolved2 = container.resolve<any>('productRepository');
            expect(resolved1).not.toBe(resolved2);
        });

        it('should support repository factory functions', () => {
            const repoFactory = () => ({ findById: vi.fn() });

            ContainerHelpers.registerRepository(
                container,
                'productRepository',
                repoFactory
            );

            expect(container.hasRegistration('productRepository')).toBe(true);
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

            expect(container.hasRegistration('productRepository')).toBe(true);
            expect(container.hasRegistration('userRepository')).toBe(true);
            expect(container.hasRegistration('orderRepository')).toBe(true);
        });

        it('should apply default options to all repositories', () => {
            const repos = {
                productRepository: () => ({ findById: vi.fn() }),
                userRepository: () => ({ findById: vi.fn() }),
            };

            ContainerHelpers.registerRepositories(container, repos, {
                singleton: false,
            });

            // Verify transient behavior - different instances
            const productRepo1 = container.resolve('productRepository');
            const productRepo2 = container.resolve('productRepository');
            expect(productRepo1).not.toBe(productRepo2);

            const userRepo1 = container.resolve('userRepository');
            const userRepo2 = container.resolve('userRepository');
            expect(userRepo1).not.toBe(userRepo2);
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
            expect(container.hasRegistration('logger')).toBe(true);
            expect(container.hasRegistration('productRepository')).toBe(true);
            expect(container.hasRegistration('userRepository')).toBe(true);
            expect(container.hasRegistration('commandHandler:TestCommand')).toBe(true);
            expect(container.hasRegistration('queryHandler:TestQuery')).toBe(true);
        });
    });
});
