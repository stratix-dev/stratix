# Metadata System Architecture Diagrams

## Current Architecture

### Storage Structure

```mermaid
graph TD
    A[Class Constructor] -->|has property| B[Symbol: STRATIX_METADATA]
    B -->|contains| C{Metadata Object}
    C -->|string key| D["stratix:app"]
    C -->|string key| E["stratix:context"]
    C -->|string key| F["stratix:command_handler"]
    D --> G[AppMetadata Object]
    E --> H[ContextMetadata Object]
    F --> I[CommandHandlerMetadata Object]

    style A fill:#e1f5ff
    style B fill:#ffe1e1
    style C fill:#fff4e1
    style D fill:#ffe1e1
    style E fill:#ffe1e1
    style F fill:#ffe1e1
```

### Component Interaction Flow

```mermaid
sequenceDiagram
    participant Decorator
    participant MetadataWriter
    participant ClassConstructor
    participant MetadataReader
    participant MetadataRegistry
    participant StratixApplication

    Note over Decorator,ClassConstructor: Decorator Application Phase
    Decorator->>MetadataWriter: setXMetadata(target, metadata)
    MetadataWriter->>ClassConstructor: Set Symbol property
    ClassConstructor-->>MetadataWriter: OK
    MetadataWriter-->>Decorator: OK

    Note over MetadataReader,StratixApplication: Bootstrap Phase
    StratixApplication->>MetadataRegistry: new MetadataRegistry(appClass)
    MetadataRegistry->>MetadataReader: getAppMetadata(appClass)
    MetadataReader->>ClassConstructor: Read Symbol property
    ClassConstructor-->>MetadataReader: AppMetadata
    MetadataReader-->>MetadataRegistry: AppMetadata

    loop For each context
        MetadataRegistry->>MetadataReader: getContextMetadata(contextClass)
        MetadataReader->>ClassConstructor: Read Symbol property
        ClassConstructor-->>MetadataReader: ContextMetadata
        MetadataReader-->>MetadataRegistry: ContextMetadata

        loop For each handler
            MetadataRegistry->>MetadataReader: getCommandHandlerMetadata(handlerClass)
            MetadataReader->>ClassConstructor: Read Symbol property
            ClassConstructor-->>MetadataReader: HandlerMetadata
            MetadataReader-->>MetadataRegistry: HandlerMetadata
        end
    end

    MetadataRegistry-->>StratixApplication: Registry with indexes
```

### Current Problems

```mermaid
mindmap
  root((Metadata Issues))
    Type Safety
      any casts everywhere
      No runtime validation
      Malformed data accepted
    Extensibility
      Hard coded types
      Can't add new decorators easily
      No plugin system
    Performance
      No caching
      Eager loading
      Repeated reads
    Architecture
      Mixed responsibilities
      Direct class pollution
      Symbol/string confusion
    Testing
      Zero test coverage
      No validation tests
      Hard to mock
```

## Proposed Architecture

### Improved Storage Structure

```mermaid
graph TD
    A[Class Constructor] -->|has property| B[Symbol.for: stratix:metadata]
    B -->|contains| C{Metadata Map}
    C -->|Symbol key| D[Symbol.for: stratix:app]
    C -->|Symbol key| E[Symbol.for: stratix:context]
    C -->|Symbol key| F[Symbol.for: stratix:command_handler]
    D --> G[Validated AppMetadata]
    E --> H[Validated ContextMetadata]
    F --> I[Validated CommandHandlerMetadata]

    J[MetadataCache] -.->|caches| G
    J -.->|caches| H
    J -.->|caches| I

    K[MetadataValidator] -->|validates before storage| G
    K -->|validates before storage| H
    K -->|validates before storage| I

    style A fill:#e1f5ff
    style B fill:#c8e6c9
    style C fill:#fff4e1
    style D fill:#c8e6c9
    style E fill:#c8e6c9
    style F fill:#c8e6c9
    style J fill:#fff9c4
    style K fill:#f8bbd0
```

### Improved Component Architecture

