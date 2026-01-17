# Plan de Implementacion - Opcion B: Feature Modules

## Resumen Ejecutivo

Este documento detalla el plan de migracion de la estructura actual de Stratix hacia una organizacion por **Feature Modules**, donde cada funcionalidad es autocontenida e incluye sus interfaces e implementaciones.

---

## Estructura Propuesta

```
src/
├── shared/                    # Codigo compartido transversal
│   ├── result/
│   │   ├── Result.ts
│   │   ├── AsyncResults.ts
│   │   ├── helpers.ts
│   │   └── index.ts
│   ├── errors/
│   │   ├── FrameworkError.ts
│   │   ├── DecoratorKindError.ts
│   │   ├── DecoratorMissingError.ts
│   │   ├── ConfigurationLoadError.ts
│   │   ├── ConfigurationContentError.ts
│   │   ├── InvalidMetadataError.ts
│   │   ├── MetadataNotFoundError.ts
│   │   └── index.ts
│   └── index.ts
│
├── ddd/                       # Primitivas Domain-Driven Design
│   ├── entity/
│   │   ├── Entity.ts
│   │   ├── EntityId.ts
│   │   ├── EntityBuilder.ts
│   │   └── index.ts
│   ├── aggregate/
│   │   ├── AggregateRoot.ts
│   │   └── index.ts
│   ├── value-object/
│   │   ├── ValueObject.ts
│   │   └── index.ts
│   ├── event/
│   │   ├── DomainEvent.ts
│   │   └── index.ts
│   ├── service/
│   │   ├── DomainService.ts
│   │   └── index.ts
│   ├── error/
│   │   ├── DomainError.ts
│   │   └── index.ts
│   ├── validation/
│   │   ├── Validators.ts
│   │   └── index.ts
│   └── index.ts
│
├── cqrs/                      # Sistema CQRS completo
│   ├── command/
│   │   ├── Command.ts
│   │   ├── CommandHandler.ts
│   │   ├── CommandBus.ts
│   │   ├── InMemoryCommandBus.ts
│   │   └── index.ts
│   ├── query/
│   │   ├── Query.ts
│   │   ├── QueryHandler.ts
│   │   ├── QueryBus.ts
│   │   ├── InMemoryQueryBus.ts      # NUEVO
│   │   └── index.ts
│   ├── event/
│   │   ├── Event.ts
│   │   ├── EventHandler.ts
│   │   ├── EventBus.ts
│   │   ├── InMemoryEventBus.ts      # NUEVO
│   │   └── index.ts
│   └── index.ts
│
├── container/                 # Dependency Injection completo
│   ├── interfaces/
│   │   ├── Container.ts
│   │   ├── Resolver.ts
│   │   ├── DependencyLifetime.ts
│   │   └── index.ts
│   ├── awilix/
│   │   ├── AwilixContainerAdapter.ts
│   │   └── index.ts
│   └── index.ts
│
├── config/                    # Configuracion completa
│   ├── interfaces/
│   │   ├── ConfigurationSource.ts
│   │   ├── ConfigurationProvider.ts
│   │   ├── ConfigurationSchema.ts
│   │   └── index.ts
│   ├── sources/
│   │   ├── YamlConfigurationSource.ts
│   │   ├── EnvironmentConfigurationSource.ts
│   │   └── index.ts
│   ├── ConfigurationManager.ts
│   ├── defaults.ts                  # Movido desde defaults/
│   └── index.ts
│
├── logging/                   # Logging completo
│   ├── interfaces/
│   │   ├── Logger.ts
│   │   ├── LogTransport.ts
│   │   ├── LogEntry.ts
│   │   ├── LogLevel.ts
│   │   └── index.ts
│   ├── transports/
│   │   ├── ConsoleTransport.ts
│   │   ├── FileTransport.ts
│   │   └── index.ts
│   ├── config/
│   │   ├── LoggerConfig.ts
│   │   ├── SanitizeConfig.ts
│   │   └── index.ts
│   ├── StratixLogger.ts
│   ├── LoggerFactory.ts
│   ├── LoggerBuilder.ts
│   └── index.ts
│
├── metadata/                  # Sistema de metadata
│   ├── keys.ts
│   ├── storage.ts
│   ├── registry.ts
│   ├── Metadata.ts
│   ├── MetadataRegistry.ts
│   └── index.ts
│
├── decorators/                # Decoradores TypeScript
│   ├── StratixApp.ts
│   ├── Context.ts
│   ├── CommandHandler.ts
│   └── index.ts
│
├── context/                   # Bounded Contexts
│   ├── Context.ts
│   ├── ContextConfig.ts
│   ├── ContextMetadata.ts
│   ├── definitions.ts
│   └── index.ts
│
├── plugin/                    # Sistema de plugins
│   ├── Plugin.ts
│   ├── PluginMetadata.ts
│   ├── PluginContext.ts
│   └── index.ts
│
├── runtime/                   # Runtime del framework
│   ├── StratixApplication.ts
│   ├── bootstrap.ts
│   └── index.ts
│
├── ai/                        # Agentes IA (renombrado)
│   ├── domain/
│   ├── application/
│   ├── llm/
│   ├── tools/
│   ├── memory/
│   ├── prompts/
│   ├── guardrails/
│   ├── rag/
│   ├── workflows/
│   ├── observability/
│   ├── shared/
│   ├── core/
│   └── index.ts
│
└── index.ts                   # API publica
```

