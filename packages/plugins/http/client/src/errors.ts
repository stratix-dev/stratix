import type { AxiosError } from 'axios';
import type { HTTPClientError, RequestConfig } from './types.js';

/**
 * Base HTTP client error
 */
export class HTTPClientErrorImpl extends Error implements HTTPClientError {
    constructor(
        message: string,
        public readonly code?: string,
        public readonly statusCode?: number,
        public readonly config?: RequestConfig,
        public readonly response?: {
            data: unknown;
            status: number;
            headers: Record<string, string>;
        },
        public readonly isNetworkError: boolean = false,
        public readonly isTimeout: boolean = false,
        public readonly originalError?: unknown
    ) {
        super(message);
        this.name = 'HTTPClientError';
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Create error from Axios error
     */
    static fromAxiosError(error: AxiosError): HTTPClientErrorImpl {
        const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
        const isNetworkError = !error.response && !isTimeout;

        if (error.response) {
            // Server responded with error status
            return new HTTPResponseError(
                error.message,
                error.response.status,
                error.response.data,
                error.config as RequestConfig,
                error.response.headers as Record<string, string>,
                error.code
            );
        }

        if (isTimeout) {
            return new HTTPTimeoutError(
                error.message || 'Request timeout',
                error.config as RequestConfig,
                error.code
            );
        }

        if (isNetworkError) {
            return new HTTPNetworkError(
                error.message || 'Network error',
                error.config as RequestConfig,
                error.code
            );
        }

        // Generic request error
        return new HTTPRequestError(
            error.message,
            error.config as RequestConfig,
            error.code
        );
    }

    toJSON() {
        const result: Record<string, unknown> = {
            name: this.name,
            message: this.message,
            code: this.code,
        };

        if (this.statusCode) {
            result.statusCode = this.statusCode;
        }

        if (this.response) {
            result.response = {
                status: this.response.status,
                data: this.response.data,
            };
        }

        return result;
    }
}

/**
 * HTTP request error (before response)
 */
export class HTTPRequestError extends HTTPClientErrorImpl {
    constructor(
        message: string,
        config?: RequestConfig,
        code?: string
    ) {
        super(message, code, undefined, config, undefined, false, false);
        this.name = 'HTTPRequestError';
    }
}

/**
 * HTTP response error (4xx, 5xx)
 */
export class HTTPResponseError extends HTTPClientErrorImpl {
    constructor(
        message: string,
        statusCode: number,
        data: unknown,
        config?: RequestConfig,
        headers?: Record<string, string>,
        code?: string
    ) {
        super(
            message,
            code || `HTTP_${statusCode}`,
            statusCode,
            config,
            {
                data,
                status: statusCode,
                headers: headers || {},
            },
            false,
            false
        );
        this.name = 'HTTPResponseError';
    }

    /**
     * Check if error is a client error (4xx)
     */
    isClientError(): boolean {
        return this.statusCode !== undefined && this.statusCode >= 400 && this.statusCode < 500;
    }

    /**
     * Check if error is a server error (5xx)
     */
    isServerError(): boolean {
        return this.statusCode !== undefined && this.statusCode >= 500;
    }

    /**
     * Create specific error instances
     */
    static badRequest(message: string, data?: unknown, config?: RequestConfig): HTTPResponseError {
        return new HTTPResponseError(message, 400, data, config, undefined, 'BAD_REQUEST');
    }

    static unauthorized(message: string = 'Unauthorized', data?: unknown, config?: RequestConfig): HTTPResponseError {
        return new HTTPResponseError(message, 401, data, config, undefined, 'UNAUTHORIZED');
    }

    static forbidden(message: string = 'Forbidden', data?: unknown, config?: RequestConfig): HTTPResponseError {
        return new HTTPResponseError(message, 403, data, config, undefined, 'FORBIDDEN');
    }