```mermaid
graph TB
    subgraph "Decorator Layer"
        D1["@StratixApp"]
        D2["@Context"]
        D3["@CommandHandler"]
    end

    subgraph "Metadata Core"
        MW[MetadataWriter]
        MR[MetadataReader]
        MC[MetadataCache]
        MV[MetadataValidator]
        ML[MetadataLifecycle]
    end

    subgraph "Storage Layer"
        MS[MetadataStorage]
        CC[Class Constructors]
    end

    subgraph "Registry Layer"
        MReg[MetadataRegistry]
        CHI[CommandHandlerIndex]
        QHI[QueryHandlerIndex]
        EHI[EventHandlerIndex]
        Val[Validator]
    end

    subgraph "Application Layer"
        SA[StratixApplication]
        MQ[MetadataQuery]
    end

    D1 --> MW
    D2 --> MW
    D3 --> MW

    MW --> ML
    ML --> MV
    MV --> MS
    MS --> CC

    SA --> MReg
    SA --> MQ
    MReg --> Val
    MReg --> CHI
    MReg --> QHI
    MReg --> EHI
    CHI --> MR
    QHI --> MR
    EHI --> MR
    MR --> MC
    MC --> MS

    MQ --> MR

    style D1 fill:#e1f5ff
    style D2 fill:#e1f5ff
    style D3 fill:#e1f5ff
    style MW fill:#c8e6c9
    style MR fill:#c8e6c9
    style MC fill:#fff9c4
    style MV fill:#f8bbd0
    style MS fill:#e1bee7
```

### Metadata Lifecycle

```mermaid
sequenceDiagram
    participant D as Decorator
    participant MW as MetadataWriter
    participant ML as MetadataLifecycle
    participant MV as MetadataValidator
    participant MS as MetadataStorage
    participant MC as MetadataCache

    D->>MW: setMetadata(target, key, value)
    MW->>ML: runHooks('beforeSet', ...)
    ML->>MV: validate(metadata)

    alt Validation fails
        MV-->>ML: throw InvalidMetadataError
        ML-->>MW: throw error
        MW-->>D: throw error
    else Validation succeeds
        MV-->>ML: OK
        ML-->>MW: OK
        MW->>MS: store(target, key, value)
        MS-->>MW: OK
        MW->>ML: runHooks('afterSet', ...)
        ML-->>MW: OK
        MW->>MC: invalidate(target, key)
        MC-->>MW: OK
        MW-->>D: OK
    end
```

### Improved MetadataRegistry Separation

```mermaid
graph TB
    subgraph "MetadataRegistry - Orchestrator Only"
        MR[MetadataRegistry]
    end

    subgraph "Validation - Single Responsibility"
        V[MetadataValidator]
        V1[validateApp]
        V2[validateContext]
        V3[validateHandler]
        V --> V1
        V --> V2
        V --> V3
    end

    subgraph "Indexing - Single Responsibility"
        CHI[CommandHandlerIndex]
        QHI[QueryHandlerIndex]
        EHI[EventHandlerIndex]
    end

    subgraph "Reading - Single Responsibility"
        MRead[MetadataReader]
        Cache[MetadataCache]
        MRead --> Cache
    end

    MR --> V
    MR --> CHI
    MR --> QHI
    MR --> EHI
    MR --> MRead

    style MR fill:#e1f5ff
    style V fill:#f8bbd0
    style CHI fill:#c8e6c9
    style QHI fill:#c8e6c9
    style EHI fill:#c8e6c9
    style MRead fill:#fff9c4
```

### Type Safety Flow

```mermaid
graph LR
    A[Raw Metadata] -->|Step 1| B[Schema Validation]
    B -->|Step 2| C[Type Guard Check]
    C -->|Step 3| D[Type Assertion]
    D --> E[Typed Metadata]

    B -.->|If fails| F[InvalidMetadataError]
    C -.->|If fails| F

    subgraph "Validation Methods"
        B
        C
    end

    subgraph "Safe Output"
        E
    end

    style A fill:#ffe1e1
    style B fill:#fff9c4
    style C fill:#fff9c4
    style D fill:#fff9c4
    style E fill:#c8e6c9
    style F fill:#ffcdd2
```

### Metadata Inheritance

```mermaid
graph TB
    A[BaseContext with metadata] --> B[DerivedContext with metadata]
    B --> C[Final Context with metadata]

    A1[BaseContext Metadata] -.->|inherited| B1[Merged Metadata]
    B1 -.->|inherited| C1[Final Merged Metadata]

    D[MetadataReader] -->|getMetadata with inheritance| A
    D -->|walks prototype chain| B
    D -->|walks prototype chain| C
    D -->|merges all| C1

    style A fill:#e1f5ff
    style B fill:#e1f5ff
    style C fill:#e1f5ff
    style A1 fill:#fff9c4
    style B1 fill:#fff9c4
    style C1 fill:#c8e6c9
    style D fill:#c8e6c9
```

### Query API Architecture