---

## Mapeo de Archivos: Origen -> Destino

### shared/ (Codigo Transversal)

| Archivo Actual | Destino | Accion |
|----------------|---------|--------|
| `result/Result.ts` | `shared/result/Result.ts` | Mover |
| `result/AsyncResults.ts` | `shared/result/AsyncResults.ts` | Mover |
| `result/helpers.ts` | `shared/result/helpers.ts` | Mover |
| `result/index.ts` | `shared/result/index.ts` | Mover |
| `errors/FrameworkError.ts` | `shared/errors/FrameworkError.ts` | Mover |
| `errors/DecoratorKindError.ts` | `shared/errors/DecoratorKindError.ts` | Mover |
| `errors/DecoratorMissingError.ts` | `shared/errors/DecoratorMissingError.ts` | Mover |
| `errors/ConfigurationLoadError.ts` | `shared/errors/ConfigurationLoadError.ts` | Mover |
| `errors/ConfigurationContentError.ts` | `shared/errors/ConfigurationContentError.ts` | Mover |
| `errors/InvalidMetadataError.ts` | `shared/errors/InvalidMetadataError.ts` | Mover |
| `errors/MetadataNotFoundError.ts` | `shared/errors/MetadataNotFoundError.ts` | Mover |
| `errors/index.ts` | `shared/errors/index.ts` | Mover + Actualizar |

### ddd/ (Primitivas DDD)

| Archivo Actual | Destino | Accion |
|----------------|---------|--------|
| `domain/Entity.ts` | `ddd/entity/Entity.ts` | Mover |
| `domain/EntityId.ts` | `ddd/entity/EntityId.ts` | Mover |
| `domain/EntityBuilder.ts` | `ddd/entity/EntityBuilder.ts` | Mover |
| `domain/AggregateRoot.ts` | `ddd/aggregate/AggregateRoot.ts` | Mover |
| `domain/ValueObject.ts` | `ddd/value-object/ValueObject.ts` | Mover |
| `domain/DomainEvent.ts` | `ddd/event/DomainEvent.ts` | Mover |
| `domain/DomainService.ts` | `ddd/service/DomainService.ts` | Mover |
| `domain/DomainError.ts` | `ddd/error/DomainError.ts` | Mover |
| `validation/Validators.ts` | `ddd/validation/Validators.ts` | Mover |

### cqrs/ (Sistema CQRS)

| Archivo Actual | Destino | Accion |
|----------------|---------|--------|
| `cqrs/command/Command.ts` | `cqrs/command/Command.ts` | Mantener |
| `cqrs/command/CommandHandler.ts` | `cqrs/command/CommandHandler.ts` | Mantener |
| `cqrs/command/CommandBus.ts` | `cqrs/command/CommandBus.ts` | Mantener |
| `cqrs/command/InMemoryCommandBus.ts` | `cqrs/command/InMemoryCommandBus.ts` | Mantener |
| `cqrs/query/Query.ts` | `cqrs/query/Query.ts` | Mantener |
| `cqrs/query/QueryHandler.ts` | `cqrs/query/QueryHandler.ts` | Mantener |
| `cqrs/query/QueryBus.ts` | `cqrs/query/QueryBus.ts` | Mantener |
| - | `cqrs/query/InMemoryQueryBus.ts` | **CREAR** |
| `cqrs/event/Event.ts` | `cqrs/event/Event.ts` | Mantener |
| `cqrs/event/EventHandler.ts` | `cqrs/event/EventHandler.ts` | Mantener |
| `cqrs/event/EventBus.ts` | `cqrs/event/EventBus.ts` | Mantener |
| - | `cqrs/event/InMemoryEventBus.ts` | **CREAR** |

