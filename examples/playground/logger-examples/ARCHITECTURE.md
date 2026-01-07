# @Logger Decorator Architecture

This document explains the internal architecture and flow of the `@Logger` property decorator.

## Architecture Overview

```mermaid
graph TB
    subgraph "Application Layer"
        A[Command Handler]
        B[Event Handler]
        C[Domain Service]
    end

    subgraph "Decorator Layer"
        D[@Logger Decorator]
        E[MetadataStorage]
    end

    subgraph "Runtime Layer"
        F[StratixApplication]
        G[DI Container]
    end

    subgraph "Infrastructure Layer"
        H[StratixLogger]
        I[Logger Interface]
    end

    A -->|uses| D
    B -->|uses| D
    C -->|uses| D
    D -->|stores metadata| E
    D -->|resolves from| G
    F -->|registers| H
    G -->|provides| H
    H -->|implements| I
```

## Initialization Flow

```mermaid
sequenceDiagram
    participant App as Application Bootstrap
    participant SA as StratixApplication
    participant DC as DI Container
    participant MS as MetadataStorage
    participant Dec as @Logger Decorator
    participant CH as Command Handler

    App->>SA: bootstrap(AppClass)
    SA->>DC: registerCoreServices()
    DC->>DC: register('logger', StratixLogger)

    Note over Dec,CH: Class Definition Phase
    Dec->>MS: addLoggerMetadata(target, metadata)

    Note over CH: Instance Creation Phase
    CH->>Dec: addInitializer callback
    Dec->>CH: defineProperty for logger

    Note over CH: First Logger Access
    CH->>Dec: this.logger (getter)
    Dec->>DC: resolve('logger')
    DC-->>Dec: StratixLogger instance
    Dec->>Dec: createContextualLogger(baseLogger, context)
    Dec-->>CH: Contextual Logger
    Dec->>CH: Cache logger for future access
```

## Property Decorator Flow

```mermaid
flowchart TD
    A[Class with @Logger] --> B{Decorator Applied}
    B --> C[Store Metadata]
    C --> D[Add Initializer]
    D --> E[Define Property Getter]

    F[Instance Created] --> G[Initializer Runs]
    G --> H[Property Defined]

    I[Access this.logger] --> J{Logger Cached?}
    J -->|Yes| K[Return Cached Logger]
    J -->|No| L[Resolve from DI]
    L --> M[Create Contextual Wrapper]
    M --> N[Cache Logger]
    N --> K
```

## Logger Resolution Strategy

```mermaid
flowchart LR
    A[this.logger accessed] --> B{Check cache}
    B -->|Found| C[Return cached logger]
    B -->|Not found| D{Check this.getLogger}
    D -->|Exists| E[Call this.getLogger]
    D -->|Not exists| F{Check this.container}
    F -->|Exists| G[this.container.resolve]
    F -->|Not exists| H[Fallback to console]

    E --> I[Wrap with context]
    G --> I
    H --> I
    I --> J[Cache result]
    J --> C
```

## Contextual Logger Wrapper

The decorator wraps the base logger to automatically include context:

```mermaid
flowchart TD
    A[Base Logger from DI] --> B[Contextual Wrapper]
    B --> C{Logger Method Called}

    C -->|debug| D[Add context to args]
    C -->|info| E[Add context to args]
    C -->|warn| F[Add context to args]
    C -->|error| G[Add context to args]
    C -->|fatal| H[Add context to args]

    D --> I[Call baseLogger.debug]
    E --> J[Call baseLogger.info]
    F --> K[Call baseLogger.warn]
    G --> L[Call baseLogger.error]
    H --> M[Call baseLogger.fatal]
```

## Multiple Loggers in Same Class

```mermaid
graph TB
    subgraph "PaymentService Class"
        A[@Logger context: 'Payments']
        B[@Logger context: 'Security']
        C[@Logger context: 'Performance']
    end

    subgraph "Metadata Storage"
        D[Payments metadata]
        E[Security metadata]
        F[Performance metadata]
    end

    subgraph "DI Container"
        G[Base Logger]
    end

    subgraph "Contextual Loggers"
        H[Payments Logger]
        I[Security Logger]
        J[Performance Logger]
    end

    A -->|stores| D
    B -->|stores| E
    C -->|stores| F

    A -->|resolves| G
    B -->|resolves| G
    C -->|resolves| G

    A -->|creates| H
    B -->|creates| I
    C -->|creates| J

    H -->|wraps| G
    I -->|wraps| G
    J -->|wraps| G
```

## Metadata Storage Structure

