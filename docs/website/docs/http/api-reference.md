---
sidebar_position: 4
title: API Reference
description: Complete API reference for HTTP client
---

# API Reference

Complete API reference for the HTTP client plugin.

## HTTPClient

Main HTTP client class.

### Constructor

```typescript
new HTTPClient(config?: HTTPClientConfig, options?: HTTPClientOptions)
```

### HTTP Methods

#### get()

```typescript
get<T>(url: string, config?: RequestConfig): Promise<HTTPResponse<T>>
```

Make a GET request.

**Example:**
```typescript
const response = await client.get<User>('/users/123');
console.log(response.data);
```

#### post()

```typescript
post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<HTTPResponse<T>>
```

Make a POST request.

**Example:**
```typescript
const response = await client.post<User>('/users', {
  name: 'John Doe',
  email: 'john@example.com'
});
```

#### put()

```typescript
put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<HTTPResponse<T>>
```

Make a PUT request.

#### patch()

```typescript
patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<HTTPResponse<T>>
```

Make a PATCH request.

#### delete()

```typescript
delete<T>(url: string, config?: RequestConfig): Promise<HTTPResponse<T>>
```

Make a DELETE request.

#### head()

```typescript
head<T>(url: string, config?: RequestConfig): Promise<HTTPResponse<T>>
```

Make a HEAD request.

#### options()

```typescript
options<T>(url: string, config?: RequestConfig): Promise<HTTPResponse<T>>
```

Make an OPTIONS request.

#### request()

```typescript
request<T>(config: RequestConfig): Promise<HTTPResponse<T>>
```

Make a generic HTTP request.

**Example:**
```typescript
const response = await client.request<User>({
  method: 'GET',
  url: '/users/123',
  headers: {
    'X-Custom-Header': 'value'
  }
});
```

### Interceptor Methods

#### addRequestInterceptor()

```typescript
addRequestInterceptor(interceptor: RequestInterceptor): number
```

Add a request interceptor. Returns interceptor ID.

**Example:**
```typescript
const id = client.addRequestInterceptor({
  onFulfilled: (config) => {
    config.headers['X-Timestamp'] = Date.now().toString();
    return config;
  }
});
```

#### addResponseInterceptor()

```typescript
addResponseInterceptor(interceptor: ResponseInterceptor): number
```

Add a response interceptor. Returns interceptor ID.

**Example:**
```typescript
const id = client.addResponseInterceptor({
  onFulfilled: (response) => {
    console.log('Response received:', response.status);
    return response;
  }
});
```

#### removeInterceptor()

```typescript
removeInterceptor(id: number, type: 'request' | 'response'): void
```

Remove an interceptor by ID.

**Example:**
```typescript
client.removeInterceptor(id, 'request');
```

### Circuit Breaker Methods

#### getCircuitState()

```typescript
getCircuitState(): string
```

Get current circuit breaker state: `'CLOSED'`, `'OPEN'`, or `'HALF_OPEN'`.

#### resetCircuitBreaker()

```typescript
resetCircuitBreaker(): void
```

Manually reset the circuit breaker to CLOSED state.

### Utility Methods

#### getAxiosInstance()

```typescript
getAxiosInstance(): AxiosInstance
```

Get the underlying Axios instance for advanced usage.

## Types

### HTTPClientConfig

```typescript
interface HTTPClientConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  auth?: AuthConfig;
  maxRedirects?: number;
  validateStatus?: (status: number) => boolean;
  decompress?: boolean;
  proxy?: ProxyConfig;
}
```

### HTTPClientOptions

```typescript
interface HTTPClientOptions {
  retry?: RetryConfig;
  circuitBreaker?: CircuitBreakerConfig;
  logging?: boolean;
  timing?: boolean;
  requestInterceptors?: RequestInterceptor[];
  responseInterceptors?: ResponseInterceptor[];
}
```

### RetryConfig

```typescript
interface RetryConfig {
  enabled: boolean;
  maxRetries?: number;
  retryDelay?: number;
  backoff?: 'linear' | 'exponential';
  retryCondition?: (error: HTTPClientError) => boolean;
  retryStatusCodes?: number[];
}
```

### CircuitBreakerConfig

```typescript
interface CircuitBreakerConfig {
  enabled: boolean;
  threshold?: number;
  timeout?: number;
  resetTimeout?: number;
}
```

### AuthConfig

```typescript
interface AuthConfig {
  type: 'basic' | 'bearer' | 'custom';
  username?: string;
  password?: string;
  token?: string;
  customHeader?: string;
}
```