### container/ (Dependency Injection)

| Archivo Actual | Destino | Accion |
|----------------|---------|--------|
| `di/Container.ts` | `container/interfaces/Container.ts` | Mover |
| `di/Resolver.ts` | `container/interfaces/Resolver.ts` | Mover |
| `di/DependencyLifetime.ts` | `container/interfaces/DependencyLifetime.ts` | Mover |
| `di/AwilixContainerAdapter.ts` | `container/awilix/AwilixContainerAdapter.ts` | Mover |

### config/ (Configuracion)

| Archivo Actual | Destino | Accion |
|----------------|---------|--------|
| `configuration/ConfigurationSource.ts` | `config/interfaces/ConfigurationSource.ts` | Mover |
| `configuration/ConfigurationProvider.ts` | `config/interfaces/ConfigurationProvider.ts` | Mover |
| `configuration/ConfigurationSchema.ts` | `config/interfaces/ConfigurationSchema.ts` | Mover |
| `configuration/ConfigurationManager.ts` | `config/ConfigurationManager.ts` | Mover |
| `configuration/YamlConfigurationSource.ts` | `config/sources/YamlConfigurationSource.ts` | Mover |
| `configuration/EnvironmentConfigurationSource.ts` | `config/sources/EnvironmentConfigurationSource.ts` | Mover |
| `defaults/Defaults.ts` | `config/defaults.ts` | Mover + Renombrar |

### logging/ (Sistema de Logs)

| Archivo Actual | Destino | Accion |
|----------------|---------|--------|
| `logging/Logger.ts` | `logging/interfaces/Logger.ts` | Mover |
| `logging/LogTransport.ts` | `logging/interfaces/LogTransport.ts` | Mover |
| `logging/LogEntry.ts` | `logging/interfaces/LogEntry.ts` | Mover |
| `logging/LogLevel.ts` | `logging/interfaces/LogLevel.ts` | Mover |
| `logging/ConsoleTransport.ts` | `logging/transports/ConsoleTransport.ts` | Mover |
| `logging/FileTransport.ts` | `logging/transports/FileTransport.ts` | Mover |
| `logging/LoggerConfig.ts` | `logging/config/LoggerConfig.ts` | Mover |
| `logging/SanitizeConfig.ts` | `logging/config/SanitizeConfig.ts` | Mover |
| `logging/StratixLogger.ts` | `logging/StratixLogger.ts` | Mantener |
| `logging/LoggerFactory.ts` | `logging/LoggerFactory.ts` | Mantener |
| `logging/LoggerBuilder.ts` | `logging/LoggerBuilder.ts` | Mantener |

### Otros Modulos (Sin cambios estructurales)

| Modulo | Accion |
|--------|--------|
| `metadata/` | Mantener estructura actual |
| `decorators/` | Mantener estructura actual |
| `context/` | Mantener estructura actual |
| `plugin/` | Mantener estructura actual |
| `runtime/` | Mantener estructura actual |
| `ai-agents/` | Renombrar a `ai/` |

---

## Cambios de Imports Requeridos

### Patron de Actualizacion

Todos los imports deben actualizarse siguiendo este patron:

```typescript
// ANTES
import { Result } from '../result/Result.js';
import { DomainError } from '../domain/DomainError.js';
import { Container } from '../container/Container.js';

// DESPUES
import { Result } from '../shared/result/Result.js';
import { DomainError } from '../ddd/error/DomainError.js';
import { Container } from '../container/interfaces/Container.js';
```

### Archivos con Mayor Impacto de Cambios

