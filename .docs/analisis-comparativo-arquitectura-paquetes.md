# Análisis Comparativo: Arquitectura de Paquetes en Frameworks Modernos

## Contexto

Este documento analiza si la separación actual de paquetes en Stratix (`@stratix/core` y `@stratix/framework`) es óptima comparándola con frameworks establecidos en la industria.

---

## 1. Investigación: Cómo lo Hacen Otros Frameworks

### 1.1 NestJS

**Estructura de paquetes:**

```
@nestjs/common      → Decoradores, pipes, guards, interfaces comunes
@nestjs/core        → Runtime, contenedor DI, módulo del ciclo de vida
@nestjs/platform-*  → Adaptadores (Express, Fastify, Socket.io, WS)
@nestjs/microservices → Soporte para microservicios
@nestjs/testing     → Utilidades de testing
@nestjs/websockets  → WebSockets
```

**Filosofía:**

- `common` contiene las **abstracciones y decoradores** que el usuario usa directamente
- `core` contiene el **runtime y motor de ejecución** (el usuario raramente lo importa directamente)
- Los `platform-*` son **adaptadores de infraestructura**

**Observación clave:** NestJS separa por **responsabilidad funcional**, no por "abstracción vs implementación".

---

### 1.2 Effect-TS

**Estructura de paquetes:**

```
effect              → Paquete principal con Effect, Stream, Schema, etc.
@effect/platform    → APIs de plataforma (FileSystem, HTTP, etc.)
@effect/platform-*  → Implementaciones específicas (node, browser, bun)
@effect/sql         → Abstracciones SQL
@effect/sql-*       → Implementaciones (pg, mysql, sqlite, etc.)
@effect/cli         → Construcción de CLIs
@effect/cluster     → Clustering
@effect/ai          → Integraciones con IA
@effect/rpc         → Remote Procedure Calls
@effect/workflow    → Motor de workflows
```

**Filosofía:**

- Un **paquete principal monolítico** (`effect`) con todo lo esencial
- Paquetes adicionales para **funcionalidades específicas** (sql, cli, ai, etc.)
- Separación clara entre **abstracción** (`@effect/sql`) e **implementación** (`@effect/sql-pg`)

**Observación clave:** Effect usa un core **grande y cohesivo**, separando solo cuando hay implementaciones intercambiables.

---

### 1.3 MediatR (.NET)

**Estructura de paquetes:**

```
MediatR             → Implementación completa del mediator
MediatR.Contracts   → Solo interfaces (IRequest, INotification, IStreamRequest)
```

**Filosofía:**

- **Paquete de contratos separado** para escenarios donde solo necesitas los tipos (APIs, Blazor)
- El paquete principal incluye **todo**: interfaces + implementaciones + DI

**Observación clave:** Solo separa contratos cuando hay un **caso de uso real** (proyectos cliente que no necesitan la implementación).

---

### 1.4 TypeORM

**Estructura de paquetes:**

```
typeorm             → Paquete único monolítico
```

**Contenido interno:**

```
src/
├── cache/              → Sistema de caché
├── commands/           → CLI commands
├── connection/         → Manejo de conexiones
├── data-source/        → DataSource
├── decorator/          → Decoradores (@Entity, @Column, etc.)
├── driver/             → Drivers de bases de datos
├── entity-manager/     → EntityManager
├── error/              → Errores
├── find-options/       → Opciones de búsqueda
├── logger/             → Logging
├── metadata/           → Sistema de metadatos
├── migration/          → Migraciones
├── query-builder/      → Query builder
├── repository/         → Repositorios
├── schema-builder/     → Constructor de esquemas
├── subscriber/         → Suscriptores
└── util/               → Utilidades
```

**Filosofía:**

- **Todo en un paquete** para simplicidad del usuario
- Separación interna por **dominio funcional**

**Observación clave:** Un framework ORM completo en un solo paquete. Los drivers están **integrados**, no separados.

---

### 1.5 Angular

**Estructura de paquetes:**

```
@angular/core              → DI, componentes, lifecycle hooks, change detection
@angular/common            → Directivas comunes, pipes, HttpClient
@angular/forms             → Formularios reactivos y template-driven
@angular/router            → Enrutamiento
@angular/platform-browser  → Renderizado en navegador
@angular/platform-server   → SSR
@angular/compiler          → Compilador AOT/JIT
@angular/animations        → Sistema de animaciones
```

**Filosofía:**

- Separación por **dominio funcional** (forms, router, animations)
- `core` es el **motor fundamental** (DI, componentes)
- `common` son **utilidades de uso frecuente**
- `platform-*` son **adaptadores de plataforma**

**Observación clave:** Angular separa cuando hay **funcionalidades opcionales** que no todos los proyectos necesitan.

---

## 2. Patrones Identificados

