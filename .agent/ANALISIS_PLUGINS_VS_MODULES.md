# Análisis Comparativo: Plugins vs Bounded Contexts (Modules)

**Fecha:** 2025-11-19  
**Pregunta:** ¿Los módulos o bounded contexts y plugins se cargan con la misma interfaz?

---

## Respuesta Ejecutiva

**NO, pero tienen similitudes significativas**. Aunque ambos comparten un patrón de lifecycle similar (`initialize` → `start` → `stop`), tienen diferencias importantes en:
- **Propósito y responsabilidades**
- **Contextos de inicialización**
- **Orden de carga**
- **Capacidades específicas**

---

## 1. Comparación de Interfaces

### 1.1 Plugin Interface

```typescript
export interface Plugin {
  readonly metadata: PluginMetadata;
  
  initialize?(context: PluginContext): Promise<void>;
  start?(): Promise<void>;
  stop?(): Promise<void>;
  healthCheck?(): Promise<HealthCheckResult>;
}
```

**Características:**
- ✅ Todos los métodos del lifecycle son **opcionales**
- ✅ `initialize` recibe `PluginContext`
- ✅ `start` y `stop` **NO** reciben parámetros
- ✅ Incluye `healthCheck` para monitoreo

### 1.2 ContextModule Interface

```typescript
export interface ContextModule {
  readonly metadata: ModuleMetadata;
  readonly contextName: string;
  
  getCommands?(): CommandDefinition[];
  getQueries?(): QueryDefinition[];
  getEventHandlers?(): EventHandlerDefinition[];
  getRepositories?(): RepositoryDefinition[];
  
  initialize?(context: ModuleContext): Promise<void>;
  start?(): Promise<void>;
  stop?(): Promise<void>;
  healthCheck?(): Promise<HealthCheckResult>;
}
```

**Características:**
- ✅ Todos los métodos del lifecycle son **opcionales**
- ✅ `initialize` recibe `ModuleContext`
- ✅ `start` y `stop` **NO** reciben parámetros
- ✅ Incluye `healthCheck` para monitoreo
- ⭐ **EXTRA:** Métodos para definir CQRS (commands, queries, events)
- ⭐ **EXTRA:** Propiedad `contextName` obligatoria

---

## 2. Similitudes

### 2.1 Lifecycle Pattern Idéntico

Ambos siguen el mismo patrón de ciclo de vida:

```
UNINITIALIZED → INITIALIZING → INITIALIZED → STARTING → STARTED → STOPPING → STOPPED
```

### 2.2 Métodos Opcionales

Todos los métodos del lifecycle son opcionales en ambas interfaces:
- `initialize?()` - Configuración inicial
- `start?()` - Arranque de recursos
- `stop?()` - Limpieza y cierre
- `healthCheck?()` - Verificación de salud

### 2.3 Metadata

Ambos requieren metadata con información similar:

```typescript
// PluginMetadata
{
  name: string;
  version: string;
  description?: string;
  dependencies?: string[];  // Otros plugins
}

// ModuleMetadata
{
  name: string;
  version: string;
  description?: string;
  requiredPlugins?: string[];   // Plugins necesarios
  requiredModules?: string[];   // Otros módulos necesarios
}
```

### 2.4 Health Checks

Ambos pueden implementar health checks con la misma interfaz:

```typescript
async healthCheck(): Promise<HealthCheckResult>
```

---

## 3. Diferencias Clave

### 3.1 Contextos de Inicialización

#### PluginContext
```typescript
interface PluginContext {
  container: Container;
  logger: Logger;
  getConfig<T>(): T;
  getService<T>(name: string): T | undefined;
}
```

**Capacidades:**
- Acceso completo al container
- Logger
- Configuración específica del plugin
- Resolver servicios opcionales

#### ModuleContext
```typescript
interface ModuleContext {
  readonly container: Container;
  readonly logger: Logger;
  getConfig<T>(): T | undefined;
}
```

**Capacidades:**
- Acceso de solo lectura al container
- Logger
- Configuración específica del módulo (puede ser undefined)
- **NO** tiene `getService()` helper

**Diferencia:** `PluginContext` tiene más capacidades (`getService` helper).

### 3.2 Propósito y Responsabilidades