| Archivo | Imports a Actualizar |
|---------|---------------------|
| `runtime/StratixApplication.ts` | 11 imports |
| `runtime/bootstrap.ts` | 5 imports |
| `cqrs/command/InMemoryCommandBus.ts` | 5 imports |
| `metadata/Metadata.ts` | 4 imports |
| `metadata/MetadataRegistry.ts` | 4 imports |
| `decorators/StratixApp.ts` | 6 imports |
| `decorators/Context.ts` | 3 imports |
| `decorators/CommandHandler.ts` | 5 imports |
| `logging/StratixLogger.ts` | 5 imports |
| `logging/LoggerBuilder.ts` | 6 imports |

---

## Archivos Nuevos a Crear

### 1. `cqrs/query/InMemoryQueryBus.ts`

```typescript
import { Container } from '../../container/interfaces/Container.js';
import { MetadataRegistry } from '../../metadata/MetadataRegistry.js';
import { Query } from './Query.js';
import { QueryBus } from './QueryBus.js';
import { QueryHandler } from './QueryHandler.js';

export class InMemoryQueryBus implements QueryBus {
  constructor(
    private readonly container: Container,
    private readonly registry: MetadataRegistry
  ) {}

  async execute<TResult>(query: Query): Promise<TResult> {
    const queryClass = query.constructor as new (...args: unknown[]) => Query;
    const handlerClass = this.registry.queryToHandler.get(queryClass);

    if (!handlerClass) {
      throw new Error(`No handler registered for query: ${queryClass.name}`);
    }

    const handler = this.container.resolve<QueryHandler<Query, TResult>>(
      handlerClass.name
    );

    return handler.handle(query);
  }
}
```

### 2. `cqrs/event/InMemoryEventBus.ts`

```typescript
import { Event } from './Event.js';
import { EventBus } from './EventBus.js';
import { EventHandler } from './EventHandler.js';

export class InMemoryEventBus implements EventBus {
  private handlers: Map<string, EventHandler<Event>[]> = new Map();

  subscribe<TEvent extends Event>(
    eventType: new (...args: unknown[]) => TEvent,
    handler: EventHandler<TEvent>
  ): void {
    const key = eventType.name;
    const existing = this.handlers.get(key) ?? [];
    existing.push(handler as EventHandler<Event>);
    this.handlers.set(key, existing);
  }

  unsubscribe<TEvent extends Event>(
    eventType: new (...args: unknown[]) => TEvent,
    handler: EventHandler<TEvent>
  ): void {
    const key = eventType.name;
    const existing = this.handlers.get(key) ?? [];
    const index = existing.indexOf(handler as EventHandler<Event>);
    if (index > -1) {
      existing.splice(index, 1);
    }
  }

  async publish(event: Event): Promise<void> {
    const key = event.constructor.name;
    const handlers = this.handlers.get(key) ?? [];

    await Promise.all(handlers.map((h) => h.handle(event)));
  }

  async publishAll(events: Event[]): Promise<void> {
    await Promise.all(events.map((e) => this.publish(e)));
  }
}
```

### 3. Index Files Nuevos

#### `shared/index.ts`
```typescript
export * from './result/index.js';
export * from './errors/index.js';
```

#### `shared/result/index.ts`
```typescript
export type { Result } from './Result.js';
export { Success, Failure } from './Result.js';
export { AsyncResults } from './AsyncResults.js';
export { Results } from './helpers.js';
```

#### `shared/errors/index.ts`
```typescript
export { FrameworkError } from './FrameworkError.js';
export { DecoratorKindError } from './DecoratorKindError.js';
export { DecoratorMissingError } from './DecoratorMissingError.js';
export { ConfigurationLoadError } from './ConfigurationLoadError.js';
export { ConfigurationContentError } from './ConfigurationContentError.js';
export { InvalidMetadataError } from './InvalidMetadataError.js';
export { MetadataNotFoundError } from './MetadataNotFoundError.js';
```

#### `ddd/index.ts`
```typescript
// Entity
export { Entity } from './entity/Entity.js';
export { EntityId } from './entity/EntityId.js';
export { EntityBuilder } from './entity/EntityBuilder.js';

// Aggregate
export { AggregateRoot } from './aggregate/AggregateRoot.js';

// Value Object
export { ValueObject } from './value-object/ValueObject.js';

// Domain Event
export type { DomainEvent } from './event/DomainEvent.js';

// Domain Service
export { DomainService } from './service/DomainService.js';
export type { DomainServiceMethod, AsyncDomainServiceMethod } from './service/DomainService.js';

// Domain Error
export { DomainError } from './error/DomainError.js';

// Validation
export { Validators } from './validation/Validators.js';
```

