---
sidebar_position: 2
title: Configuration
description: HTTP client configuration options
---

# HTTP Client Configuration

Complete guide to configuring the HTTP client plugin.

## Basic Configuration

### Single Client

```typescript
{
  'http-client': {
    default: {
      baseURL: 'https://api.example.com',
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }
  }
}
```

### Multiple Clients

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
        timeout: 10000
      },
      notifications: {
        baseURL: 'https://notifications.example.com',
        timeout: 3000
      }
    }
  }
}
```

## Client Options

### Timeout

Set request timeout in milliseconds:

```typescript
{
  'http-client': {
    default: {
      baseURL: 'https://api.example.com',
      timeout: 10000  // 10 seconds
    }
  }
}
```

### Headers

Set default headers for all requests:

```typescript
{
  'http-client': {
    default: {
      baseURL: 'https://api.example.com',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'MyApp/1.0'
      }
    }
  }
}
```

### Proxy

Configure HTTP proxy:

```typescript
{
  'http-client': {
    default: {
      baseURL: 'https://api.example.com',
      proxy: {
        host: 'proxy.example.com',
        port: 8080,
        auth: {
          username: 'proxyuser',
          password: 'proxypass'
        }
      }
    }
  }
}
```

## Global Options

### Automatic Retries

Enable automatic retries with exponential backoff:

```typescript
{
  'http-client': {
    default: {
      baseURL: 'https://api.example.com'
    },
    globalOptions: {
      retry: {
        enabled: true,
        maxRetries: 3,
        retryDelay: 1000,
        backoff: 'exponential',
        retryStatusCodes: [408, 429, 500, 502, 503, 504]
      }
    }
  }
}
```

**Options:**
- `enabled` - Enable/disable retry mechanism
- `maxRetries` - Maximum number of retry attempts (default: 3)
- `retryDelay` - Initial delay in ms (default: 1000)
- `backoff` - Backoff strategy: `'linear'` or `'exponential'` (default: 'exponential')
- `retryStatusCodes` - HTTP status codes that trigger retry (default: [408, 429, 500, 502, 503, 504])

### Circuit Breaker

Enable circuit breaker to prevent cascading failures:

```typescript
{
  'http-client': {
    default: {
      baseURL: 'https://api.example.com'
    },
    globalOptions: {
      circuitBreaker: {
        enabled: true,
        threshold: 5,
        timeout: 60000,
        resetTimeout: 30000
      }
    }
  }
}
```

**Options:**
- `enabled` - Enable/disable circuit breaker
- `threshold` - Number of failures before opening circuit (default: 5)
- `timeout` - Time in ms to keep circuit open (default: 60000)
- `resetTimeout` - Time in ms before attempting to close circuit (default: 30000)

**Circuit States:**
- **CLOSED** - Normal operation, requests pass through
- **OPEN** - Circuit is open, requests fail immediately
- **HALF_OPEN** - Testing if service recovered

### Logging

Enable request/response logging:

```typescript
{
  'http-client': {
    default: {
      baseURL: 'https://api.example.com'
    },
    globalOptions: {
      logging: true
    }
  }
}
```

:::tip
Sensitive headers (Authorization, Cookie, X-API-Key) are automatically redacted in logs.
:::

### Timing Metrics

Enable timing metrics (enabled by default):

```typescript
{
  'http-client': {
    default: {
      baseURL: 'https://api.example.com'
    },
    globalOptions: {
      timing: true
    }
  }
}
```

## Health Checks

Configure health check endpoints to monitor connectivity:

```typescript
{
  'http-client': {
    default: {
      baseURL: 'https://api.example.com'
    },
    healthCheckEndpoints: [
      'https://api.example.com/health',
      'https://api.example.com/status'
    ]
  }
}
```

The plugin will periodically check these endpoints and report health status.

## Per-Request Configuration

Override configuration for individual requests:

```typescript
const response = await client.get<User>('/users/123', {
  timeout: 10000,
  headers: {
    'X-Custom-Header': 'value'
  },
  retry: {
    enabled: true,
    maxRetries: 5
  }
});
```

## Environment Variables

Use environment variables for sensitive configuration:

```typescript
{
  'http-client': {
    default: {
      baseURL: process.env.API_BASE_URL,
      auth: {
        type: 'bearer',
        token: process.env.API_TOKEN
      }
    },
    clients: {
      payments: {
        baseURL: process.env.PAYMENTS_API_URL,
        auth: {
          type: 'bearer',
          token: process.env.PAYMENTS_API_KEY
        }
      }
    }
  }
}
```

## Next Steps

- [Advanced Usage](./advanced-usage) - Interceptors and advanced patterns
- [API Reference](./api-reference) - Complete API documentation