| Aspecto | Plugin | ContextModule |
|---------|--------|---------------|
| **Propósito** | Extensiones de infraestructura | Lógica de dominio/negocio |
| **Ejemplos** | PostgreSQL, Redis, RabbitMQ, HTTP | Orders, Products, Inventory |
| **Registra** | Servicios de infraestructura | Commands, Queries, Events, Repositories |
| **Capa** | Infrastructure Layer | Domain + Application Layer |
| **Dependencias** | Otros plugins | Plugins + otros módulos |

### 3.3 Capacidades Específicas de ContextModule

Los módulos tienen métodos adicionales para CQRS:

```typescript
getCommands?(): CommandDefinition[]
getQueries?(): QueryDefinition[]
getEventHandlers?(): EventHandlerDefinition[]
getRepositories?(): RepositoryDefinition[]
```

**Estos métodos NO existen en Plugin.**

### 3.4 Orden de Carga

El `LifecycleManager` carga en este orden:

```
1. Plugins (initialize)
2. Modules (initialize)  ← Dependen de plugins
3. Plugins (start)
4. Modules (start)

// Shutdown en orden inverso:
5. Modules (stop)
6. Plugins (stop)
```

**Código del LifecycleManager:**

```typescript
async initializePlugins(context: PluginContext): Promise<void> {
  // Paso 1: Inicializar plugins
}

async initializeModules(
  container: Container,
  logger: Logger,
  configs: Map<string, unknown>
): Promise<void> {
  // Paso 2: Inicializar módulos (requiere plugins inicializados)
  if (this.phase !== LifecyclePhase.INITIALIZED) {
    throw new Error('Plugins must be initialized before modules');
  }
}

async startAll(): Promise<void> {
  // Paso 3: Start plugins
  const plugins = this.pluginRegistry.getPluginsInOrder();
  for (const plugin of plugins) {
    await this.startPlugin(plugin);
  }
  
  // Paso 4: Start modules
  const modules = this.moduleRegistry.getModulesInOrder();
  for (const module of modules) {
    await this.startModule(module);
  }
}
```

---

## 4. Proceso de Inicialización Detallado

### 4.1 Plugin Initialization

```typescript
private async initializePlugin(plugin: Plugin, context: PluginContext): Promise<void> {
  const name = plugin.metadata.name;
  
  this.pluginPhases.set(name, LifecyclePhase.INITIALIZING);
  
  if (plugin.initialize) {
    // Set current plugin name for config access
    await plugin.initialize(context);
  }
  
  this.pluginPhases.set(name, LifecyclePhase.INITIALIZED);
}
```

**Responsabilidades:**
- Llamar `plugin.initialize(context)` si existe
- Tracking de fase del lifecycle

### 4.2 Module Initialization

```typescript
private async initializeModule(
  module: ContextModule,
  container: Container,
  logger: Logger,
  configs: Map<string, unknown>
): Promise<void> {
  const name = module.metadata.name;
  
  this.modulePhases.set(name, LifecyclePhase.INITIALIZING);
  
  // 1. Register repositories first
  const repositories = module.getRepositories?.() || [];
  for (const repo of repositories) {
    container.register(repo.token, () => repo.instance, {
      lifetime: repo.singleton !== false 
        ? ServiceLifetime.SINGLETON 
        : ServiceLifetime.TRANSIENT,
    });
  }
  
  // 2. Get CQRS buses from container
  const commandBus = container.resolve('commandBus');
  const queryBus = container.resolve('queryBus');
  const eventBus = container.resolve('eventBus');
  
  // 3. Register commands
  const commands = module.getCommands?.() || [];
  for (const cmd of commands) {
    commandBus.register(cmd.commandType, cmd.handler);
  }
  
  // 4. Register queries
  const queries = module.getQueries?.() || [];
  for (const query of queries) {
    queryBus.register(query.queryType, query.handler);
  }
  
  // 5. Subscribe event handlers
  const eventHandlers = module.getEventHandlers?.() || [];
  for (const handler of eventHandlers) {
    eventBus.subscribe(handler.eventType, handler.handler);
  }
  
  // 6. Call module initialize if present
  if (module.initialize) {
    const moduleContext = new DefaultModuleContext(container, logger, configs, name);
    await module.initialize(moduleContext);
  }
  
  this.modulePhases.set(name, LifecyclePhase.INITIALIZED);
}
```

