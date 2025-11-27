import { BaseContext } from './BaseContext.js';
import type {
    ContextCommandDefinition,
    ContextQueryDefinition,
    ContextEventHandlerDefinition,
    ContextRepositoryDefinition,
    ContextMetadata,
} from '@stratix/core';

/**
 * Options for creating a simple context.
 */
export interface SimpleContextOptions {
    /**
     * Context description (optional).
     */
    description?: string;

    /**
     * Required plugins for this context.
     */
    requiredPlugins?: string[];

    /**
     * Required other contexts for this context.
     */
    requiredContexts?: string[];

    /**
     * Command definitions.
     */
    commands?: ContextCommandDefinition[];

    /**
     * Query definitions.
     */
    queries?: ContextQueryDefinition[];

    /**
     * Event handler definitions.
     */
    eventHandlers?: ContextEventHandlerDefinition[];

    /**
     * Repository definitions.
     */
    repositories?: ContextRepositoryDefinition[];
}

/**
 * Helpers for creating contexts with minimal boilerplate.
 *
 * @example
 * ```typescript
 * const productsContext = ContextHelpers.createSimpleContext('Products', {
 *   description: 'Products domain logic',
 *   commands: [
 *     {
 *       name: 'CreateProduct',
 *       commandType: CreateProductCommand,
 *       handler: new CreateProductHandler(repo)
 *     }
 *   ],
 *   queries: [
 *     {
 *       name: 'GetProductById',
 *       queryType: GetProductByIdQuery,
 *       handler: new GetProductByIdHandler(repo)
 *     }
 *   ],
 *   repositories: [
 *     {
 *       token: 'productRepository',
 *       instance: new InMemoryProductRepository(),
 *       singleton: true
 *     }
 *   ]
 * });
 * ```
 */
export class ContextHelpers {
    /**
     * Creates a simple context with minimal boilerplate.
     *
     * This helper eliminates the need to create a new class for simple contexts.
     * Just provide the context name and definitions, and you get a fully functional context.
     *
     * @param name - The name of the context (e.g., 'Products', 'Orders')
     * @param options - Context configuration options
     * @returns A new context instance
     *
     * @example
     * ```typescript
     * // Before: Manual class creation
     * class ProductsContext extends BaseContext {
     *   readonly metadata = { name: 'products-context', ... };
     *   readonly name = 'Products';
     *   getCommands() { return [...]; }
     *   getQueries() { return [...]; }
     *   // etc...
     * }
     *
     * // After: One-liner with ContextHelpers
     * const productsContext = ContextHelpers.createSimpleContext('Products', {
     *   commands: [...],
     *   queries: [...]
     * });
     * ```
     */
    static createSimpleContext(
        name: string,
        options: SimpleContextOptions = {}
    ): BaseContext {
        const {
            description = `${name} domain context`,
            requiredPlugins = [],
            requiredContexts = [],
            commands = [],
            queries = [],
            eventHandlers = [],
            repositories = [],
        } = options;

        // Create anonymous class that extends BaseContext
        return new (class extends BaseContext {
            readonly metadata: ContextMetadata = {
                name: `${name.toLowerCase()}-context`,
                description,
                version: '1.0.0',
                requiredPlugins,
                requiredContexts,
            };

            readonly name = name;

            getCommands(): ContextCommandDefinition[] {
                return commands;
            }

            getQueries(): ContextQueryDefinition[] {
                return queries;
            }

            getEventHandlers(): ContextEventHandlerDefinition[] {
                return eventHandlers;
            }

            getRepositories(): ContextRepositoryDefinition[] {
                return repositories;
            }
        })();
    }

    /**
     * Creates a context with only repositories (useful for shared data contexts).
     *
     * @param name - The name of the context
     * @param repositories - Repository definitions
     * @param description - Optional context description
     * @returns A new context with only repositories
     *
     * @example
     * ```typescript
     * const sharedDataContext = ContextHelpers.createRepositoryContext('SharedData', [
     *   {
     *     token: 'userRepository',
     *     instance: new InMemoryUserRepository(),
     *     singleton: true
     *   },
     *   {
     *     token: 'settingsRepository',
     *     instance: new InMemorySettingsRepository(),
     *     singleton: true
     *   }
     * ]);
     * ```
     */
    static createRepositoryContext(
        name: string,
        repositories: ContextRepositoryDefinition[],
        description?: string
    ): BaseContext {
        return ContextHelpers.createSimpleContext(name, {
            description: description ?? `${name} repositories`,
            repositories,
        });
    }

    /**
     * Creates a read-only context with only queries (useful for reporting/analytics).
     *
     * @param name - The name of the context
     * @param queries - Query definitions
     * @param repositories - Optional repository definitions
     * @param description - Optional context description
     * @returns A new read-only context
     *
     * @example
     * ```typescript
     * const analyticsContext = ContextHelpers.createReadOnlyContext('Analytics', [
     *   {
     *     name: 'GetSalesReport',
     *     queryType: GetSalesReportQuery,
     *     handler: new GetSalesReportHandler(repo)
     *   },
     *   {
     *     name: 'GetUserMetrics',
     *     queryType: GetUserMetricsQuery,
     *     handler: new GetUserMetricsHandler(repo)
     *   }
     * ]);
     * ```
     */
    static createReadOnlyContext(
        name: string,
        queries: ContextQueryDefinition[],
        repositories?: ContextRepositoryDefinition[],
        description?: string
    ): BaseContext {
        return ContextHelpers.createSimpleContext(name, {
            description: description ?? `${name} read-only context`,
            queries,
            repositories: repositories ?? [],
        });
    }
}
