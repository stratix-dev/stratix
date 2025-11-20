# Contexto General del Proyecto Stratix

**Fecha de Análisis:** 2025-11-19  
**Versión Actual:** 0.2.0 (pre-release)  
**Autor:** P. Andrés Carvajal <causticrez@gmail.com>

---

## 1. Descripción General

**Stratix** es un framework moderno de TypeScript diseñado para construir aplicaciones escalables y mantenibles utilizando:
- **Domain-Driven Design (DDD)**
- **Arquitectura Hexagonal (Ports & Adapters)**
- **CQRS (Command Query Responsibility Segregation)**
- **Soporte nativo para AI Agents como ciudadanos de primera clase**

El framework está diseñado para ser **production-ready desde el día uno**, con seguridad de tipos, inyección de dependencias, y patrones empresariales incorporados.

---

## 2. Arquitectura del Proyecto

### 2.1 Estructura de Monorepo

El proyecto utiliza **pnpm workspaces** para gestionar múltiples paquetes:

```
stratix/
├── packages/           # Paquetes del framework
├── docs/              # Documentación (Docusaurus)
├── examples/          # Aplicaciones de ejemplo
└── scripts/           # Scripts de utilidad
```

### 2.2 Categorías de Paquetes

Los paquetes se organizan en 5 categorías principales:

#### **A. Core (Núcleo)**
1. **`@stratix/primitives`** - Bloques de construcción fundamentales
   - Entity, AggregateRoot, ValueObject
   - Result Pattern (Success/Failure)
   - DomainEvent, DomainService
   - 11 Value Objects integrados (Money, Email, UUID, PhoneNumber, etc.)
   - Specification Pattern
   - AI Agent base classes

2. **`@stratix/abstractions`** - Interfaces y tipos core
   - Container (DI)
   - Messaging (Command, Query, Event, Buses)
   - Infrastructure (Logger, Repository, UnitOfWork, HealthCheck)
   - Plugin & Module system
   - AI Agent abstractions

3. **`@stratix/runtime`** - Sistema de plugins y ciclo de vida
   - ApplicationBuilder (API fluida)
   - PluginRegistry, ModuleRegistry
   - LifecycleManager
   - DependencyGraph
   - Errores de runtime

#### **B. Implementaciones (impl-*)**
Implementaciones concretas de abstracciones core:

1. **`@stratix/impl-di-awilix`** - Contenedor DI usando Awilix
2. **`@stratix/impl-cqrs-inmemory`** - Buses CQRS en memoria
3. **`@stratix/impl-logger-console`** - Logger de consola
4. **`@stratix/impl-ai-agents`** - Implementación de AI Agents

#### **C. Extensiones (ext-*)**
Plugins para funcionalidades específicas:

**Bases de Datos:**
- `@stratix/ext-postgres` - PostgreSQL + TypeORM
- `@stratix/ext-mongodb` - MongoDB
- `@stratix/ext-redis` - Redis

**HTTP & APIs:**
- `@stratix/ext-http-fastify` - Servidor HTTP con Fastify

**Messaging:**
- `@stratix/ext-rabbitmq` - RabbitMQ

**AI Agents:**
- `@stratix/ext-ai-agents-openai` - Integración OpenAI
- `@stratix/ext-ai-agents-anthropic` - Integración Anthropic

**Utilidades:**
- `@stratix/ext-auth` - Autenticación
- `@stratix/ext-validation-zod` - Validación con Zod
- `@stratix/ext-errors` - Manejo de errores
- `@stratix/ext-mappers` - Mapeo de datos
- `@stratix/ext-migrations` - Migraciones de BD
- `@stratix/ext-secrets` - Gestión de secretos
- `@stratix/ext-opentelemetry` - Observabilidad

#### **D. Herramientas**
1. **`@stratix/cli`** - Herramienta CLI completa
   - Generadores de código (8 tipos)
   - Scaffolding de proyectos
   - Gestión de extensiones
   
2. **`@stratix/testing`** - Utilidades de testing

---

## 3. Conceptos Clave de DDD

### 3.1 Primitivas del Dominio

#### **Entity**
```typescript
abstract class Entity<T extends string> {
  protected constructor(
    private readonly _id: EntityId<T>,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  )
  
  get id(): EntityId<T>
  get createdAt(): Date
  get updatedAt(): Date
  protected touch(): void
  equals(other: Entity<T>): boolean
}
```

