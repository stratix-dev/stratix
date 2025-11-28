/**
 * @stratix/http-client
 *
 * HTTP client plugin for Stratix framework using Axios
 */

// Main plugin
export { AxiosHTTPClientPlugin } from './AxiosHTTPClientPlugin.js';

// HTTP Client
export { HTTPClient } from './HTTPClient.js';

// Types
export type {
    HTTPMethod,
    AuthConfig,
    HTTPClientConfig,
    RetryConfig,
    CircuitBreakerConfig,
    HTTPClientOptions,
    RequestConfig,
    HTTPResponse,
    RequestInterceptor,
    ResponseInterceptor,
    HTTPClientError,
    HTTPClientPluginConfig,
} from './types.js';

// Errors
export {
    HTTPClientErrorImpl,
    HTTPRequestError,
    HTTPResponseError,
    HTTPTimeoutError,
    HTTPNetworkError,
    HTTPCircuitBreakerError,
    isHTTPClientError,
    isHTTPResponseError,
    isHTTPTimeoutError,
    isHTTPNetworkError,
} from './errors.js';

// Interceptors
export {
    createLoggingInterceptor,
    createTimingInterceptor,
    createCorrelationIdInterceptor,
    createAuthInterceptor,
    createRetryInterceptor,
    createErrorNormalizationInterceptor,
} from './interceptors.js';
