---
sidebar_position: 3
title: Advanced Usage
description: Advanced HTTP client features and patterns
---

# Advanced Usage

Advanced features and patterns for the HTTP client plugin.

## Interceptors

Interceptors allow you to intercept and modify requests and responses.

### Request Interceptors

Add custom logic before requests are sent:

```typescript
import { createAuthInterceptor, createCorrelationIdInterceptor } from '@stratix/http-client';

// Dynamic authentication
const authInterceptor = createAuthInterceptor(
  async () => await getAuthToken(),
  'Authorization',
  'Bearer'
);
client.addRequestInterceptor(authInterceptor);

// Correlation IDs
const correlationInterceptor = createCorrelationIdInterceptor('X-Correlation-ID');
client.addRequestInterceptor(correlationInterceptor);

// Custom interceptor
client.addRequestInterceptor({
  onFulfilled: (config) => {
    config.headers['X-Request-Time'] = new Date().toISOString();
    return config;
  },
  onRejected: (error) => {
    console.error('Request configuration error:', error);
    return Promise.reject(error);
  }
});
```

### Response Interceptors

Transform responses or handle errors globally:

```typescript
// Transform response data
client.addResponseInterceptor({
  onFulfilled: (response) => {
    // Convert snake_case to camelCase
    return {
      ...response,
      data: camelCaseKeys(response.data)
    };
  }
});

// Global error handling
client.addResponseInterceptor({
  onRejected: async (error) => {
    // Refresh token on 401
    if (error.statusCode === 401) {
      await refreshAuthToken();
      return client.request(error.config);
    }
    
    // Log errors
    logger.error('HTTP Error', {
      url: error.config?.url,
      status: error.statusCode,
      message: error.message
    });
    
    return Promise.reject(error);
  }
});
```

### Built-in Interceptors

```typescript
import {
  createLoggingInterceptor,
  createTimingInterceptor,
  createRetryInterceptor,
  createCorrelationIdInterceptor,
  createAuthInterceptor
} from '@stratix/http-client';

// Logging with custom logger
const { request, response } = createLoggingInterceptor(logger);
client.addRequestInterceptor(request);
client.addResponseInterceptor(response);

// Timing metrics
const timing = createTimingInterceptor();
client.addRequestInterceptor(timing.request);
client.addResponseInterceptor(timing.response);

// Retry with custom config
const retry = createRetryInterceptor({
  enabled: true,
  maxRetries: 5,
  retryDelay: 2000,
  backoff: 'exponential'
});
client.addResponseInterceptor(retry);
```

## Retry Strategies

### Exponential Backoff

Retry with exponentially increasing delays:

```typescript
{
  'http-client': {
    globalOptions: {
      retry: {
        enabled: true,
        maxRetries: 3,
        retryDelay: 1000,
        backoff: 'exponential'
      }
    }
  }
}
```

**Delays:** 1s → 2s → 4s

### Linear Backoff

Retry with linearly increasing delays:

```typescript
{
  'http-client': {
    globalOptions: {
      retry: {
        enabled: true,
        maxRetries: 3,
        retryDelay: 1000,
        backoff: 'linear'
      }
    }
  }
}
```

**Delays:** 1s → 2s → 3s

### Custom Retry Condition

Define custom logic to determine if request should be retried:

```typescript
{
  'http-client': {
    globalOptions: {
      retry: {
        enabled: true,
        maxRetries: 3,
        retryCondition: (error) => {
          // Retry only on network errors or 503
          return error.isNetworkError || error.statusCode === 503;
        }
      }
    }
  }
}
```

## Circuit Breaker Pattern

Prevent cascading failures by opening circuit after threshold failures:

```typescript
{
  'http-client': {
    globalOptions: {
      circuitBreaker: {
        enabled: true,
        threshold: 5,      // Open after 5 failures
        timeout: 60000,    // Keep open for 60s
        resetTimeout: 30000 // Try to close after 30s
      }
    }
  }
}
```

### Circuit States

```typescript
// Check circuit state
const state = client.getCircuitState();
console.log(state); // 'CLOSED', 'OPEN', or 'HALF_OPEN'

// Manually reset circuit
client.resetCircuitBreaker();
```

## Dynamic Client Creation

Create clients dynamically at runtime:

```typescript
import { HTTPClient, HTTPClientConfig } from '@stratix/http-client';

class ApiService {
  constructor(
    private readonly clientFactory: (config: HTTPClientConfig) => HTTPClient
  ) {}

  createClientForTenant(tenantId: string) {
    return this.clientFactory({
      baseURL: `https://${tenantId}.api.example.com`,
      timeout: 5000,
      headers: {
        'X-Tenant-ID': tenantId
      }
    });
  }

  async getTenantData(tenantId: string) {
    const client = this.createClientForTenant(tenantId);
    const response = await client.get('/data');
    return response.data;
  }
}