#### **AggregateRoot**
```typescript
abstract class AggregateRoot<T extends string> extends Entity<T> {
  private _domainEvents: DomainEvent[] = []
  
  protected record(event: DomainEvent): void
  pullDomainEvents(): DomainEvent[]
  hasDomainEvents(): boolean
}
```

#### **ValueObject**
Objetos inmutables comparados por valor, no por identidad.

### 3.2 Result Pattern

Manejo explícito de errores sin excepciones:

```typescript
type Result<T, E = Error> = Success<T> | Failure<E>

// Uso
const result = await userRepository.findById(userId);
if (result.isSuccess) {
  const user = result.value;
} else {
  const error = result.error;
}
```

### 3.3 CQRS

Separación de responsabilidades entre comandos (escritura) y queries (lectura):

- **Command**: Intención de cambiar estado
- **CommandHandler**: Ejecuta el comando
- **Query**: Solicitud de datos
- **QueryHandler**: Ejecuta la query
- **Event**: Algo que ocurrió en el dominio
- **EventHandler**: Reacciona a eventos

---

## 4. Sistema de Plugins

### 4.1 Plugin Lifecycle

```typescript
interface Plugin {
  metadata: PluginMetadata
  
  register?(context: PluginContext): Promise<void>
  initialize?(context: PluginContext): Promise<void>
  start?(context: PluginContext): Promise<void>
  stop?(context: PluginContext): Promise<void>
  healthCheck?(): Promise<HealthCheckResult>
}
```

### 4.2 Bounded Contexts (Módulos)

Los **ContextModule** encapsulan dominios completos:

```typescript
interface ContextModule {
  metadata: ModuleMetadata
  
  register(context: ModuleContext): Promise<void>
  initialize?(context: ModuleContext): Promise<void>
}
```

---

## 5. Application Builder

API fluida para construir aplicaciones:

```typescript
const app = await ApplicationBuilder.create()
  .useContainer(container)
  .useLogger(logger)
  .usePlugin(new PostgresPlugin())
  .usePlugin(new RabbitMQPlugin())
  .useContext(new OrdersContextModule())
  .useContext(new ProductsContextModule())
  .build();

await app.start();
```

**Flujo de inicialización:**
1. Registro de plugins
2. Registro de módulos
3. Build → Inicializa plugins en orden de dependencias
4. Inicializa módulos
5. Start → Arranca la aplicación

---

## 6. CLI (@stratix/cli)

### 6.1 Comandos Principales

```bash
# Crear nuevo proyecto
stratix new my-app

# Generar bounded context completo (16 archivos)
stratix generate context Products --props "name:string,price:number"

# Generadores individuales
stratix g entity User --props "email:string,name:string"
stratix g value-object Email
stratix g command CreateUser
stratix g query GetUserById
stratix g repository User
stratix g event-handler UserCreated
stratix g plugin CustomPlugin

# Gestión de extensiones
stratix add postgres
stratix add redis
stratix add list

# Información del proyecto
stratix info
```

### 6.2 Estructura Generada

El CLI genera proyectos con:
- TypeScript en modo estricto
- ESLint y Prettier configurados
- Capas: Domain, Application, Infrastructure
- CQRS con handlers
- Repository pattern
- Type-safe entity IDs
- Result pattern

---

## 7. Configuración TypeScript

### 7.1 tsconfig.base.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

### 7.2 Características TypeScript

- **Strict mode** habilitado
- **Phantom types** para type-safety
- **ES Modules** (NodeNext)
- **Declaration maps** para debugging

---

## 8. Testing

### 8.1 Framework de Testing

- **Vitest** como test runner
- Coverage con `@vitest/coverage-v8`
- Utilidades de testing en `@stratix/testing`

### 8.2 Comandos

```bash
pnpm test              # Ejecutar todos los tests
pnpm test:watch        # Modo watch
pnpm build             # Build todos los paquetes
pnpm typecheck         # Verificar tipos
pnpm lint              # Linting
pnpm format            # Formateo con Prettier
```

---

## 9. Value Objects Integrados

Stratix incluye 11 Value Objects listos para usar:

