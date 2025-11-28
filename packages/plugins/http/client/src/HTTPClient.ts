import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type {
    HTTPClientConfig,
    HTTPClientOptions,
    HTTPResponse,
    RequestConfig,
    RequestInterceptor,
    ResponseInterceptor,
    CircuitBreakerConfig,
} from './types.js';
import { HTTPClientErrorImpl, HTTPCircuitBreakerError } from './errors.js';
import {
    createLoggingInterceptor,
    createTimingInterceptor,
    createRetryInterceptor,
    createErrorNormalizationInterceptor,
} from './interceptors.js';

/**
 * Circuit breaker state
 */
enum CircuitState {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN',
    HALF_OPEN = 'HALF_OPEN',
}

/**
 * HTTP Client wrapper around Axios.
 *
 * Features:
 * - Automatic retries with exponential backoff
 * - Circuit breaker pattern
 * - Request/response interceptors
 * - Comprehensive error handling
 * - Authentication support (Bearer, Basic, API Key)
 *
 * @example
 * ```typescript
 * const client = new HTTPClient(
 *   { baseURL: 'https://api.example.com', timeout: 5000 },
 *   { retry: { maxRetries: 3, retryDelay: 1000 } }
 * );
 *
 * const response = await client.get('/users/123');
 * console.log(response.data);
 * ```
 */
export class HTTPClient {
    private readonly axiosInstance: AxiosInstance;
    private readonly clientOptions: HTTPClientOptions;
    private circuitState: CircuitState = CircuitState.CLOSED;
    private failureCount: number = 0;
    private lastFailureTime: number = 0;
    private successCount: number = 0;

    constructor(
        config: HTTPClientConfig = {},
        options: HTTPClientOptions = {}
    ) {
        this.clientOptions = options;

        // Create Axios instance with config
        this.axiosInstance = axios.create({
            baseURL: config.baseURL,
            timeout: config.timeout || 5000,
            headers: config.headers || {},
            maxRedirects: config.maxRedirects || 5,
            validateStatus: config.validateStatus || ((status) => status >= 200 && status < 300),
            decompress: config.decompress !== false,
            proxy: config.proxy ? {
                host: config.proxy.host,
                port: config.proxy.port,
                auth: config.proxy.auth,
            } : undefined,
        });

        // Setup authentication
        if (config.auth) {
            this.setupAuth(config.auth);
        }

        // Setup interceptors
        this.setupInterceptors();
    }