// Register in container
container.register(
  'apiService',
  (c) => new ApiService(c.resolve('http:clientFactory'))
);
```

## Request Cancellation

Cancel requests using AbortController:

```typescript
const controller = new AbortController();

const request = client.get('/users', {
  signal: controller.signal
});

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
  const response = await request;
} catch (error) {
  if (error.code === 'ERR_CANCELED') {
    console.log('Request was cancelled');
  }
}
```

## File Upload

Upload files with multipart/form-data:

```typescript
const formData = new FormData();
formData.append('file', fileBlob, 'document.pdf');
formData.append('description', 'Important document');

const response = await client.post('/upload', formData, {
  headers: {
    'Content-Type': 'multipart/form-data'
  },
  timeout: 30000 // Longer timeout for uploads
});
```

## Download Files

Download files with progress tracking:

```typescript
const response = await client.get('/files/document.pdf', {
  responseType: 'blob',
  onDownloadProgress: (progressEvent) => {
    const percentCompleted = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total
    );
    console.log(`Download: ${percentCompleted}%`);
  }
});

// Save blob
const blob = new Blob([response.data]);
const url = window.URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'document.pdf';
link.click();
```

## Streaming Responses

Handle streaming responses:

```typescript
const response = await client.get('/stream', {
  responseType: 'stream'
});

response.data.on('data', (chunk) => {
  console.log('Received chunk:', chunk);
});

response.data.on('end', () => {
  console.log('Stream ended');
});
```

## Testing

### Mocking HTTP Clients

```typescript
import { HTTPClient } from '@stratix/http-client';
import { vi } from 'vitest';

describe('UserService', () => {
  it('should fetch user', async () => {
    // Create mock client
    const mockClient = {
      get: vi.fn().mockResolvedValue({
        data: { id: '1', name: 'John' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      })
    } as unknown as HTTPClient;

    // Inject mock via constructor
    const service = new UserService(mockClient);
    const user = await service.getUser('1');

    expect(user).toEqual({ id: '1', name: 'John' });
    expect(mockClient.get).toHaveBeenCalledWith('/users/1');
  });
});
```

### Integration Testing

```typescript
import { ApplicationBuilder } from '@stratix/runtime';
import { AxiosHTTPClientPlugin } from '@stratix/http-client';

describe('HTTP Client Integration', () => {
  let app: Application;

  beforeAll(async () => {
    app = await ApplicationBuilder.create()
      .usePlugin(new AxiosHTTPClientPlugin())
      .withConfig({
        'http-client': {
          default: {
            baseURL: 'https://jsonplaceholder.typicode.com'
          }
        }
      })
      .build();

    await app.start();
  });

  afterAll(async () => {
    await app.stop();
  });

  it('should make real HTTP request', async () => {
    const client = app.resolve<HTTPClient>('http:client');
    const response = await client.get('/posts/1');

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('id', 1);
  });
});
```

## Best Practices

### 1. Use Named Clients

Create separate clients for different APIs:

```typescript
{
  'http-client': {
    clients: {
      'users-api': { baseURL: 'https://users.api.com' },
      'payments-api': { baseURL: 'https://payments.api.com' },
      'notifications-api': { baseURL: 'https://notifications.api.com' }
    }
  }
}
```

### 2. Configure Timeouts

Always set appropriate timeouts:

```typescript
{
  'http-client': {
    default: {
      timeout: 5000  // 5 seconds for most requests
    },
    clients: {
      'long-running': {
        timeout: 30000  // 30 seconds for long operations
      }
    }
  }
}
```

### 3. Enable Retries for Transient Failures

```typescript
{
  'http-client': {
    globalOptions: {
      retry: {
        enabled: true,
        retryStatusCodes: [408, 429, 500, 502, 503, 504]
      }
    }
  }
}
```

### 4. Use Circuit Breaker for External Services

```typescript
{
  'http-client': {
    clients: {
      'external-api': {
        baseURL: 'https://external.api.com'
      }
    },
    globalOptions: {
      circuitBreaker: {
        enabled: true,
        threshold: 5
      }
    }
  }
}
```

### 5. Handle Errors Properly

```typescript
try {
  const response = await client.get('/users/123');
} catch (error) {
  if (isHTTPResponseError(error)) {
    // Handle HTTP errors
    if (error.statusCode === 404) {
      return null; // User not found
    }
    if (error.statusCode >= 500) {
      // Retry or fallback
    }
  } else if (isHTTPTimeoutError(error)) {
    // Handle timeout
  } else if (isHTTPNetworkError(error)) {
    // Handle network error
  }
  throw error;
}
```

## Next Steps

- [API Reference](./api-reference) - Complete API documentation
- [Configuration](./configuration) - Configuration options