1. **Money** - Valores monetarios con Currency
2. **Email** - Direcciones de email validadas
3. **UUID** - Identificadores únicos
4. **URL** - URLs validadas
5. **PhoneNumber** - Números telefónicos con código de país
6. **Currency** - Códigos de moneda ISO 4217
7. **CountryCallingCode** - Códigos telefónicos de países
8. **CountryRegistry** - Información de países
9. **DateRange** - Rangos de fechas
10. **Percentage** - Porcentajes (0-100)
11. **Address** - Direcciones postales

---

## 10. AI Agents como First-Class Citizens

### 10.1 Concepto

Los AI Agents son tratados como entidades del dominio con:
- Ciclo de vida gestionado
- Integración con DI container
- Soporte para múltiples providers (OpenAI, Anthropic)
- Patrones de producción

### 10.2 Paquetes Relacionados

- `@stratix/primitives` - Base classes para agents
- `@stratix/impl-ai-agents` - Implementación core
- `@stratix/ext-ai-agents-openai` - Provider OpenAI
- `@stratix/ext-ai-agents-anthropic` - Provider Anthropic

---

## 11. Patrones de Arquitectura

### 11.1 Hexagonal Architecture

```
┌─────────────────────────────────────────┐
│         Application Layer               │
│  (Commands, Queries, Handlers)          │
├─────────────────────────────────────────┤
│         Domain Layer                    │
│  (Entities, Value Objects, Services)    │
├─────────────────────────────────────────┤
│         Infrastructure Layer            │
│  (Repositories, External Services)      │
└─────────────────────────────────────────┘
```

### 11.2 Dependency Injection

- Basado en **Awilix**
- Scopes: Singleton, Scoped, Transient
- Auto-wiring de dependencias
- Type-safe tokens

### 11.3 Repository Pattern

```typescript
interface Repository<T extends AggregateRoot<any>> {
  save(aggregate: T): Promise<Result<void>>
  findById(id: EntityId<any>): Promise<Result<T | null>>
  delete(id: EntityId<any>): Promise<Result<void>>
}
```

---

## 12. Versionamiento

### 12.1 Estado Actual

- **Versión:** 0.2.0 (pre-release)
- **Política:** Semantic Versioning
- **Estabilidad:** API puede cambiar hasta v1.0.0
- **Recomendación:** Para early adopters y testing

### 12.2 Historial de Versiones

- **0.1.3** (2025-01-18): CLI completo con 8 generadores
- **0.1.2** (2025-01-15): Documentación de versionamiento
- **0.1.1** (2025-01-11): Fixes de documentación
- **0.1.0** (2025-01-11): Release público inicial

---

## 13. Gestión de Paquetes

### 13.1 Package Manager

- **pnpm** v9.15.0 (requerido)
- Workspaces para monorepo
- Hoisting optimizado

### 13.2 Scripts Principales

```json
{
  "build": "pnpm -r --filter '!website' --sort --workspace-concurrency=1 build",
  "build:fast": "pnpm -r --filter '!website' --sort build",
  "test": "pnpm -r test",
  "typecheck": "pnpm -r --filter '!website' typecheck",
  "lint": "pnpm -r lint",
  "format": "prettier --write \"packages/**/src/**/*.ts\"",
  "clean": "pnpm -r clean && rm -rf node_modules"
}
```

---

## 14. Documentación

### 14.1 Sitio Web

- **Framework:** Docusaurus
- **Ubicación:** `docs/website/`
- **URL:** https://pcarvajal.github.io/stratix/

### 14.2 Secciones

- Getting Started
- Core Concepts
- Architecture
- API Reference
- Examples
- Versioning Policy

---

## 15. Extensibilidad

### 15.1 Crear un Plugin

```typescript
export class MyPlugin implements Plugin {
  metadata: PluginMetadata = {
    name: 'my-plugin',
    version: '1.0.0',
    dependencies: ['logger']
  };

  async register(context: PluginContext): Promise<void> {
    // Registrar servicios en el container
  }

  async initialize(context: PluginContext): Promise<void> {
    // Inicializar recursos
  }

  async start(context: PluginContext): Promise<void> {
    // Arrancar servicios
  }

  async stop(context: PluginContext): Promise<void> {
    // Cleanup
  }

  async healthCheck(): Promise<HealthCheckResult> {
    return {
      status: HealthStatus.Healthy,
      message: 'OK'
    };
  }
}
```

### 15.2 Crear un Bounded Context

