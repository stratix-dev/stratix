import type {
    Plugin,
    PluginContext,
    PluginMetadata,
    HealthCheckResult,
    Logger,
} from '@stratix/core';
import { HealthStatus } from '@stratix/core';
import { HTTPClient } from './HTTPClient.js';
import type { HTTPClientPluginConfig, HTTPClientConfig, HTTPClientOptions } from './types.js';

/**
 * Axios HTTP Client Plugin for Stratix
 *
 * Provides HTTP client functionality with support for:
 * - Multiple named clients
 * - Automatic retries with exponential backoff
 * - Circuit breaker pattern
 * - Request/response interceptors
 * - Comprehensive error handling
 * - Health checks
 *
 * @example
 * ```typescript
 * import { ApplicationBuilder } from '@stratix/runtime';
 * import { AxiosHTTPClientPlugin } from '@stratix/http-client';
 *
 * const app = await ApplicationBuilder.create()
 *   .usePlugin(new AxiosHTTPClientPlugin())
 *   .withConfig({
 *     'http-client': {
 *       default: {
 *         baseURL: 'https://api.example.com',
 *         timeout: 5000
 *       },
 *       clients: {
 *         payments: {
 *           baseURL: 'https://payments.example.com',
 *           timeout: 10000
 *         }
 *       },
 *       globalOptions: {
 *         retry: {
 *           enabled: true,
 *           maxRetries: 3
 *         }
 *       }
 *     }
 *   })
 *   .build();
 *
 * await app.start();
 *
 * // Use in services
 * const client = app.resolve<HTTPClient>('http:client');
 * const response = await client.get('/users');
 * ```
 */
export class AxiosHTTPClientPlugin implements Plugin {
    readonly metadata: PluginMetadata = {
        name: 'http-client',
        version: '0.1.0',
        description: 'HTTP client plugin using Axios with retry, circuit breaker, and interceptors',
        dependencies: [],
    };

    private clients: Map<string, HTTPClient> = new Map();
    private config?: HTTPClientPluginConfig;
    private logger?: Logger;

    /**
     * Initialize the plugin
     */
    async initialize(context: PluginContext): Promise<void> {
        this.logger = context.logger;
        this.config = context.getConfig<HTTPClientPluginConfig>();

        // Validate configuration
        if (!this.config) {
            this.logger.warn('No HTTP client configuration provided, using defaults');
            this.config = {};
        }

        // Create default client if configured
        if (this.config.default) {
            const defaultClient = this.createClient(
                this.config.default,
                this.config.globalOptions
            );
            this.clients.set('default', defaultClient);
            context.container.register('http:client', () => defaultClient);
            this.logger.info('Default HTTP client created');
        }

        // Create named clients
        if (this.config.clients) {
            for (const [name, clientConfig] of Object.entries(this.config.clients)) {
                const client = this.createClient(clientConfig, this.config.globalOptions);
                this.clients.set(name, client);
                context.container.register(`http:client:${name}`, () => client);
                this.logger.info(`HTTP client '${name}' created`);
            }
        }

        // Register client factory
        context.container.register('http:clientFactory', () => {
            return (config: HTTPClientConfig, options?: HTTPClientOptions) => {
                return this.createClient(config, options || this.config?.globalOptions);
            };
        });

        this.logger.info('HTTP client plugin initialized', {
            defaultClient: !!this.config.default,
            namedClients: this.config.clients ? Object.keys(this.config.clients) : [],
        });
    }

    /**
     * Start the plugin
     */
    async start(): Promise<void> {
        this.logger?.info('HTTP client plugin started', {
            clientCount: this.clients.size,
        });
    }

    /**
     * Stop the plugin
     */
    async stop(): Promise<void> {
        // Clear all clients
        this.clients.clear();
        this.logger?.info('HTTP client plugin stopped');
    }

    /**
     * Perform health check
     */
    async healthCheck(): Promise<HealthCheckResult> {
        if (this.clients.size === 0) {
            return {
                status: HealthStatus.DOWN,
                message: 'No HTTP clients configured',
            };
        }

        const healthCheckEndpoints = this.config?.healthCheckEndpoints || [];

        if (healthCheckEndpoints.length === 0) {
            return {
                status: HealthStatus.UP,
                message: 'HTTP clients ready (no health check endpoints configured)',
                details: {
                    clientCount: this.clients.size,
                    clients: Array.from(this.clients.keys()),
                },
            };
        }

        // Perform health checks on configured endpoints
        const defaultClient = this.clients.get('default');
        if (!defaultClient) {
            return {
                status: HealthStatus.DOWN,
                message: 'Default client not available for health checks',
            };
        }

        const results: Record<string, { success: boolean; error?: string }> = {};

        for (const endpoint of healthCheckEndpoints) {
            try {
                await defaultClient.get(endpoint, { timeout: 5000 });
                results[endpoint] = { success: true };
            } catch (error) {
                results[endpoint] = {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        }

        const allSuccessful = Object.values(results).every((r) => r.success);

        return {
            status: allSuccessful ? HealthStatus.UP : HealthStatus.DOWN,
            message: allSuccessful
                ? 'All health check endpoints responded successfully'
                : 'Some health check endpoints failed',
            details: {
                clientCount: this.clients.size,
                healthChecks: results,
            },
        };
    }

    /**
     * Create HTTP client instance
     */
    private createClient(
        config: HTTPClientConfig,
        globalOptions?: HTTPClientOptions
    ): HTTPClient {
        // Merge global options with client-specific options
        const options: HTTPClientOptions = {
            ...globalOptions,
            logging: globalOptions?.logging,
            timing: globalOptions?.timing !== false,
            retry: globalOptions?.retry,
            circuitBreaker: globalOptions?.circuitBreaker,
            requestInterceptors: [
                ...(globalOptions?.requestInterceptors || []),
            ],
            responseInterceptors: [
                ...(globalOptions?.responseInterceptors || []),
            ],
        };

        return new HTTPClient(config, options);
    }

    /**
     * Get a specific client by name
     */
    getClient(name: string = 'default'): HTTPClient | undefined {
        return this.clients.get(name);
    }

    /**
     * Get all client names
     */
    getClientNames(): string[] {
        return Array.from(this.clients.keys());
    }
}