    /**
     * Setup authentication
     */
    private setupAuth(auth: HTTPClientConfig['auth']): void {
        if (!auth) return;

        if (auth.type === 'basic' && auth.username && auth.password) {
            this.axiosInstance.defaults.auth = {
                username: auth.username,
                password: auth.password,
            };
        } else if (auth.type === 'bearer' && auth.token) {
            this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${auth.token}`;
        } else if (auth.type === 'custom' && auth.customHeader && auth.token) {
            this.axiosInstance.defaults.headers.common[auth.customHeader] = auth.token;
        }
    }

    /**
     * Setup interceptors
     */
    private setupInterceptors(): void {
        // Timing interceptor (always enabled)
        if (this.clientOptions.timing !== false) {
            const timingInterceptor = createTimingInterceptor();
            this.addRequestInterceptor(timingInterceptor.request);
            this.addResponseInterceptor(timingInterceptor.response);
        }

        // Logging interceptor
        if (this.clientOptions.logging) {
            const loggingInterceptor = createLoggingInterceptor();
            this.addRequestInterceptor(loggingInterceptor.request);
            this.addResponseInterceptor(loggingInterceptor.response);
        }

        // Retry interceptor
        if (this.clientOptions.retry?.enabled) {
            const retryInterceptor = createRetryInterceptor(this.clientOptions.retry);
            this.addResponseInterceptor(retryInterceptor);
        }

        // Error normalization (always enabled)
        const errorInterceptor = createErrorNormalizationInterceptor();
        this.addResponseInterceptor(errorInterceptor);

        // Custom interceptors
        if (this.clientOptions.requestInterceptors) {
            for (const interceptor of this.clientOptions.requestInterceptors) {
                this.addRequestInterceptor(interceptor);
            }
        }

        if (this.clientOptions.responseInterceptors) {
            for (const interceptor of this.clientOptions.responseInterceptors) {
                this.addResponseInterceptor(interceptor);
            }
        }
    }

    /**
     * Check circuit breaker state
     */
    private checkCircuitBreaker(config?: CircuitBreakerConfig): void {
        if (!config?.enabled) return;

        const threshold = config.threshold || 5;
        const timeout = config.timeout || 60000;
        const resetTimeout = config.resetTimeout || 30000;

        const now = Date.now();

        if (this.circuitState === CircuitState.OPEN) {
            if (now - this.lastFailureTime >= timeout) {
                // Try to close circuit
                this.circuitState = CircuitState.HALF_OPEN;
                this.successCount = 0;
            } else {
                throw new HTTPCircuitBreakerError();
            }
        }

        if (this.circuitState === CircuitState.HALF_OPEN) {
            if (now - this.lastFailureTime >= resetTimeout && this.successCount > 0) {
                // Close circuit
                this.circuitState = CircuitState.CLOSED;
                this.failureCount = 0;
                this.successCount = 0;
            }
        }

        if (this.failureCount >= threshold) {
            this.circuitState = CircuitState.OPEN;
            this.lastFailureTime = now;
            throw new HTTPCircuitBreakerError();
        }
    }

    /**
     * Record success for circuit breaker
     */
    private recordSuccess(): void {
        if (this.clientOptions.circuitBreaker?.enabled) {
            this.successCount++;
            if (this.circuitState === CircuitState.HALF_OPEN) {
                this.circuitState = CircuitState.CLOSED;
                this.failureCount = 0;
            }
        }
    }

    /**
     * Record failure for circuit breaker
     */
    private recordFailure(): void {
        if (this.clientOptions.circuitBreaker?.enabled) {
            this.failureCount++;
            this.lastFailureTime = Date.now();
        }
    }

    /**
     * Make HTTP request
     */
    async request<T = unknown>(config: RequestConfig): Promise<HTTPResponse<T>> {
        try {
            this.checkCircuitBreaker(this.clientOptions.circuitBreaker);

            const response = await this.axiosInstance.request<T>(config as AxiosRequestConfig);

            this.recordSuccess();

            return {
                data: response.data,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers as Record<string, string>,
                config,
                duration: (response as typeof response & { duration?: number }).duration,
            };
        } catch (error) {
            this.recordFailure();

            if (error instanceof HTTPClientErrorImpl) {
                throw error;
            }

            throw error;
        }
    }

    /**
     * GET request
     */
    async get<T = unknown>(url: string, config?: RequestConfig): Promise<HTTPResponse<T>> {
        return this.request<T>({
            ...config,
            method: 'GET',
            url,
        });
    }

    /**
     * POST request
     */
    async post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<HTTPResponse<T>> {
        return this.request<T>({
            ...config,
            method: 'POST',
            url,
            data,
        });
    }

    /**
     * PUT request
     */
    async put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<HTTPResponse<T>> {
        return this.request<T>({
            ...config,
            method: 'PUT',
            url,
            data,
        });
    }

    /**
     * PATCH request
     */
    async patch<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<HTTPResponse<T>> {
        return this.request<T>({
            ...config,
            method: 'PATCH',
            url,
            data,
        });
    }

    /**
     * DELETE request
     */
    async delete<T = unknown>(url: string, config?: RequestConfig): Promise<HTTPResponse<T>> {
        return this.request<T>({
            ...config,
            method: 'DELETE',
            url,
        });
    }

    /**
     * HEAD request
     */
    async head<T = unknown>(url: string, config?: RequestConfig): Promise<HTTPResponse<T>> {
        return this.request<T>({
            ...config,
            method: 'HEAD',
            url,
        });
    }

    /**
     * OPTIONS request
     */
    async options<T = unknown>(url: string, config?: RequestConfig): Promise<HTTPResponse<T>> {
        return this.request<T>({
            ...config,
            method: 'OPTIONS',
            url,
        });
    }

    /**
     * Add request interceptor
     */
    addRequestInterceptor(interceptor: RequestInterceptor): number {
        return this.axiosInstance.interceptors.request.use(
            interceptor.onFulfilled,
            interceptor.onRejected
        );
    }

    /**
     * Add response interceptor
     */
    addResponseInterceptor(interceptor: ResponseInterceptor): number {
        return this.axiosInstance.interceptors.response.use(
            interceptor.onFulfilled,
            interceptor.onRejected
        );
    }

    /**
     * Remove interceptor
     */
    removeInterceptor(id: number, type: 'request' | 'response'): void {
        if (type === 'request') {
            this.axiosInstance.interceptors.request.eject(id);
        } else {
            this.axiosInstance.interceptors.response.eject(id);
        }
    }

    /**
     * Get underlying Axios instance
     */
    getAxiosInstance(): AxiosInstance {
        return this.axiosInstance;
    }

    /**
     * Get circuit breaker state
     */
    getCircuitState(): string {
        return this.circuitState;
    }

    /**
     * Reset circuit breaker
     */
    resetCircuitBreaker(): void {
        this.circuitState = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = 0;
    }
}