#### `container/index.ts`
```typescript
export type { Container, RegistrationOptions } from './interfaces/Container.js';
export type { Resolver } from './interfaces/Resolver.js';
export { DependencyLifetime } from './interfaces/DependencyLifetime.js';
export { AwilixContainerAdapter } from './awilix/AwilixContainerAdapter.js';
```

#### `config/index.ts`
```typescript
export type { ConfigurationSource } from './interfaces/ConfigurationSource.js';
export type { ConfigurationProvider } from './interfaces/ConfigurationProvider.js';
export type { ConfigurationSchema } from './interfaces/ConfigurationSchema.js';
export { ConfigurationManager } from './ConfigurationManager.js';
export { YamlConfigurationSource } from './sources/YamlConfigurationSource.js';
export { EnvironmentConfigurationSource } from './sources/EnvironmentConfigurationSource.js';
export { APP_DEFAULTS } from './defaults.js';
```

#### `logging/index.ts`
```typescript
// Interfaces
export type { Logger } from './interfaces/Logger.js';
export type { LogTransport } from './interfaces/LogTransport.js';
export type { LogEntry } from './interfaces/LogEntry.js';
export { LogLevel } from './interfaces/LogLevel.js';

// Config
export type { LoggerConfig, LogFormat } from './config/LoggerConfig.js';
export type { SanitizeConfig } from './config/SanitizeConfig.js';

// Transports
export { ConsoleTransport } from './transports/ConsoleTransport.js';
export { FileTransport } from './transports/FileTransport.js';

// Implementation
export { StratixLogger } from './StratixLogger.js';
export { LoggerFactory } from './LoggerFactory.js';
export { LoggerBuilder } from './LoggerBuilder.js';
```

#### `cqrs/index.ts`
```typescript
// Command
export type { Command } from './command/Command.js';
export type { CommandHandler } from './command/CommandHandler.js';
export type { CommandBus } from './command/CommandBus.js';
export { InMemoryCommandBus } from './command/InMemoryCommandBus.js';

// Query
export type { Query } from './query/Query.js';
export type { QueryHandler } from './query/QueryHandler.js';
export type { QueryBus } from './query/QueryBus.js';
export { InMemoryQueryBus } from './query/InMemoryQueryBus.js';

// Event
export type { Event } from './event/Event.js';
export type { EventHandler } from './event/EventHandler.js';
export type { EventBus } from './event/EventBus.js';
export { InMemoryEventBus } from './event/InMemoryEventBus.js';
```

#### `src/index.ts` (API Publica)
```typescript
// Shared utilities
export * from './shared/index.js';

// DDD Primitives
export * from './ddd/index.js';

// CQRS
export * from './cqrs/index.js';

// Dependency Injection
export * from './container/index.js';

// Configuration
export * from './config/index.js';

// Logging
export * from './logging/index.js';

// Metadata System
export * from './metadata/index.js';

// Decorators
export * from './decorators/index.js';

// Context System
export * from './context/index.js';

// Plugin System
export * from './plugin/index.js';

// Runtime
export * from './runtime/index.js';

// AI Agents (namespace export para evitar conflictos)
export * as AI from './ai/index.js';
```

---

## Plan de Ejecucion por Fases

### Fase 1: Preparacion (Sin romper nada)

1. Crear estructura de carpetas vacia
2. Crear todos los archivos `index.ts` nuevos
3. Crear `InMemoryQueryBus.ts` e `InMemoryEventBus.ts`

### Fase 2: Migracion shared/

1. Mover `result/` a `shared/result/`
2. Mover `errors/` a `shared/errors/`
3. Actualizar imports en archivos dependientes

### Fase 3: Migracion ddd/

1. Mover archivos de `domain/` a subcarpetas de `ddd/`
2. Mover `validation/` a `ddd/validation/`
3. Actualizar imports

### Fase 4: Migracion container/

1. Mover archivos de `di/` a `container/`
2. Actualizar imports

