import { BaseContextModule } from './BaseContextModule.js';
import type {
    CommandDefinition,
    QueryDefinition,
    EventHandlerDefinition,
    RepositoryDefinition,
    ModuleMetadata,
} from '@stratix/core';

/**
 * Options for creating a simple module.
 */
export interface SimpleModuleOptions {
    /**
     * Module description (optional).
     */
    description?: string;

    /**
     * Required plugins for this module.
     */
    requiredPlugins?: string[];

    /**
     * Required other modules for this module.
     */
    requiredModules?: string[];

    /**
     * Command definitions.
     */
    commands?: CommandDefinition[];

    /**
     * Query definitions.
     */
    queries?: QueryDefinition[];

    /**
     * Event handler definitions.
     */
    eventHandlers?: EventHandlerDefinition[];

    /**
     * Repository definitions.
     */
    repositories?: RepositoryDefinition[];
}

/**
 * Helpers for creating modules with minimal boilerplate.
 *
 * @example
 * ```typescript
 * const productsModule = ModuleHelpers.createSimpleModule('Products', {
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
export class ModuleHelpers {
    /**
     * Creates a simple module with minimal boilerplate.
     *
     * This helper eliminates the need to create a new class for simple modules.
     * Just provide the module name and definitions, and you get a fully functional module.
     *
     * @param contextName - The name of the domain context (e.g., 'Products', 'Orders')
     * @param options - Module configuration options
     * @returns A new module instance
     *
     * @example
     * ```typescript
     * // Before: Manual class creation
     * class ProductsModule extends BaseContextModule {
     *   readonly metadata = { name: 'products-context', ... };
     *   readonly contextName = 'Products';
     *   getCommands() { return [...]; }
     *   getQueries() { return [...]; }
     *   // etc...
     * }
     *
     * // After: One-liner with ModuleHelpers
     * const productsModule = ModuleHelpers.createSimpleModule('Products', {
     *   commands: [...],
     *   queries: [...]
     * });
     * ```
     */
    static createSimpleModule(
        contextName: string,
        options: SimpleModuleOptions = {}
    ): BaseContextModule {
        const {
            description = `${contextName} domain module`,
            requiredPlugins = [],
            requiredModules = [],
            commands = [],
            queries = [],
            eventHandlers = [],
            repositories = [],
        } = options;

        // Create anonymous class that extends BaseContextModule
        return new (class extends BaseContextModule {
            readonly metadata: ModuleMetadata = {
                name: `${contextName.toLowerCase()}-context`,
                description,
                version: '1.0.0',
                requiredPlugins,
                requiredModules,
            };

            readonly contextName = contextName;

            getCommands(): CommandDefinition[] {
                return commands;
            }

            getQueries(): QueryDefinition[] {
                return queries;
            }

            getEventHandlers(): EventHandlerDefinition[] {
                return eventHandlers;
            }

            getRepositories(): RepositoryDefinition[] {
                return repositories;
            }
        })();
    }

    /**
     * Creates a module with only repositories (useful for shared data modules).
     *
     * @param contextName - The name of the domain context
     * @param repositories - Repository definitions
     * @param description - Optional module description
     * @returns A new module with only repositories
     *
     * @example
     * ```typescript
     * const sharedDataModule = ModuleHelpers.createRepositoryModule('SharedData', [
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
    static createRepositoryModule(
        contextName: string,
        repositories: RepositoryDefinition[],
        description?: string
    ): BaseContextModule {
        return ModuleHelpers.createSimpleModule(contextName, {
            description: description ?? `${contextName} repositories`,
            repositories,
        });
    }

    /**
     * Creates a read-only module with only queries (useful for reporting/analytics).
     *
     * @param contextName - The name of the domain context
     * @param queries - Query definitions
     * @param repositories - Optional repository definitions
     * @param description - Optional module description
     * @returns A new read-only module
     *
     * @example
     * ```typescript
     * const analyticsModule = ModuleHelpers.createReadOnlyModule('Analytics', [
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
    static createReadOnlyModule(
        contextName: string,
        queries: QueryDefinition[],
        repositories?: RepositoryDefinition[],
        description?: string
    ): BaseContextModule {
        return ModuleHelpers.createSimpleModule(contextName, {
            description: description ?? `${contextName} read-only module`,
            queries,
            repositories: repositories ?? [],
        });
    }
}