    static notFound(message: string = 'Not found', data?: unknown, config?: RequestConfig): HTTPResponseError {
        return new HTTPResponseError(message, 404, data, config, undefined, 'NOT_FOUND');
    }

    static conflict(message: string, data?: unknown, config?: RequestConfig): HTTPResponseError {
        return new HTTPResponseError(message, 409, data, config, undefined, 'CONFLICT');
    }

    static unprocessableEntity(message: string, data?: unknown, config?: RequestConfig): HTTPResponseError {
        return new HTTPResponseError(message, 422, data, config, undefined, 'UNPROCESSABLE_ENTITY');
    }

    static tooManyRequests(message: string = 'Too many requests', data?: unknown, config?: RequestConfig): HTTPResponseError {
        return new HTTPResponseError(message, 429, data, config, undefined, 'TOO_MANY_REQUESTS');
    }

    static internalServerError(message: string = 'Internal server error', data?: unknown, config?: RequestConfig): HTTPResponseError {
        return new HTTPResponseError(message, 500, data, config, undefined, 'INTERNAL_SERVER_ERROR');
    }

    static badGateway(message: string = 'Bad gateway', data?: unknown, config?: RequestConfig): HTTPResponseError {
        return new HTTPResponseError(message, 502, data, config, undefined, 'BAD_GATEWAY');
    }

    static serviceUnavailable(message: string = 'Service unavailable', data?: unknown, config?: RequestConfig): HTTPResponseError {
        return new HTTPResponseError(message, 503, data, config, undefined, 'SERVICE_UNAVAILABLE');
    }

    static gatewayTimeout(message: string = 'Gateway timeout', data?: unknown, config?: RequestConfig): HTTPResponseError {
        return new HTTPResponseError(message, 504, data, config, undefined, 'GATEWAY_TIMEOUT');
    }
}

/**
 * HTTP timeout error
 */
export class HTTPTimeoutError extends HTTPClientErrorImpl {
    constructor(
        message: string,
        config?: RequestConfig,
        code?: string
    ) {
        super(message, code || 'TIMEOUT', undefined, config, undefined, false, true);
        this.name = 'HTTPTimeoutError';
    }
}

/**
 * HTTP network error
 */
export class HTTPNetworkError extends HTTPClientErrorImpl {
    constructor(
        message: string,
        config?: RequestConfig,
        code?: string
    ) {
        super(message, code || 'NETWORK_ERROR', undefined, config, undefined, true, false);
        this.name = 'HTTPNetworkError';
    }
}

/**
 * Circuit breaker error
 */
export class HTTPCircuitBreakerError extends HTTPClientErrorImpl {
    constructor(
        message: string = 'Circuit breaker is open',
        config?: RequestConfig
    ) {
        super(message, 'CIRCUIT_BREAKER_OPEN', undefined, config, undefined, false, false);
        this.name = 'HTTPCircuitBreakerError';
    }
}

/**
 * Type guard to check if error is an HTTP client error
 */
export function isHTTPClientError(error: unknown): error is HTTPClientError {
    return (
        error instanceof HTTPClientErrorImpl ||
        (typeof error === 'object' &&
            error !== null &&
            'name' in error &&
            typeof (error as Record<string, unknown>).name === 'string' &&
            ((error as Record<string, unknown>).name as string).includes('HTTP'))
    );
}

/**
 * Type guard to check if error is a response error
 */
export function isHTTPResponseError(error: unknown): error is HTTPResponseError {
    return error instanceof HTTPResponseError;
}

/**
 * Type guard to check if error is a timeout error
 */
export function isHTTPTimeoutError(error: unknown): error is HTTPTimeoutError {
    return error instanceof HTTPTimeoutError || (isHTTPClientError(error) && error.isTimeout === true);
}

/**
 * Type guard to check if error is a network error
 */
export function isHTTPNetworkError(error: unknown): error is HTTPNetworkError {
    return error instanceof HTTPNetworkError || (isHTTPClientError(error) && error.isNetworkError === true);
}