```mermaid
classDiagram
    class MetadataStorage {
        -WeakMap~Ctor, LoggerMetadata[]~ loggers
        +addLoggerMetadata(target, metadata)
        +getLoggerMetadata(target)
    }

    class LoggerMetadata {
        +string propertyKey
        +string context
        +string level
        +Ctor target
    }

    class Logger {
        +debug(message, context)
        +info(message, context)
        +warn(message, context)
        +error(message, context)
        +fatal(message, context)
        +log(level, message, context)
    }

    MetadataStorage "1" --> "*" LoggerMetadata
    Logger <|.. StratixLogger
```

## Log Context Enrichment

```mermaid
flowchart LR
    A[User Calls this.logger.info] --> B[Contextual Logger Wrapper]

    B --> C{Merge Context}

    subgraph "Context Merging"
        D[User Context Object]
        E[Decorator Context]
        F[Merged Context]

        D --> F
        E --> F
    end

    C --> D
    C --> E
    F --> G[Base Logger]

    G --> H[Log Output]

    style F fill:#90EE90
    style H fill:#87CEEB
```

Example:
```typescript
// User code
this.logger.info('Processing order', { orderId: '123' });

// Decorator adds context
// Result: { orderId: '123', context: 'OrderService' }
```

## Lifecycle Comparison

### Without @Logger

```mermaid
sequenceDiagram
    participant C as Constructor
    participant DI as DI Container
    participant H as Handler

    C->>DI: Inject logger dependency
    DI->>C: Provide logger instance
    C->>H: Store logger in this.logger
    H->>H: Use this.logger
```

### With @Logger

```mermaid
sequenceDiagram
    participant D as Decorator
    participant C as Constructor
    participant H as Handler
    participant DI as DI Container

    Note over D: Class definition time
    D->>D: Setup property getter

    Note over C: Instance creation
    C->>H: Instance ready

    Note over H: First logger access
    H->>D: this.logger getter
    D->>DI: resolve('logger')
    DI-->>D: Base logger
    D->>D: Wrap with context
    D-->>H: Contextual logger

    Note over H: Subsequent accesses
    H->>D: this.logger getter
    D-->>H: Cached logger (instant)
```

## Error Handling Flow

```mermaid
flowchart TD
    A[Access this.logger] --> B{Try resolve from DI}
    B -->|Success| C[Create contextual wrapper]
    B -->|Failure| D{DI Container exists?}

    D -->|No| E[Create console logger]
    D -->|Yes| F[Log warning]
    F --> E

    C --> G[Cache and return]
    E --> H[Fallback logger]
    H --> G

    style E fill:#FFB6C1
    style F fill:#FFD700
```

## Performance Optimization

The decorator uses several optimization strategies:

```mermaid
graph TD
    A[Logger Property Access] --> B{Check Cache}
    B -->|Hit| C[Return Immediately]
    B -->|Miss| D[Resolve from DI]
    D --> E[Create Wrapper]
    E --> F[Cache Result]
    F --> C

    style C fill:#90EE90
    style D fill:#FFB6C1

    G[Subsequent Accesses] --> B

    H[Benefits] --> I[No DI lookups]
    H --> J[No wrapper creation]
    H --> K[Direct property access]
```

Benefits:
- First access: ~1-2ms (DI resolution + wrapper creation)
- Subsequent accesses: <0.01ms (cached property access)
- Memory: One wrapper instance per logger per class instance

## Integration Points

```mermaid
graph TB
    subgraph "Stratix Core"
        A[Logger Interface]
        B[Container Interface]
    end

    subgraph "Stratix Framework"
        C[@Logger Decorator]
        D[StratixApplication]
        E[MetadataStorage]
        F[StratixLogger]
    end

    subgraph "User Application"
        G[Command Handlers]
        H[Event Handlers]
        I[Domain Services]
    end

    A -->|implemented by| F
    B -->|used by| C
    C -->|used by| G
    C -->|used by| H
    C -->|used by| I
    D -->|registers| F
    C -->|stores in| E
```

## Thread Safety

The decorator is thread-safe in Node.js single-threaded environment:

```mermaid
flowchart TD
    A[Multiple Concurrent Requests] --> B[Separate Handler Instances]
    B --> C[Each Has Own Logger Property]
    C --> D[Independent Caches]
    D --> E[No Shared State]
    E --> F[Thread Safe]

    style F fill:#90EE90
```

Note: Each class instance has its own cached logger, preventing race conditions.

## Summary

The `@Logger` decorator provides:

1. Automatic dependency injection without constructor parameters
2. Lazy initialization for performance
3. Contextual logging with minimal boilerplate
4. Multiple logger instances per class
5. Type safety with TypeScript
6. Caching for optimal performance
7. Graceful fallbacks when DI is unavailable
8. Clean separation of concerns