### Fase 5: Migracion config/

1. Mover archivos de `configuration/` a `config/`
2. Mover `defaults/Defaults.ts` a `config/defaults.ts`
3. Eliminar carpeta `defaults/`
4. Actualizar imports

### Fase 6: Migracion logging/

1. Reorganizar `logging/` en subcarpetas
2. Actualizar imports internos

### Fase 7: Finalizacion

1. Renombrar `ai-agents/` a `ai/`
2. Poblar `src/index.ts`
3. Eliminar carpetas vacias
4. Ejecutar tests
5. Ejecutar linter

---

## Comandos de Migracion

```bash
# Fase 1: Crear estructura
mkdir -p src/shared/{result,errors}
mkdir -p src/ddd/{entity,aggregate,value-object,event,service,error,validation}
mkdir -p src/container/{interfaces,awilix}
mkdir -p src/config/{interfaces,sources}
mkdir -p src/logging/{interfaces,transports,config}

# Fase 2: Mover shared
mv src/result/* src/shared/result/
mv src/errors/* src/shared/errors/
rmdir src/result src/errors

# Fase 3: Mover ddd
mv src/domain/Entity.ts src/ddd/entity/
mv src/domain/EntityId.ts src/ddd/entity/
mv src/domain/EntityBuilder.ts src/ddd/entity/
mv src/domain/AggregateRoot.ts src/ddd/aggregate/
mv src/domain/ValueObject.ts src/ddd/value-object/
mv src/domain/DomainEvent.ts src/ddd/event/
mv src/domain/DomainService.ts src/ddd/service/
mv src/domain/DomainError.ts src/ddd/error/
mv src/validation/Validators.ts src/ddd/validation/
rmdir src/domain src/validation

# Fase 4: Mover container
mv src/container/Container.ts src/container/interfaces/
mv src/container/Resolver.ts src/container/interfaces/
mv src/container/DependencyLifetime.ts src/container/interfaces/
mv src/container/AwilixContainerAdapter.ts src/container/awilix/
rmdir src/container

# Fase 5: Mover config
mv src/config/ConfigurationSource.ts src/config/interfaces/
mv src/config/ConfigurationProvider.ts src/config/interfaces/
mv src/config/ConfigurationSchema.ts src/config/interfaces/
mv src/config/ConfigurationManager.ts src/config/
mv src/config/YamlConfigurationSource.ts src/config/sources/
mv src/config/EnvironmentConfigurationSource.ts src/config/sources/
mv src/defaults/Defaults.ts src/config/defaults.ts
rmdir src/config src/defaults

# Fase 6: Reorganizar logging
mkdir -p src/logging/{interfaces,transports,config}
mv src/logging/Logger.ts src/logging/interfaces/
mv src/logging/LogTransport.ts src/logging/interfaces/
mv src/logging/LogEntry.ts src/logging/interfaces/
mv src/logging/LogLevel.ts src/logging/interfaces/
mv src/logging/ConsoleTransport.ts src/logging/transports/
mv src/logging/FileTransport.ts src/logging/transports/
mv src/logging/LoggerConfig.ts src/logging/config/
mv src/logging/SanitizeConfig.ts src/logging/config/

# Fase 7: Renombrar ai
mv src/ai src/ai
```

---

## Validacion Post-Migracion

```bash
# Verificar que compila
pnpm typecheck

# Ejecutar tests
pnpm test

# Verificar linting
pnpm lint

# Build completo
pnpm build
```

---

## Riesgos y Mitigacion

| Riesgo | Probabilidad | Mitigacion |
|--------|--------------|------------|
| Imports circulares | Media | Revisar grafo de dependencias antes de mover |
| Tests rotos | Alta | Actualizar imports en tests junto con codigo |
| IDE cache desactualizado | Media | Reiniciar TypeScript server despues de cambios |
| Conflictos en git | Baja | Hacer migracion en branch dedicado |

---

## Metricas de Exito

- [ ] `pnpm typecheck` sin errores
- [ ] `pnpm test` 100% passing
- [ ] `pnpm lint` sin errores
- [ ] `pnpm build` exitoso
- [ ] Todos los archivos `index.ts` exportan correctamente
- [ ] `src/index.ts` expone API publica completa
