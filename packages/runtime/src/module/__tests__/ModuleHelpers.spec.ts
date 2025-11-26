import { describe, it, expect } from 'vitest';
import { ModuleHelpers } from '../ModuleHelpers.js';
import type { Command, Query, Event, CommandHandler, QueryHandler, EventHandler } from '@stratix/core';

// Test fixtures
class TestCommand implements Command { }
class TestQuery implements Query { }
class TestEvent implements Event { }

const testCommandHandler: CommandHandler<TestCommand, void> = {
    handle: async () => { },
};

const testQueryHandler: QueryHandler<TestQuery, string> = {
    handle: async () => 'result',
};

const testEventHandler: EventHandler<TestEvent> = {
    handle: async () => { },
};

describe('ModuleHelpers', () => {
    describe('createSimpleModule', () => {
        it('should create module with basic metadata', () => {
            const module = ModuleHelpers.createSimpleModule('Products');

            expect(module.metadata.name).toBe('products-context');
            expect(module.metadata.description).toBe('Products domain module');
            expect(module.contextName).toBe('Products');
        });

        it('should create module with custom description', () => {
            const module = ModuleHelpers.createSimpleModule('Orders', {
                description: 'Custom orders module',
            });

            expect(module.metadata.description).toBe('Custom orders module');
        });

        it('should create module with required plugins', () => {
            const module = ModuleHelpers.createSimpleModule('Products', {
                requiredPlugins: ['postgres', 'redis'],
            });

            expect(module.metadata.requiredPlugins).toEqual(['postgres', 'redis']);
        });

        it('should create module with required modules', () => {
            const module = ModuleHelpers.createSimpleModule('Orders', {
                requiredModules: ['products-context', 'users-context'],
            });

            expect(module.metadata.requiredModules).toEqual([
                'products-context',
                'users-context',
            ]);
        });

        it('should create module with commands', () => {
            const commandDef = {
                name: 'TestCommand',
                commandType: TestCommand,
                handler: testCommandHandler,
            };

            const module = ModuleHelpers.createSimpleModule('Products', {
                commands: [commandDef],
            });

            const commands = module.getCommands();
            expect(commands).toHaveLength(1);
            expect(commands[0]).toBe(commandDef);
        });

        it('should create module with queries', () => {
            const queryDef = {
                name: 'TestQuery',
                queryType: TestQuery,
                handler: testQueryHandler,
            };

            const module = ModuleHelpers.createSimpleModule('Products', {
                queries: [queryDef],
            });

            const queries = module.getQueries();
            expect(queries).toHaveLength(1);
            expect(queries[0]).toBe(queryDef);
        });

        it('should create module with event handlers', () => {
            const eventDef = {
                eventName: 'TestEvent',
                eventType: TestEvent,
                handler: testEventHandler,
            };

            const module = ModuleHelpers.createSimpleModule('Products', {
                eventHandlers: [eventDef],
            });

            const handlers = module.getEventHandlers();
            expect(handlers).toHaveLength(1);
            expect(handlers[0]).toBe(eventDef);
        });

        it('should create module with repositories', () => {
            const repoDef = {
                token: 'productRepository',
                instance: { save: async () => { } },
                singleton: true,
            };

            const module = ModuleHelpers.createSimpleModule('Products', {
                repositories: [repoDef],
            });

            const repos = module.getRepositories();
            expect(repos).toHaveLength(1);
            expect(repos[0]).toBe(repoDef);
        });

        it('should create module with all definitions', () => {
            const module = ModuleHelpers.createSimpleModule('Products', {
                description: 'Full products module',
                requiredPlugins: ['postgres'],
                commands: [
                    {
                        name: 'CreateProduct',
                        commandType: TestCommand,
                        handler: testCommandHandler,
                    },
                ],
                queries: [
                    {
                        name: 'GetProduct',
                        queryType: TestQuery,
                        handler: testQueryHandler,
                    },
                ],
                eventHandlers: [
                    {
                        eventName: 'ProductCreated',
                        eventType: TestEvent,
                        handler: testEventHandler,
                    },
                ],
                repositories: [
                    {
                        token: 'productRepo',
                        instance: {},
                        singleton: true,
                    },
                ],
            });

            expect(module.metadata.description).toBe('Full products module');
            expect(module.getCommands()).toHaveLength(1);
            expect(module.getQueries()).toHaveLength(1);
            expect(module.getEventHandlers()).toHaveLength(1);
            expect(module.getRepositories()).toHaveLength(1);
        });

        it('should return empty arrays for undefined options', () => {
            const module = ModuleHelpers.createSimpleModule('Minimal');

            expect(module.getCommands()).toEqual([]);
            expect(module.getQueries()).toEqual([]);
            expect(module.getEventHandlers()).toEqual([]);
            expect(module.getRepositories()).toEqual([]);
        });
    });

    describe('createRepositoryModule', () => {
        it('should create module with only repositories', () => {
            const repos = [
                {
                    token: 'userRepository',
                    instance: { save: async () => { } },
                    singleton: true,
                },
                {
                    token: 'settingsRepository',
                    instance: { save: async () => { } },
                    singleton: true,
                },
            ];

            const module = ModuleHelpers.createRepositoryModule('SharedData', repos);

            expect(module.contextName).toBe('SharedData');
            expect(module.metadata.name).toBe('shareddata-context');
            expect(module.metadata.description).toBe('SharedData repositories');
            expect(module.getRepositories()).toEqual(repos);
            expect(module.getCommands()).toEqual([]);
            expect(module.getQueries()).toEqual([]);
        });

        it('should accept custom description', () => {
            const repos = [
                {
                    token: 'repo1',
                    instance: {},
                    singleton: true,
                },
            ];

            const module = ModuleHelpers.createRepositoryModule(
                'Data',
                repos,
                'Custom data repositories'
            );

            expect(module.metadata.description).toBe('Custom data repositories');
        });
    });

    describe('createReadOnlyModule', () => {
        it('should create module with only queries', () => {
            const queries = [
                {
                    name: 'GetSalesReport',
                    queryType: TestQuery,
                    handler: testQueryHandler,
                },
                {
                    name: 'GetMetrics',
                    queryType: TestQuery,
                    handler: testQueryHandler,
                },
            ];

            const module = ModuleHelpers.createReadOnlyModule('Analytics', queries);

            expect(module.contextName).toBe('Analytics');
            expect(module.metadata.name).toBe('analytics-context');
            expect(module.metadata.description).toBe('Analytics read-only module');
            expect(module.getQueries()).toEqual(queries);
            expect(module.getCommands()).toEqual([]);
            expect(module.getEventHandlers()).toEqual([]);
            expect(module.getRepositories()).toEqual([]);
        });

        it('should accept repositories', () => {
            const queries = [
                {
                    name: 'GetReport',
                    queryType: TestQuery,
                    handler: testQueryHandler,
                },
            ];

            const repos = [
                {
                    token: 'analyticsRepo',
                    instance: {},
                    singleton: true,
                },
            ];

            const module = ModuleHelpers.createReadOnlyModule(
                'Reporting',
                queries,
                repos
            );

            expect(module.getQueries()).toEqual(queries);
            expect(module.getRepositories()).toEqual(repos);
        });

        it('should accept custom description', () => {
            const queries = [
                {
                    name: 'GetData',
                    queryType: TestQuery,
                    handler: testQueryHandler,
                },
            ];

            const module = ModuleHelpers.createReadOnlyModule(
                'ReadOnly',
                queries,
                undefined,
                'Custom read-only module'
            );

            expect(module.metadata.description).toBe('Custom read-only module');
        });
    });

    describe('module behavior', () => {
        it('should create functional module that can be initialized', () => {
            const module = ModuleHelpers.createSimpleModule('Test', {
                commands: [
                    {
                        name: 'TestCmd',
                        commandType: TestCommand,
                        handler: testCommandHandler,
                    },
                ],
            });

            // Module should have all required methods
            expect(module.initialize).toBeDefined();
            expect(module.start).toBeDefined();
            expect(module.stop).toBeDefined();
            expect(module.healthCheck).toBeDefined();
        });

        it('should maintain module identity', () => {
            const module1 = ModuleHelpers.createSimpleModule('Products');
            const module2 = ModuleHelpers.createSimpleModule('Products');

            // Different instances
            expect(module1).not.toBe(module2);

            // But same metadata
            expect(module1.metadata.name).toBe(module2.metadata.name);
            expect(module1.contextName).toBe(module2.contextName);
        });
    });
});
