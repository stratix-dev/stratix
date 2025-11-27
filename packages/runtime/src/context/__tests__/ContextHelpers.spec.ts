import { describe, it, expect } from 'vitest';
import { ContextHelpers } from '../ContextHelpers.js';
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

describe('ContextHelpers', () => {
    describe('createSimpleContext', () => {
        it('should create context with basic metadata', () => {
            const context = ContextHelpers.createSimpleContext('Products');

            expect(context.metadata.name).toBe('products-context');
            expect(context.metadata.description).toBe('Products domain context');
            expect(context.name).toBe('Products');
        });

        it('should create context with custom description', () => {
            const context = ContextHelpers.createSimpleContext('Orders', {
                description: 'Custom orders context',
            });

            expect(context.metadata.description).toBe('Custom orders context');
        });

        it('should create context with required plugins', () => {
            const context = ContextHelpers.createSimpleContext('Products', {
                requiredPlugins: ['postgres', 'redis'],
            });

            expect(context.metadata.requiredPlugins).toEqual(['postgres', 'redis']);
        });

        it('should create context with required contexts', () => {
            const context = ContextHelpers.createSimpleContext('Orders', {
                requiredContexts: ['products-context', 'users-context'],
            });

            expect(context.metadata.requiredContexts).toEqual([
                'products-context',
                'users-context',
            ]);
        });

        it('should create context with commands', () => {
            const commandDef = {
                name: 'TestCommand',
                commandType: TestCommand,
                handler: testCommandHandler,
            };

            const context = ContextHelpers.createSimpleContext('Products', {
                commands: [commandDef],
            });

            const commands = context.getCommands();
            expect(commands).toHaveLength(1);
            expect(commands[0]).toBe(commandDef);
        });

        it('should create context with queries', () => {
            const queryDef = {
                name: 'TestQuery',
                queryType: TestQuery,
                handler: testQueryHandler,
            };

            const context = ContextHelpers.createSimpleContext('Products', {
                queries: [queryDef],
            });

            const queries = context.getQueries();
            expect(queries).toHaveLength(1);
            expect(queries[0]).toBe(queryDef);
        });

        it('should create context with event handlers', () => {
            const eventDef = {
                eventName: 'TestEvent',
                eventType: TestEvent,
                handler: testEventHandler,
            };

            const context = ContextHelpers.createSimpleContext('Products', {
                eventHandlers: [eventDef],
            });

            const handlers = context.getEventHandlers();
            expect(handlers).toHaveLength(1);
            expect(handlers[0]).toBe(eventDef);
        });

        it('should create context with repositories', () => {
            const repoDef = {
                token: 'productRepository',
                instance: { save: async () => { } },
                singleton: true,
            };

            const context = ContextHelpers.createSimpleContext('Products', {
                repositories: [repoDef],
            });

            const repos = context.getRepositories();
            expect(repos).toHaveLength(1);
            expect(repos[0]).toBe(repoDef);
        });

        it('should create context with all definitions', () => {
            const context = ContextHelpers.createSimpleContext('Products', {
                description: 'Full products context',
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

            expect(context.metadata.description).toBe('Full products context');
            expect(context.getCommands()).toHaveLength(1);
            expect(context.getQueries()).toHaveLength(1);
            expect(context.getEventHandlers()).toHaveLength(1);
            expect(context.getRepositories()).toHaveLength(1);
        });

        it('should return empty arrays for undefined options', () => {
            const context = ContextHelpers.createSimpleContext('Minimal');

            expect(context.getCommands()).toEqual([]);
            expect(context.getQueries()).toEqual([]);
            expect(context.getEventHandlers()).toEqual([]);
            expect(context.getRepositories()).toEqual([]);
        });
    });

    describe('createRepositoryContext', () => {
        it('should create context with only repositories', () => {
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

            const context = ContextHelpers.createRepositoryContext('SharedData', repos);

            expect(context.name).toBe('SharedData');
            expect(context.metadata.name).toBe('shareddata-context');
            expect(context.metadata.description).toBe('SharedData repositories');
            expect(context.getRepositories()).toEqual(repos);
            expect(context.getCommands()).toEqual([]);
            expect(context.getQueries()).toEqual([]);
        });

        it('should accept custom description', () => {
            const repos = [
                {
                    token: 'repo1',
                    instance: {},
                    singleton: true,
                },
            ];

            const context = ContextHelpers.createRepositoryContext(
                'Data',
                repos,
                'Custom data repositories'
            );

            expect(context.metadata.description).toBe('Custom data repositories');
        });
    });

    describe('createReadOnlyContext', () => {
        it('should create context with only queries', () => {
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

            const context = ContextHelpers.createReadOnlyContext('Analytics', queries);

            expect(context.name).toBe('Analytics');
            expect(context.metadata.name).toBe('analytics-context');
            expect(context.metadata.description).toBe('Analytics read-only context');
            expect(context.getQueries()).toEqual(queries);
            expect(context.getCommands()).toEqual([]);
            expect(context.getEventHandlers()).toEqual([]);
            expect(context.getRepositories()).toEqual([]);
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

            const context = ContextHelpers.createReadOnlyContext(
                'Reporting',
                queries,
                repos
            );

            expect(context.getQueries()).toEqual(queries);
            expect(context.getRepositories()).toEqual(repos);
        });

        it('should accept custom description', () => {
            const queries = [
                {
                    name: 'GetData',
                    queryType: TestQuery,
                    handler: testQueryHandler,
                },
            ];

            const context = ContextHelpers.createReadOnlyContext(
                'ReadOnly',
                queries,
                undefined,
                'Custom read-only context'
            );

            expect(context.metadata.description).toBe('Custom read-only context');
        });
    });

    describe('context behavior', () => {
        it('should create functional context that can be initialized', () => {
            const context = ContextHelpers.createSimpleContext('Test', {
                commands: [
                    {
                        name: 'TestCmd',
                        commandType: TestCommand,
                        handler: testCommandHandler,
                    },
                ],
            });

            // Context should have all required methods
            expect(context.initialize).toBeDefined();
            expect(context.start).toBeDefined();
            expect(context.stop).toBeDefined();
            expect(context.healthCheck).toBeDefined();
        });

        it('should maintain context identity', () => {
            const context1 = ContextHelpers.createSimpleContext('Products');
            const context2 = ContextHelpers.createSimpleContext('Products');

            // Different instances
            expect(context1).not.toBe(context2);

            // But same metadata
            expect(context1.metadata.name).toBe(context2.metadata.name);
            expect(context1.name).toBe(context2.name);
        });
    });
});
