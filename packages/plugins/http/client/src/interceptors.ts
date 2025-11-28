import type { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import type { RequestInterceptor, ResponseInterceptor, RetryConfig } from './types.js';
import { HTTPClientErrorImpl } from './errors.js';

/**
 * Logging interceptor for requests and responses
 */
export function createLoggingInterceptor(
    logger?: { info: (message: string, meta?: unknown) => void; error: (message: string, meta?: unknown) => void }
): { request: RequestInterceptor; response: ResponseInterceptor } {
    return {
        request: {
            onFulfilled: (config) => {
                logger?.info('HTTP Request', {
                    method: config.method?.toUpperCase(),
                    url: config.url,
                    baseURL: config.baseURL,
                    headers: sanitizeHeaders(config.headers),
                });
                return config;
            },
            onRejected: (error) => {
                logger?.error('HTTP Request Error', { error });
                return Promise.reject(error);
            },
        },
        response: {
            onFulfilled: (response) => {
                logger?.info('HTTP Response', {
                    method: response.config.method?.toUpperCase(),
                    url: response.config.url,
                    status: response.status,
                    statusText: response.statusText,
                });
                return response;
            },
            onRejected: (error) => {
                const axiosError = error as AxiosError;
                logger?.error('HTTP Response Error', {
                    method: axiosError.config?.method?.toUpperCase(),
                    url: axiosError.config?.url,
                    status: axiosError.response?.status,
                    message: axiosError.message,
                });
                return Promise.reject(error);
            },
        },
    };
}

/**
 * Timing interceptor to measure request duration
 */
export function createTimingInterceptor(): { request: RequestInterceptor; response: ResponseInterceptor } {
    return {
        request: {
            onFulfilled: (config) => {
                (config as InternalAxiosRequestConfig & { metadata?: { startTime?: number } }).metadata = {
                    ...(config as InternalAxiosRequestConfig & { metadata?: Record<string, unknown> }).metadata,
                    startTime: Date.now(),
                };
                return config;
            },
        },
        response: {
            onFulfilled: (response) => {
                const startTime = (response.config as InternalAxiosRequestConfig & { metadata?: { startTime?: number } }).metadata?.startTime;
                if (startTime) {
                    const duration = Date.now() - startTime;
                    (response as AxiosResponse & { duration?: number }).duration = duration;
                }
                return response;
            },
            onRejected: (error) => {
                const axiosError = error as AxiosError;
                const startTime = (axiosError.config as InternalAxiosRequestConfig & { metadata?: { startTime?: number } })?.metadata?.startTime;
                if (startTime) {
                    const duration = Date.now() - startTime;
                    (axiosError as AxiosError & { duration?: number }).duration = duration;
                }
                return Promise.reject(error);
            },
        },
    };
}

/**
 * Correlation ID interceptor to add correlation ID to requests
 */
export function createCorrelationIdInterceptor(
    headerName: string = 'X-Correlation-ID',
    generator?: () => string
): RequestInterceptor {
    const generateId = generator || (() => `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`);

    return {
        onFulfilled: (config) => {
            if (!config.headers[headerName]) {
                config.headers[headerName] = generateId();
            }
            return config;
        },
    };
}

/**
 * Auth interceptor to add authentication headers
 */
export function createAuthInterceptor(
    getToken: () => string | Promise<string>,
    headerName: string = 'Authorization',
    prefix: string = 'Bearer'
): RequestInterceptor {
    return {
        onFulfilled: async (config) => {
            const token = await getToken();
            if (token) {
                config.headers[headerName] = prefix ? `${prefix} ${token}` : token;
            }
            return config;
        },
    };
}

/**
 * Retry interceptor with exponential backoff
 */
export function createRetryInterceptor(retryConfig: RetryConfig): ResponseInterceptor {
    const {
        maxRetries = 3,
        retryDelay = 1000,
        backoff = 'exponential',
        retryCondition,
        retryStatusCodes = [408, 429, 500, 502, 503, 504],
    } = retryConfig;

    return {
        onRejected: async (error) => {
            const axiosError = error as AxiosError;
            const config = axiosError.config as InternalAxiosRequestConfig & { __retryCount?: number };

            if (!config) {
                return Promise.reject(error);
            }

            // Initialize retry count
            config.__retryCount = config.__retryCount || 0;

            // Check if we should retry
            const shouldRetry = retryCondition
                ? retryCondition(HTTPClientErrorImpl.fromAxiosError(axiosError))
                : axiosError.response
                    ? retryStatusCodes.includes(axiosError.response.status)
                    : axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT';

            if (!shouldRetry || config.__retryCount >= maxRetries) {
                return Promise.reject(error);
            }

            // Increment retry count
            config.__retryCount += 1;

            // Calculate delay
            const delay = backoff === 'exponential'
                ? retryDelay * Math.pow(2, config.__retryCount - 1)
                : retryDelay * config.__retryCount;

            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, delay));

            // Import axios dynamically to avoid circular dependency
            const axios = (await import('axios')).default;
            return axios.request(config);
        },
    };
}

/**
 * Error normalization interceptor
 */
export function createErrorNormalizationInterceptor(): ResponseInterceptor {
    return {
        onRejected: (error) => {
            const axiosError = error as AxiosError;
            return Promise.reject(HTTPClientErrorImpl.fromAxiosError(axiosError));
        },
    };
}

/**
 * Sanitize headers to remove sensitive information
 */
function sanitizeHeaders(headers: Record<string, unknown>): Record<string, unknown> {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(headers)) {
        if (sensitiveHeaders.includes(key.toLowerCase())) {
            sanitized[key] = '[REDACTED]';
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}
