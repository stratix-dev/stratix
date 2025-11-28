import type { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

/**
 * HTTP methods supported by the client
 */
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Authentication configuration
 */
export interface AuthConfig {
    type: 'basic' | 'bearer' | 'custom';
    username?: string;
    password?: string;
    token?: string;
    customHeader?: string;
}

/**
 * HTTP client configuration
 */
export interface HTTPClientConfig {
    /**
     * Base URL for all requests
     */
    baseURL?: string;

    /**
     * Request timeout in milliseconds
     * @default 5000
     */
    timeout?: number;

    /**
     * Default headers for all requests
     */
    headers?: Record<string, string>;

    /**
     * Authentication configuration
     */
    auth?: AuthConfig;

    /**
     * Maximum number of redirects to follow
     * @default 5
     */
    maxRedirects?: number;

    /**
     * Validate status codes
     * @default (status) => status >= 200 && status < 300
     */
    validateStatus?: (status: number) => boolean;

    /**
     * Enable automatic decompression
     * @default true
     */
    decompress?: boolean;

    /**
     * Proxy configuration
     */
    proxy?: {
        host: string;
        port: number;
        auth?: {
            username: string;
            password: string;
        };
    };
}

/**
 * Retry configuration
 */
export interface RetryConfig {
    /**
     * Enable retry mechanism
     * @default false
     */
    enabled: boolean;

    /**
     * Maximum number of retries
     * @default 3
     */
    maxRetries?: number;

    /**
     * Initial retry delay in milliseconds
     * @default 1000
     */
    retryDelay?: number;

    /**
     * Backoff strategy
     * @default 'exponential'
     */
    backoff?: 'linear' | 'exponential';

    /**
     * Condition to determine if request should be retried
     */
    retryCondition?: (error: HTTPClientError) => boolean;

    /**
     * HTTP status codes that should trigger a retry
     * @default [408, 429, 500, 502, 503, 504]
     */
    retryStatusCodes?: number[];
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
    /**
     * Enable circuit breaker
     * @default false
     */
    enabled: boolean;

    /**
     * Number of failures before opening the circuit
     * @default 5
     */
    threshold?: number;

    /**
     * Time in milliseconds to keep circuit open
     * @default 60000
     */
    timeout?: number;

    /**
     * Time in milliseconds before attempting to close the circuit
     * @default 30000
     */
    resetTimeout?: number;
}

/**
 * HTTP client options
 */
export interface HTTPClientOptions {
    /**
     * Retry configuration
     */
    retry?: RetryConfig;

    /**
     * Circuit breaker configuration
     */
    circuitBreaker?: CircuitBreakerConfig;

    /**
     * Enable request/response logging
     * @default false
     */
    logging?: boolean;

    /**
     * Enable timing metrics
     * @default false
     */
    timing?: boolean;

    /**
     * Custom request interceptors
     */
    requestInterceptors?: RequestInterceptor[];

    /**
     * Custom response interceptors
     */
    responseInterceptors?: ResponseInterceptor[];
}

/**
 * Request configuration for individual requests
 */
export interface RequestConfig extends Omit<AxiosRequestConfig, 'baseURL'> {
    /**
     * Override retry configuration for this request
     */
    retry?: Partial<RetryConfig>;

    /**
     * Additional metadata for the request
     */
    metadata?: Record<string, unknown>;
}

/**
 * HTTP response wrapper
 */
export interface HTTPResponse<T = unknown> {
    /**
     * Response data
     */
    data: T;

    /**
     * HTTP status code
     */
    status: number;

    /**
     * HTTP status text
     */
    statusText: string;

    /**
     * Response headers
     */
    headers: Record<string, string>;

    /**
     * Request configuration
     */
    config: RequestConfig;

    /**
     * Request duration in milliseconds
     */
    duration?: number;
}

/**
 * Request interceptor
 */
export interface RequestInterceptor {
    /**
     * Called before request is sent
     */
    onFulfilled?: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;

    /**
     * Called when request configuration fails
     */
    onRejected?: (error: unknown) => unknown;
}

/**
 * Response interceptor
 */
export interface ResponseInterceptor {
    /**
     * Called on successful response
     */
    onFulfilled?: <T = unknown>(response: AxiosResponse<T>) => AxiosResponse<T> | Promise<AxiosResponse<T>>;

    /**
     * Called on response error
     */
    onRejected?: (error: unknown) => unknown;
}

/**
 * HTTP client error base interface
 */
export interface HTTPClientError extends Error {
    /**
     * Error code
     */
    code?: string;

    /**
     * HTTP status code (if available)
     */
    statusCode?: number;

    /**
     * Request configuration
     */
    config?: RequestConfig;

    /**
     * Response data (if available)
     */
    response?: {
        data: unknown;
        status: number;
        headers: Record<string, string>;
    };

    /**
     * Whether this is a network error
     */
    isNetworkError?: boolean;

    /**
     * Whether this is a timeout error
     */
    isTimeout?: boolean;

    /**
     * Original error
     */
    originalError?: unknown;
}

/**
 * Plugin configuration for multiple clients
 */
export interface HTTPClientPluginConfig {
    /**
     * Default client configuration
     */
    default?: HTTPClientConfig;

    /**
     * Named client configurations
     */
    clients?: Record<string, HTTPClientConfig>;

    /**
     * Global options applied to all clients
     */
    globalOptions?: HTTPClientOptions;

    /**
     * Health check endpoints to verify connectivity
     */
    healthCheckEndpoints?: string[];
}