### 2.1 Razones Válidas para Separar Paquetes

| Razón                                | Ejemplo                                           | Aplica a Stratix?           |
| ------------------------------------ | ------------------------------------------------- | --------------------------- |
| **Funcionalidad opcional**           | `@angular/forms`, `@nestjs/websockets`            | ⚠️ Parcialmente (ai-agents) |
| **Implementaciones intercambiables** | `@effect/sql-pg` vs `@effect/sql-mysql`           | ❌ No actualmente           |
| **Tamaño del bundle**                | `@angular/animations`                             | ⚠️ Parcialmente (ai-agents) |
| **Contratos para clientes**          | `MediatR.Contracts`                               | ❌ No hay caso de uso       |
| **Plataformas diferentes**           | `@effect/platform-node` vs `@effect/platform-bun` | ❌ No actualmente           |

### 2.2 Razones NO Válidas para Separar

| Anti-patrón                                   | Problema                                   | Stratix actual    |
| --------------------------------------------- | ------------------------------------------ | ----------------- |
| Separar "abstracciones" de "implementaciones" | Fragmenta la experiencia del desarrollador | ⚠️ **Sí lo hace** |
| Separar por "pureza arquitectónica"           | No aporta valor al usuario                 | ⚠️ **Sí lo hace** |
| Paquetes demasiado granulares                 | Complejidad en dependencias                | ❌ No             |

---

## 3. Análisis de Stratix Actual

### 3.1 ¿Qué Hay en Cada Paquete?

**@stratix/core:**

- Primitivas DDD (Entity, ValueObject, AggregateRoot)
- Interfaces CQRS (Command, Query, Event, buses)
- Value Objects (Email, Money, UUID, etc.)
- Patrón Result
- Sistema de plugins y contextos (interfaces)
- **AI Agents completo** (15+ subcarpetas)

**@stratix/framework:**

- Decoradores (`@StratixApp`, `@Context`, `@CommandHandler`)
- Sistema de metadatos
- Implementación DI (Awilix adapter)
- Implementaciones CQRS (InMemoryCommandBus)
- Logging y configuración
- Bootstrap/runtime

### 3.2 Problemas de la Separación Actual

#### Problema 1: Separación Artificial

```
Usuario quiere usar CQRS:
- Import Command, CommandHandler, CommandBus → @stratix/core
- Import @CommandHandler decorator → @stratix/framework
- Import InMemoryCommandBus → @stratix/framework
```

**Consecuencia:** El usuario debe instalar **ambos paquetes** para cualquier funcionalidad útil.

#### Problema 2: Criterio de Separación Inconsistente

- `BaseCommandHandler` (clase abstracta con lógica) → está en `core`
- `InMemoryCommandBus` (implementación) → está en `framework`
- ¿Por qué uno sí y otro no?

#### Problema 3: AI-Agents en el Lugar Equivocado

- Es un **módulo completo y opcional** (15+ subcarpetas)
- Está en `core` pero debería ser su propio paquete `@stratix/ai-agents`
- O estar en `framework` si se considera parte integral

---

## 4. Propuestas de Reestructuración

### Opción A: Unificación (Recomendada)

**Un solo paquete principal:**

```
@stratix/stratix (o simplemente "stratix")
├── domain/           → Entity, ValueObject, AggregateRoot
├── cqrs/             → Commands, Queries, Events + implementaciones
├── result/           → Patrón Result
├── value-objects/    → Email, Money, UUID, etc.
├── decorators/       → @StratixApp, @Context, @CommandHandler
├── di/               → Container + Awilix adapter
├── config/           → ConfigurationManager + sources
├── logging/          → Logger + transportes
├── runtime/          → Bootstrap, StratixApplication
└── index.ts          → Exportaciones públicas
```

**Paquetes adicionales opcionales:**

```
@stratix/ai-agents    → Sistema completo de agentes IA
@stratix/testing      → Utilidades de testing (futuro)
```

**Ventajas:**

- ✅ Una sola dependencia para el usuario típico
- ✅ DX (Developer Experience) simplificada
- ✅ Similar a TypeORM, Effect principal
- ✅ AI-agents separado correctamente (es opcional)

**Desventajas:**

- ❌ Bundle más grande (mitigable con tree-shaking)

---

### Opción B: Separación Funcional (Estilo Angular/NestJS)

```
@stratix/core         → Runtime, DI, bootstrap, ciclo de vida
@stratix/common       → Decoradores, interfaces, utilidades comunes
@stratix/cqrs         → Sistema CQRS completo
@stratix/ddd          → Primitivas DDD (Entity, ValueObject, etc.)
@stratix/ai-agents    → Sistema de agentes IA
```

**Ventajas:**

- ✅ Funcionalidades claramente separadas
- ✅ Usuarios pueden elegir qué instalar
- ✅ Familiar para usuarios de Angular/NestJS