```typescript
export class OrdersContextModule implements ContextModule {
  metadata: ModuleMetadata = {
    name: 'orders',
    version: '1.0.0'
  };

  async register(context: ModuleContext): Promise<void> {
    // Registrar comandos, queries, handlers, repositorios
    context.registerCommand(CreateOrderCommand, CreateOrderHandler);
    context.registerQuery(GetOrderQuery, GetOrderHandler);
    context.registerRepository('OrderRepository', OrderRepositoryImpl);
  }
}
```

---

## 16. Mejores Prácticas

### 16.1 Organización del Código

1. **Separar por capas:** Domain, Application, Infrastructure
2. **Bounded Contexts:** Un módulo por dominio
3. **Result Pattern:** Evitar excepciones en lógica de negocio
4. **Value Objects:** Para conceptos del dominio
5. **Aggregate Roots:** Para consistencia transaccional

### 16.2 Testing

1. **Unit tests:** Para lógica de dominio
2. **Integration tests:** Para repositorios y servicios externos
3. **E2E tests:** Para flujos completos
4. **Mocks:** Usar `@stratix/testing` para mocks

### 16.3 Dependency Injection

1. **Interfaces:** Definir en `@stratix/abstractions`
2. **Implementaciones:** En paquetes `impl-*` o `ext-*`
3. **Tokens:** Type-safe con TypeScript
4. **Scopes:** Singleton para servicios, Scoped para requests

---

## 17. Roadmap y Desarrollo

### 17.1 Estado del Proyecto

- ✅ Core primitives y abstracciones
- ✅ Sistema de plugins
- ✅ CQRS implementation
- ✅ CLI con generadores
- ✅ Extensiones principales (DB, HTTP, Messaging)
- ✅ AI Agents support
- ⏳ Estabilización de API para v1.0.0
- ⏳ Más ejemplos y guías

### 17.2 Contribuciones

- **Licencia:** MIT
- **Repository:** https://github.com/pcarvajal/stratix
- **Issues:** https://github.com/pcarvajal/stratix/issues

---

## 18. Recursos Adicionales

### 18.1 Enlaces

- **Documentación:** https://pcarvajal.github.io/stratix/
- **GitHub:** https://github.com/pcarvajal/stratix
- **npm:** @stratix/* packages

### 18.2 Archivos Clave

- `README.md` - Introducción y quick start
- `CHANGELOG.md` - Historial de cambios
- `LICENSE` - Licencia MIT
- `tsconfig.base.json` - Configuración TypeScript base
- `pnpm-workspace.yaml` - Configuración de workspaces

---

## 19. Convenciones del Proyecto

### 19.1 Naming

- **Packages:** `@stratix/[category-]name`
- **Files:** PascalCase para clases, camelCase para utilidades
- **Types:** PascalCase
- **Interfaces:** Sin prefijo "I"

### 19.2 Estructura de Archivos

```
package/
├── src/
│   ├── __tests__/
│   ├── index.ts
│   └── [features]/
├── dist/           (generado)
├── package.json
├── tsconfig.json
└── README.md
```

### 19.3 Exports

- Usar named exports
- Re-exportar desde `index.ts`
- Incluir `.js` en imports (ES Modules)

---

## 20. Troubleshooting Común

### 20.1 Build Issues

```bash
# Limpiar y rebuildar
pnpm clean
pnpm install
pnpm build
```

### 20.2 Type Errors

- Verificar que todos los paquetes estén buildeados
- Ejecutar `pnpm typecheck` en el workspace root
- Verificar versiones de TypeScript

### 20.3 Test Failures

- Ejecutar tests individuales: `pnpm test --filter @stratix/primitives`
- Verificar mocks y fixtures
- Revisar logs de error detallados

---

## Conclusión

**Stratix** es un framework completo y bien estructurado para construir aplicaciones empresariales con TypeScript, DDD, y arquitectura hexagonal. Su sistema de plugins, soporte para AI Agents, y herramientas CLI lo hacen ideal para proyectos que requieren escalabilidad, mantenibilidad, y patrones de diseño robustos.

El proyecto está en fase de pre-release pero ya cuenta con todas las piezas fundamentales para desarrollo de aplicaciones de producción.

---

**Última actualización:** 2025-11-19  
**Mantenido por:** P. Andrés Carvajal