### HTTPResponse

```typescript
interface HTTPResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: RequestConfig;
  duration?: number;
}
```

### RequestConfig

```typescript
interface RequestConfig extends AxiosRequestConfig {
  retry?: Partial<RetryConfig>;
  metadata?: Record<string, unknown>;
}
```

## Error Classes

### HTTPClientErrorImpl

Base error class for all HTTP client errors.

```typescript
class HTTPClientErrorImpl extends Error {
  code?: string;
  statusCode?: number;
  config?: RequestConfig;
  response?: {
    data: unknown;
    status: number;
    headers: Record<string, string>;
  };
  isNetworkError: boolean;
  isTimeout: boolean;
  originalError?: unknown;
}
```

### HTTPResponseError

HTTP response errors (4xx, 5xx).

```typescript
class HTTPResponseError extends HTTPClientErrorImpl {
  isClientError(): boolean;
  isServerError(): boolean;
  
  static badRequest(message: string, data?: unknown): HTTPResponseError;
  static unauthorized(message?: string, data?: unknown): HTTPResponseError;
  static forbidden(message?: string, data?: unknown): HTTPResponseError;
  static notFound(message?: string, data?: unknown): HTTPResponseError;
  static conflict(message: string, data?: unknown): HTTPResponseError;
  static unprocessableEntity(message: string, data?: unknown): HTTPResponseError;
  static tooManyRequests(message?: string, data?: unknown): HTTPResponseError;
  static internalServerError(message?: string, data?: unknown): HTTPResponseError;
  static badGateway(message?: string, data?: unknown): HTTPResponseError;
  static serviceUnavailable(message?: string, data?: unknown): HTTPResponseError;
  static gatewayTimeout(message?: string, data?: unknown): HTTPResponseError;
}
```

### HTTPTimeoutError

Request timeout errors.

```typescript
class HTTPTimeoutError extends HTTPClientErrorImpl {}
```

### HTTPNetworkError

Network errors.

```typescript
class HTTPNetworkError extends HTTPClientErrorImpl {}
```

### HTTPCircuitBreakerError

Circuit breaker open errors.

```typescript
class HTTPCircuitBreakerError extends HTTPClientErrorImpl {}
```

## Type Guards

### isHTTPClientError()

```typescript
function isHTTPClientError(error: unknown): error is HTTPClientError
```

Check if error is an HTTP client error.

### isHTTPResponseError()

```typescript
function isHTTPResponseError(error: unknown): error is HTTPResponseError
```

Check if error is an HTTP response error.

### isHTTPTimeoutError()

```typescript
function isHTTPTimeoutError(error: unknown): error is HTTPTimeoutError
```

Check if error is a timeout error.

### isHTTPNetworkError()

```typescript
function isHTTPNetworkError(error: unknown): error is HTTPNetworkError
```

Check if error is a network error.

## Interceptor Factories

### createLoggingInterceptor()

```typescript
function createLoggingInterceptor(
  logger?: Logger
): { request: RequestInterceptor; response: ResponseInterceptor }
```

Create logging interceptors.

### createTimingInterceptor()

```typescript
function createTimingInterceptor(): 
  { request: RequestInterceptor; response: ResponseInterceptor }
```

Create timing interceptors.

### createCorrelationIdInterceptor()

```typescript
function createCorrelationIdInterceptor(
  headerName?: string,
  generator?: () => string
): RequestInterceptor
```

Create correlation ID interceptor.

### createAuthInterceptor()

```typescript
function createAuthInterceptor(
  getToken: () => string | Promise<string>,
  headerName?: string,
  prefix?: string
): RequestInterceptor
```

Create authentication interceptor.

### createRetryInterceptor()

```typescript
function createRetryInterceptor(
  retryConfig: RetryConfig
): ResponseInterceptor
```

Create retry interceptor.

### createErrorNormalizationInterceptor()

```typescript
function createErrorNormalizationInterceptor(): ResponseInterceptor
```

Create error normalization interceptor.

## Plugin

### AxiosHTTPClientPlugin

```typescript
class AxiosHTTPClientPlugin implements Plugin {
  readonly metadata: PluginMetadata;
  
  initialize(context: PluginContext): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  healthCheck(): Promise<HealthCheckResult>;
  
  getClient(name?: string): HTTPClient | undefined;
  getClientNames(): string[];
}
```

## Next Steps

- [Configuration](./configuration) - Configuration options
- [Advanced Usage](./advanced-usage) - Advanced patterns