**Responsabilidades EXTRA:**
- ✅ Registrar repositorios en el container
- ✅ Registrar commands en el CommandBus
- ✅ Registrar queries en el QueryBus
- ✅ Suscribir event handlers al EventBus
- ✅ Llamar `module.initialize(context)` si existe
- ✅ Tracking de fase del lifecycle

**Diferencia:** El módulo tiene mucha más lógica de registro automático.

---

## 5. BaseContextModule: Implementación Base

Stratix proporciona `BaseContextModule` que implementa la lógica común:

```typescript
export abstract class BaseContextModule implements ContextModule {
  abstract readonly metadata: ModuleMetadata;
  abstract readonly contextName: string;
  
  protected context?: ModuleContext;
  
  // Métodos con implementación por defecto (retornan arrays vacíos)
  getCommands(): CommandDefinition[] { return []; }
  getQueries(): QueryDefinition[] { return []; }
  getEventHandlers(): EventHandlerDefinition[] { return []; }
  getRepositories(): RepositoryDefinition[] { return []; }
  
  // Initialize con lógica de auto-registro
  async initialize(context: ModuleContext): Promise<void> {
    this.context = context;
    
    // Auto-registra repositories, commands, queries, events
    // (código similar al LifecycleManager)
  }
  
  async start(): Promise<void> { }
  async stop(): Promise<void> { }
  
  async healthCheck(): Promise<HealthCheckResult> {
    return {
      status: HealthStatus.UP,
      message: `${this.contextName} module is healthy`,
    };
  }
}
```

**Ventaja:** Los módulos pueden extender `BaseContextModule` y solo implementar los métodos `get*()` necesarios.

**NO existe equivalente para Plugins** - cada plugin debe implementar toda la lógica.

---

## 6. Uso en ApplicationBuilder

### 6.1 Registro de Plugins

```typescript
const app = await ApplicationBuilder.create()
  .usePlugin(new PostgresPlugin(), { host: 'localhost', port: 5432 })
  .usePlugin(new RedisPlugin())
  .build();
```

### 6.2 Registro de Modules

```typescript
const app = await ApplicationBuilder.create()
  .useContext(new OrdersContextModule())
  .useContext(new ProductsContextModule(), { enableCache: true })
  .build();
```

**Similitud:** Ambos usan el mismo patrón de builder con configuración opcional.

---

## 7. Tabla Comparativa Completa

| Característica | Plugin | ContextModule |
|----------------|--------|---------------|
| **Metadata** | ✅ PluginMetadata | ✅ ModuleMetadata |
| **ContextName** | ❌ | ✅ Obligatorio |
| **initialize()** | ✅ Opcional | ✅ Opcional |
| **start()** | ✅ Opcional | ✅ Opcional |
| **stop()** | ✅ Opcional | ✅ Opcional |
| **healthCheck()** | ✅ Opcional | ✅ Opcional |
| **Context Type** | PluginContext | ModuleContext |
| **getCommands()** | ❌ | ✅ Opcional |
| **getQueries()** | ❌ | ✅ Opcional |
| **getEventHandlers()** | ❌ | ✅ Opcional |
| **getRepositories()** | ❌ | ✅ Opcional |
| **Base Class** | ❌ No existe | ✅ BaseContextModule |
| **Auto-registration** | ❌ Manual | ✅ Automático (CQRS) |
| **Propósito** | Infraestructura | Dominio/Negocio |
| **Orden de carga** | 1º (initialize, start) | 2º (initialize, start) |
| **Orden de shutdown** | 2º (stop) | 1º (stop) |
| **Dependencias** | Otros plugins | Plugins + Módulos |

---

## 8. Ejemplos Prácticos

### 8.1 Plugin Completo

```typescript
export class PostgresPlugin implements Plugin {
  readonly metadata: PluginMetadata = {
    name: 'postgres',
    version: '1.0.0',
    description: 'PostgreSQL database plugin',
    dependencies: ['logger']
  };

  private database?: Database;

  async initialize(context: PluginContext): Promise<void> {
    const config = context.getConfig<DatabaseConfig>();
    this.database = new Database(config);

    // Registrar en el container
    context.container.register('database', () => this.database, {
      lifetime: ServiceLifetime.SINGLETON
    });
  }

  async start(): Promise<void> {
    await this.database?.connect();
  }

  async stop(): Promise<void> {
    await this.database?.disconnect();
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      await this.database?.ping();
      return { status: HealthStatus.UP };
    } catch (error) {
      return { status: HealthStatus.DOWN, message: error.message };
    }
  }
}
```