**Desventajas:**

- ❌ Más paquetes que mantener
- ❌ Complejidad en versionado
- ❌ Para un framework DDD, todo es "core" (no hay partes opcionales claras)

---

### Opción C: Mantener Dos Paquetes (Mejorada)

```
@stratix/core         → Primitivas DDD + interfaces CQRS + Result + Value Objects
@stratix/framework    → Todo lo demás (decoradores, DI, implementaciones, runtime)
@stratix/ai-agents    → Sistema de agentes IA (extraído)
```

**Cambios necesarios:**

1. Mover `BaseHandlers` de core a framework
2. Extraer ai-agents a su propio paquete
3. Hacer que `framework` reexporte todo de `core`

**Ventajas:**

- ✅ Cambio mínimo
- ✅ core queda como librería de tipos puros (útil si alguien solo quiere los tipos)

**Desventajas:**

- ❌ Sigue requiriendo dos instalaciones
- ❌ El caso de uso de "solo core" es muy raro

---

## 5. Recomendación Final

### Para Stratix: **Opción A - Unificación**

**Razones:**

1. **El caso de uso de "solo abstracciones" no existe realmente:**
   - MediatR tiene `Contracts` porque Blazor/APIs solo necesitan los tipos
   - En Stratix, ¿quién usaría `@stratix/core` sin `@stratix/framework`?

2. **La separación actual genera fricción:**
   - Todo ejemplo requiere: `pnpm add @stratix/core @stratix/framework`
   - Imports divididos sin razón clara

3. **Los frameworks exitosos tienden a unificar:**
   - TypeORM: un paquete
   - Effect: un paquete core grande
   - Prisma: un paquete

4. **AI-agents SÍ debe separarse:**
   - Es opcional
   - Es masivo
   - Tiene arquitectura propia

### Estructura Propuesta Final

```
stratix/                          # Paquete principal
├── src/
│   ├── domain/                   # Primitivas DDD
│   │   ├── Entity.ts
│   │   ├── ValueObject.ts
│   │   ├── AggregateRoot.ts
│   │   └── DomainEvent.ts
│   ├── cqrs/                     # CQRS completo
│   │   ├── Command.ts
│   │   ├── CommandBus.ts
│   │   ├── CommandHandler.ts
│   │   ├── InMemoryCommandBus.ts
│   │   └── decorators/
│   │       └── CommandHandler.ts
│   ├── result/                   # Patrón Result
│   ├── value-objects/            # Value Objects
│   ├── di/                       # DI completo
│   ├── config/                   # Configuración
│   ├── logging/                  # Logging
│   ├── runtime/                  # Bootstrap
│   │   ├── StratixApplication.ts
│   │   ├── bootstrap.ts
│   │   └── decorators/
│   │       ├── StratixApp.ts
│   │       └── Context.ts
│   ├── errors/                   # Todos los errores
│   └── index.ts                  # Exportaciones
└── package.json

@stratix/ai-agents/               # Paquete separado
├── src/
│   ├── domain/
│   ├── application/
│   ├── llm/
│   ├── tools/
│   ├── memory/
│   ├── guardrails/
│   ├── prompts/
│   ├── rag/
│   ├── observability/
│   ├── workflows/
│   └── index.ts
└── package.json
```

---

## 6. Plan de Migración Sugerido

### Fase 1: Preparación (sin breaking changes)

1. Hacer que `@stratix/framework` reexporte todo de `@stratix/core`
2. Documentar que la instalación recomendada es solo `@stratix/framework`
3. Extraer ai-agents a `@stratix/ai-agents`

### Fase 2: Unificación (v1.0.0)

1. Fusionar los paquetes en uno solo (`stratix` o `@stratix/stratix`)
2. Deprecar los paquetes antiguos
3. Proveer guía de migración

### Fase 3: Expansión (post-v1.0.0)

1. Agregar `@stratix/testing`
2. Considerar `@stratix/graphql`, `@stratix/rest` si surge la necesidad

---

## 7. Conclusión

La separación actual de Stratix en `core` y `framework` **no sigue los patrones de la industria** y **no aporta valor real al usuario**. Los frameworks exitosos:

1. **Unifican** cuando todo es esencial (TypeORM, Effect, Prisma)
2. **Separan** solo para funcionalidades genuinamente opcionales (Angular forms, NestJS websockets)
3. **Separan contratos** solo cuando hay clientes que solo necesitan tipos (MediatR.Contracts)

**La recomendación es unificar** `core` y `framework` en un solo paquete, extrayendo `ai-agents` como paquete opcional separado.

---

_Análisis realizado: Enero 2026_
_Frameworks analizados: NestJS, Effect-TS, MediatR, TypeORM, Angular_