```mermaid
graph TD
    A[MetadataQuery API] --> B[findAllDecoratedClasses]
    A --> C[findClassesByMetadata]
    A --> D[getApplicationGraph]
    A --> E[validateArchitecturalRules]

    B --> F[Use Case: List all contexts]
    C --> G[Use Case: Find handlers by pattern]
    D --> H[Use Case: Generate documentation]
    E --> I[Use Case: Enforce conventions]

    J[MetadataReader] -.->|reads from| B
    J -.->|reads from| C
    J -.->|reads from| D
    J -.->|reads from| E

    style A fill:#e1f5ff
    style B fill:#c8e6c9
    style C fill:#c8e6c9
    style D fill:#c8e6c9
    style E fill:#c8e6c9
    style F fill:#fff9c4
    style G fill:#fff9c4
    style H fill:#fff9c4
    style I fill:#fff9c4
```

## Comparison: Before and After

### Storage Mechanism

```mermaid
graph LR
    subgraph BEFORE["BEFORE - Direct Property Access"]
        A1[Class] --> B1[Symbol property]
        B1 --> C1[String keys]
        C1 --> D1[any typed values]
        D1 -.->|Issues| E1[Type unsafe / No validation / No caching]
    end

    subgraph AFTER["AFTER - Layered Access"]
        A2[Class] --> B2[Symbol property]
        B2 --> C2[Symbol keys]
        C2 --> D2[Validated values]
        D2 --> E2[Cache Layer]
        E2 --> F2[Validation Layer]
        F2 -.->|Benefits| G2[Type safe / Validated / Cached / Extensible]
    end

    style E1 fill:#ffcdd2
    style G2 fill:#c8e6c9
```

### Extensibility

```mermaid
graph TB
    subgraph BEFORE["BEFORE - Hard Coded"]
        A1[Add New Decorator] --> B1[1. Modify metadataKeys.ts]
        B1 --> C1[2. Modify types.ts]
        C1 --> D1[3. Modify MetadataWriter]
        D1 --> E1[4. Modify MetadataReader]
        E1 --> F1[5. Modify MetadataRegistry]
        F1 -.->|Issues| G1[5 files to change / High coupling / Error prone]
    end

    subgraph AFTER["AFTER - Plugin Based"]
        A2[Add New Decorator] --> B2[1. Define metadata type]
        B2 --> C2[2. Create Symbol key]
        C2 --> D2[3. Use generic API]
        D2 -.->|Benefits| E2[3 steps / No core changes / Type safe]
    end

    style G1 fill:#ffcdd2
    style E2 fill:#c8e6c9
```

## Implementation Phases

```mermaid
gantt
    title Metadata System Improvement Roadmap
    dateFormat YYYY-MM-DD
    section Phase 1 - Critical
    Fix Symbol usage           :p1-1, 2026-01-13, 1d
    Add type validation        :p1-2, after p1-1, 2d
    Eliminate duplication      :p1-3, after p1-1, 1d
    Add comprehensive tests    :p1-4, after p1-2, 2d
    section Phase 2 - Architecture
    Separate Registry concerns :p2-1, after p1-4, 2d
    Add metadata caching       :p2-2, after p1-4, 1d
    Improve extensibility      :p2-3, after p2-1, 3d
    section Phase 3 - Features
    Add metadata inheritance   :p3-1, after p2-3, 2d
    Add query API              :p3-2, after p2-3, 2d
    Add lifecycle hooks        :p3-3, after p3-1, 2d
    Implement lazy loading     :p3-4, after p3-2, 1d
```

## Decision Tree: When to Use Each Pattern

```mermaid
graph TD
    A[Need to work with metadata?] -->|Yes| B{What operation?}

    B -->|Store metadata| C{New decorator type?}
    C -->|Yes| D["1. Define metadata interface / 2. Create Symbol key / 3. Use MetadataWriter.setMetadata"]
    C -->|No| E[Use existing MetadataWriter method]

    B -->|Read metadata| F{Need caching?}
    F -->|Yes| G[Use MetadataReader with cache]
    F -->|No| H[Direct MetadataReader call]

    B -->|Query across app| I{What to find?}
    I -->|All decorated classes| J[MetadataQuery.findAllDecoratedClasses]
    I -->|By condition| K[MetadataQuery.findClassesByMetadata]
    I -->|Full graph| L[MetadataQuery.getApplicationGraph]

    B -->|Validate| M{Validation type?}
    M -->|Decorator present| N[MetadataValidator.validateX]
    M -->|Structure valid| O[Use Zod schema]
    M -->|Custom rule| P[MetadataLifecycle hook]

    style A fill:#e1f5ff
    style D fill:#c8e6c9
    style E fill:#c8e6c9
    style G fill:#c8e6c9
    style H fill:#c8e6c9
    style J fill:#c8e6c9
    style K fill:#c8e6c9
    style L fill:#c8e6c9
    style N fill:#c8e6c9
    style O fill:#c8e6c9
    style P fill:#c8e6c9
```