### 8.2 ContextModule Completo

```typescript
export class ProductsContextModule extends BaseContextModule {
  readonly metadata: ModuleMetadata = {
    name: 'products-context',
    version: '1.0.0',
    description: 'Products Domain Module',
    requiredPlugins: ['postgres'],
    requiredModules: []
  };

  readonly contextName = 'Products';

  private productRepository!: ProductRepository;

  getCommands(): CommandDefinition[] {
    return [
      {
        name: 'CreateProduct',
        commandType: CreateProductCommand,
        handler: new CreateProductHandler(this.productRepository)
      }
    ];
  }

  getQueries(): QueryDefinition[] {
    return [
      {
        name: 'GetProductById',
        queryType: GetProductByIdQuery,
        handler: new GetProductByIdHandler(this.productRepository)
      }
    ];
  }

  getEventHandlers(): EventHandlerDefinition[] {
    return [
      {
        eventName: 'ProductCreated',
        eventType: ProductCreatedEvent,
        handler: new ProductCreatedHandler()
      }
    ];
  }

  getRepositories(): RepositoryDefinition[] {
    return [
      {
        token: 'productRepository',
        instance: new InMemoryProductRepository(),
        singleton: true
      }
    ];
  }

  async initialize(context: ModuleContext): Promise<void> {
    // Repositories ya están registrados, podemos resolverlos
    this.productRepository = context.container.resolve<ProductRepository>('productRepository');

    // Llamar super para auto-registro de CQRS
    await super.initialize(context);
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      await this.productRepository.findAll();
      return { status: HealthStatus.UP };
    } catch (error) {
      return {
        status: HealthStatus.DOWN,
        message: `Repository error: ${error.message}`
      };
    }
  }
}
```

---

## 9. Diferencias Filosóficas

### 9.1 Plugin: Infraestructura

- **Responsabilidad:** Proveer servicios técnicos
- **Ejemplos:** Base de datos, cache, message broker, HTTP server
- **Registro:** Manual en el container
- **Independiente del dominio:** No conoce la lógica de negocio

### 9.2 ContextModule: Dominio

- **Responsabilidad:** Encapsular lógica de negocio
- **Ejemplos:** Orders, Products, Users, Payments
- **Registro:** Automático de CQRS
- **Depende de infraestructura:** Usa servicios de plugins

---

## 10. Conclusiones

### ✅ Similitudes

1. **Lifecycle pattern idéntico:** `initialize` → `start` → `stop`
2. **Todos los métodos son opcionales**
3. **Ambos tienen metadata**
4. **Ambos soportan health checks**
5. **Ambos reciben contexto en initialize**
6. **Ambos se registran en el ApplicationBuilder**

### ❌ Diferencias

1. **Contextos diferentes:** `PluginContext` vs `ModuleContext`
2. **Propósito diferente:** Infraestructura vs Dominio
3. **Capacidades CQRS:** Solo en ContextModule
4. **Auto-registro:** Solo en ContextModule
5. **Base class:** Solo ContextModule tiene `BaseContextModule`
6. **Orden de carga:** Plugins primero, Modules después
7. **ContextName:** Solo obligatorio en ContextModule

### 🎯 Respuesta Final

**NO, no se cargan con la misma interfaz**, aunque comparten un patrón de lifecycle similar. Las diferencias son intencionales y reflejan sus diferentes responsabilidades:

- **Plugins** = Extensiones de infraestructura (bajo nivel)
- **ContextModules** = Bounded contexts de dominio (alto nivel)

Esta separación permite:
- ✅ Plugins reutilizables entre proyectos
- ✅ Módulos portables entre arquitecturas (monolito ↔ microservicios)
- ✅ Separación clara de responsabilidades (DDD)
- ✅ Testing más fácil (mock de plugins)

---

**Última actualización:** 2025-11-19
