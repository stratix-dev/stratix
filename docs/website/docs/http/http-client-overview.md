---
sidebar_position: 1
title: HTTP Client Overview
description: HTTP client plugin for making outbound HTTP requests with Axios
---

# HTTP Client

The `@stratix/http-client` plugin provides a robust HTTP client for making outbound HTTP requests using Axios. It includes advanced features like automatic retries, circuit breaker pattern, request/response interceptors, and support for multiple named clients.

## Features

- 🚀 **Multiple Named Clients** - Configure different clients for different APIs
- 🔄 **Automatic Retries** - Exponential backoff retry mechanism for failed requests
- 🛡️ **Circuit Breaker** - Prevent cascading failures with circuit breaker pattern
- 🎯 **Type-Safe** - Full TypeScript support with generic types
- 🔌 **Interceptors** - Request and response interceptors for cross-cutting concerns
- 📊 **Observability** - Built-in logging and timing metrics
- 🔐 **Authentication** - Support for Bearer, Basic, and custom authentication
- ✅ **Health Checks** - Monitor connectivity to external services

## Installation

```bash
pnpm add @stratix/http-client
```

## Quick Start

```typescript
import { ApplicationBuilder } from '@stratix/runtime';
import { AxiosHTTPClientPlugin } from '@stratix/http-client';

const app = await ApplicationBuilder.create()
  .usePlugin(new AxiosHTTPClientPlugin())
  .withConfig({
    'http-client': {
      default: {
        baseURL: 'https://api.example.com',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    }
  })
  .build();

await app.start();

// Use in your services
const client = app.resolve<HTTPClient>('http:client');
const response = await client.get<User>('/users/123');
console.log(response.data);
```

## Basic Usage

### Making HTTP Requests

```typescript
import { HTTPClient } from '@stratix/http-client';

class UserService {
  constructor(
    private readonly httpClient: HTTPClient
  ) {}

  async getUser(id: string) {
    const response = await this.httpClient.get<User>(`/users/${id}`);
    return response.data;
  }

  async createUser(data: CreateUserDto) {
    const response = await this.httpClient.post<User>('/users', data);
    return response.data;
  }

  async updateUser(id: string, data: UpdateUserDto) {
    const response = await this.httpClient.put<User>(`/users/${id}`, data);
    return response.data;
  }

  async deleteUser(id: string) {
    await this.httpClient.delete(`/users/${id}`);
  }
}

// Register in container
container.register(
  'userService',
  (c) => new UserService(c.resolve('http:client'))
);
```

### Error Handling

```typescript
import {
  isHTTPResponseError,
  isHTTPTimeoutError,
  isHTTPNetworkError,
  HTTPCircuitBreakerError
} from '@stratix/http-client';

try {
  const response = await client.get('/users/123');
} catch (error) {
  if (isHTTPResponseError(error)) {
    console.error('HTTP Error:', error.statusCode, error.response?.data);
    
    if (error.isClientError()) {
      // Handle 4xx errors
    }
    
    if (error.isServerError()) {
      // Handle 5xx errors
    }
  } else if (isHTTPTimeoutError(error)) {
    console.error('Request timeout');
  } else if (isHTTPNetworkError(error)) {
    console.error('Network error');
  } else if (error instanceof HTTPCircuitBreakerError) {
    console.error('Circuit breaker is open');
  }
}
```

## Configuration

### Multiple Named Clients

Configure different clients for different APIs:

```typescript
{
  'http-client': {
    default: {
      baseURL: 'https://api.example.com',
      timeout: 5000
    },
    clients: {
      payments: {
        baseURL: 'https://payments.example.com',
        timeout: 10000,
        auth: {
          type: 'bearer',
          token: process.env.PAYMENTS_API_KEY
        }
      },
      notifications: {
        baseURL: 'https://notifications.example.com',
        timeout: 3000
      }
    }
  }
}
```

Use named clients in your services:

```typescript
class PaymentService {
  constructor(
    private readonly paymentsClient: HTTPClient
  ) {}

  async createPayment(data: PaymentData) {
    const response = await this.paymentsClient.post<Payment>('/payments', data);
    return response.data;
  }
}

// Register in container
container.register(
  'paymentService',
  (c) => new PaymentService(c.resolve('http:client:payments'))
);
```

### Authentication

#### Bearer Token

```typescript
{
  'http-client': {
    default: {
      baseURL: 'https://api.example.com',
      auth: {
        type: 'bearer',
        token: process.env.API_TOKEN
      }
    }
  }
}
```

#### Basic Auth

```typescript
{
  'http-client': {
    default: {
      baseURL: 'https://api.example.com',
      auth: {
        type: 'basic',
        username: 'user',
        password: 'pass'
      }
    }
  }
}
```

#### Custom Header

```typescript
{
  'http-client': {
    default: {
      baseURL: 'https://api.example.com',
      auth: {
        type: 'custom',
        customHeader: 'X-API-Key',
        token: process.env.API_KEY
      }
    }
  }
}
```

## Next Steps

- [Configuration Guide](./configuration) - Detailed configuration options
- [Advanced Usage](./advanced-usage) - Retries, circuit breaker, interceptors
- [API Reference](./api-reference) - Complete API documentation
